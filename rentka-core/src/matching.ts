import { GeoPoint, ItemDoc, Label, RequestDoc } from './types';

export const LABEL_CONFIDENCE_MIN = 0.7;
export const DEFAULT_RADIUS_KM = 10;

// Match Score = Field*0.40 + AI Labels*0.30 + Proximity*0.30
const W_FULL = { field: 0.4, labels: 0.3, proximity: 0.3 };
// No usable photo labels: label weight split between the other two (0.55 / 0.45)
const W_NO_LABELS = { field: 0.55, labels: 0, proximity: 0.45 };

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

export function confidentLabels(labels: Label[] = []): Set<string> {
  return new Set(
    labels.filter((l) => l.confidence >= LABEL_CONFIDENCE_MIN).map((l) => norm(l.label)),
  );
}

/** 0.5 category + 0.3 subcategory + 0.2 characteristic keyword overlap. */
export function fieldScore(req: RequestDoc, item: ItemDoc): number {
  const cat = norm(req.category) === norm(item.category) ? 1 : 0;
  const sub = norm(req.subcategory) === norm(item.subcategory) ? 1 : 0;
  const reqChars = new Set(req.characteristics.map(norm));
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

/** Share of the request's confident labels that also appear in the item's confident labels. */
export function labelScore(req: RequestDoc, item: ItemDoc): number {
  const r = confidentLabels(req.aiLabels);
  if (r.size === 0) return 0;
  const i = confidentLabels(item.aiLabels);
  let hit = 0;
  r.forEach((l) => {
    if (i.has(l)) hit++;
  });
  return hit / r.size;
}

export function proximityScore(distanceKm: number, radiusKm = DEFAULT_RADIUS_KM): number {
  return Math.max(0, 1 - distanceKm / radiusKm);
}

export interface MatchResult {
  itemId: string;
  score: number;
  distanceKm: number;
  usedLabels: boolean;
  breakdown: { field: number; labels: number; proximity: number };
}

export function matchScore(req: RequestDoc, item: ItemDoc, radiusKm = DEFAULT_RADIUS_KM): MatchResult {
  const usedLabels = confidentLabels(req.aiLabels).size > 0;
  const w = usedLabels ? W_FULL : W_NO_LABELS;
  const distanceKm = haversineKm(req.location, item.location);
  const field = fieldScore(req, item);
  const labels = usedLabels ? labelScore(req, item) : 0;
  const proximity = proximityScore(distanceKm, radiusKm);
  const score = w.field * field + w.labels * labels + w.proximity * proximity;
  return {
    itemId: item.id,
    score: Math.round(score * 10000) / 10000,
    distanceKm: Math.round(distanceKm * 100) / 100,
    usedLabels,
    breakdown: { field, labels, proximity },
  };
}

export interface RankOptions {
  radiusKm?: number;
  minScore?: number;
}

/** Hard filters first (available + within budget), then score, highest first. */
export function rankMatches(req: RequestDoc, items: ItemDoc[], opts: RankOptions = {}): MatchResult[] {
  const { radiusKm = DEFAULT_RADIUS_KM, minScore = 0 } = opts;
  return items
    .filter((it) => it.status === 'available' && it.dailyRate <= req.dailyBudget)
    .map((it) => matchScore(req, it, radiusKm))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
}
