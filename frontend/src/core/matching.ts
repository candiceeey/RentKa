import { GeoPoint, ItemDoc, Label, RequestDoc } from './types';

export const LABEL_CONFIDENCE_MIN = 0.7;
export const DEFAULT_RADIUS_KM = 10;
export const DEFAULT_MIN_SCORE = 0.4;
export const DEFAULT_LIMIT = 5;

// Match Score = Field*0.40 + Photo Labels*0.30 + Proximity*0.30
// Kept in one place so the weights can be tuned after user testing.
export const WEIGHTS = {
  full: { field: 0.4, labels: 0.3, proximity: 0.3 },
  // Either side has no usable photo labels: label weight is split (0.55 / 0.45)
  noLabels: { field: 0.55, labels: 0, proximity: 0.45 },
  // No location (permission denied): proximity weight is redistributed pro rata (0.4 / 0.3 => 0.571 / 0.429)
  noLocation: { field: 0.4 / 0.7, labels: 0.3 / 0.7, proximity: 0 },
  // Neither labels nor location: Field only
  fieldOnly: { field: 1, labels: 0, proximity: 0 },
};

/** Generic ML Kit labels that describe almost any photo. They never count as evidence. */
export const GENERIC_LABELS = new Set([
  'product', 'material', 'material property', 'room', 'font', 'plastic', 'metal', 'rectangle',
  'tool', 'gadget', 'technology', 'electronic device', 'machine', 'household', 'furniture',
  'composite material', 'automotive design',
]);

const norm = (s: string) => s.trim().toLowerCase();

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Labels at or above the confidence threshold, minus generic ones. */
export function confidentLabels(labels: Label[] = []): Set<string> {
  return new Set(
    labels
      .filter((l) => l.confidence >= LABEL_CONFIDENCE_MIN)
      .map((l) => norm(l.label))
      .filter((l) => !GENERIC_LABELS.has(l)),
  );
}

/**
 * 0.5 category + 0.3 subcategory + 0.2 characteristic coverage.
 * Coverage = share of the borrower's requested characteristics that the item has
 * (extra features on the item are not penalized). Uses the user-confirmed fields.
 */
export function fieldScore(req: RequestDoc, item: ItemDoc): number {
  const cat = norm(req.category) === norm(item.category) ? 1 : 0;
  const sub = norm(req.subcategory) === norm(item.subcategory) ? 1 : 0;
  const reqChars = new Set(req.characteristics.map(norm).filter(Boolean));
  let chars = 1; // borrower specified nothing: do not penalize
  if (reqChars.size > 0) {
    const itemChars = new Set(item.characteristics.map(norm));
    let hit = 0;
    reqChars.forEach((c) => {
      if (itemChars.has(c)) hit++;
    });
    chars = hit / reqChars.size;
  }
  return 0.5 * cat + 0.3 * sub + 0.2 * chars;
}

/** Share of the request's confident photo labels that also appear on the item's raw photo labels. */
export function labelScore(req: RequestDoc, item: ItemDoc): number {
  const r = confidentLabels(req.photoLabels);
  if (r.size === 0) return 0;
  const i = confidentLabels(item.photoLabels);
  let hit = 0;
  r.forEach((l) => {
    if (i.has(l)) hit++;
  });
  return hit / r.size;
}

export function proximityScore(distanceKm: number, radiusKm = DEFAULT_RADIUS_KM): number {
  return Math.max(0, 1 - distanceKm / radiusKm);
}

/** Labels are used only when BOTH the request and the item have usable photo labels. */
export function labelsUsable(req: RequestDoc, item: ItemDoc): boolean {
  return confidentLabels(req.photoLabels).size > 0 && confidentLabels(item.photoLabels).size > 0;
}

export interface MatchResult {
  itemId: string;
  score: number;
  distanceKm: number | null;
  usedLabels: boolean;
  usedProximity: boolean;
  trustScore: number;
  breakdown: { field: number; labels: number; proximity: number };
}

export function matchScore(req: RequestDoc, item: ItemDoc, radiusKm = DEFAULT_RADIUS_KM): MatchResult {
  const usedLabels = labelsUsable(req, item);
  const usedProximity = !!req.location;
  const w = usedLabels
    ? usedProximity ? WEIGHTS.full : WEIGHTS.noLocation
    : usedProximity ? WEIGHTS.noLabels : WEIGHTS.fieldOnly;
  const distanceKm = req.location ? haversineKm(req.location, item.location) : null;
  const field = fieldScore(req, item);
  const labels = usedLabels ? labelScore(req, item) : 0;
  const proximity = distanceKm === null ? 0 : proximityScore(distanceKm, radiusKm);
  const score = w.field * field + w.labels * labels + w.proximity * proximity;
  return {
    itemId: item.id,
    score: Math.round(score * 10000) / 10000,
    distanceKm: distanceKm === null ? null : Math.round(distanceKm * 100) / 100,
    usedLabels,
    usedProximity,
    trustScore: item.trustScore ?? 0,
    breakdown: { field, labels, proximity },
  };
}

export interface RankOptions {
  radiusKm?: number;
  minScore?: number;
  limit?: number;
}

/** Hard filters every candidate must pass before it is scored. */
export function passesHardFilters(req: RequestDoc, item: ItemDoc): boolean {
  return (
    item.status === 'available' &&
    item.ownerVerified &&
    item.ownerId !== req.requesterId &&
    item.dailyRate <= req.dailyBudget &&
    norm(item.category) === norm(req.category)
  );
}

/**
 * Hard filters, then score, then top N.
 * Order: score desc, trust score desc, distance asc.
 */
export function rankMatches(req: RequestDoc, items: ItemDoc[], opts: RankOptions = {}): MatchResult[] {
  const { radiusKm = DEFAULT_RADIUS_KM, minScore = DEFAULT_MIN_SCORE, limit = DEFAULT_LIMIT } = opts;
  return items
    .filter((it) => passesHardFilters(req, it))
    .map((it) => matchScore(req, it, radiusKm))
    .filter((m) => m.score >= minScore)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.trustScore - a.trustScore ||
        (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
    )
    .slice(0, limit);
}
