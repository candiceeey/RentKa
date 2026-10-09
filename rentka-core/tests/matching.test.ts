import {
  haversineKm, matchScore, rankMatches, fieldScore, labelScore, proximityScore, confidentLabels,
} from '../src/matching';
import { ItemDoc, RequestDoc } from '../src/types';

const here = { lat: 8.9475, lng: 125.5406 }; // Butuan City
const km = (k: number) => ({ lat: here.lat + k / 111.195, lng: here.lng });

const req = (o: Partial<RequestDoc> = {}): RequestDoc => ({
  requesterId: 'borrower', category: 'Tools', subcategory: 'Drill', characteristics: ['cordless'],
  dailyBudget: 200, location: here,
  photoLabels: [{ label: 'Drill', confidence: 0.9 }, { label: 'Power tool', confidence: 0.8 }], ...o,
});
const item = (o: Partial<ItemDoc> = {}): ItemDoc => ({
  id: 'i1', ownerId: 'lender', ownerVerified: true, trustScore: 4, category: 'Tools', subcategory: 'Drill',
  characteristics: ['cordless', '18v'], description: 'Cordless drill', dailyRate: 150, status: 'available',
  location: here,
  photoLabels: [{ label: 'drill', confidence: 0.95 }, { label: 'power tool', confidence: 0.85 }], ...o,
});

test('haversine: 1 degree of latitude is about 111 km', () => {
  expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 0);
  expect(haversineKm(here, here)).toBe(0);
});

test('perfect match scores 1.0', () => {
  expect(matchScore(req(), item()).score).toBe(1);
});

test('weights: field 0.40, labels 0.30, proximity 0.30', () => {
  const m = matchScore(req(), item({ photoLabels: [{ label: 'bicycle', confidence: 0.9 }] }));
  expect(m.score).toBeCloseTo(0.7, 4);
  expect(m.usedLabels).toBe(true);
});

test('no photo on the request: label weight is redistributed (0.55 / 0.45)', () => {
  const m = matchScore(req({ photoLabels: [], subcategory: 'Hammer', characteristics: [] }), item({ location: km(5) }));
  expect(m.usedLabels).toBe(false);
  expect(m.score).toBeCloseTo(0.55 * 0.7 + 0.45 * 0.5, 2);
});

test('no usable labels on the ITEM also triggers the fallback (not a zero label score)', () => {
  const m = matchScore(req(), item({ photoLabels: [] }));
  expect(m.usedLabels).toBe(false);
  expect(m.score).toBe(1); // field 1, proximity 1
});

test('labels below 0.70 confidence are ignored', () => {
  const r = req({ photoLabels: [{ label: 'drill', confidence: 0.69 }] });
  expect(matchScore(r, item()).usedLabels).toBe(false);
});

test('generic ML Kit labels never count as evidence', () => {
  expect(confidentLabels([{ label: 'Product', confidence: 0.99 }, { label: 'Drill', confidence: 0.9 }])).toEqual(new Set(['drill']));
  const r = req({ photoLabels: [{ label: 'Product', confidence: 0.99 }, { label: 'Material', confidence: 0.95 }] });
  expect(matchScore(r, item()).usedLabels).toBe(false);
});

test('label overlap is the share of the request labels found on the item', () => {
  const r = req({ photoLabels: [{ label: 'drill', confidence: 0.9 }, { label: 'screwdriver', confidence: 0.8 }, { label: 'wood', confidence: 0.5 }] });
  expect(labelScore(r, item())).toBe(0.5);
});

test('label score reads the raw photo labels, not the edited fields', () => {
  // lender edited the category/subcategory but the raw photo labels still say drill
  const edited = item({ category: 'Tools', subcategory: 'Power tool' });
  expect(labelScore(req(), edited)).toBe(1);
  expect(fieldScore(req(), edited)).toBeCloseTo(0.5 + 0 + 0.2, 5);
});

test('proximity falls linearly and bottoms out at 0 beyond the radius', () => {
  expect(proximityScore(0)).toBe(1);
  expect(proximityScore(5)).toBe(0.5);
  expect(proximityScore(25)).toBe(0);
});

test('no location: proximity weight is redistributed over field and labels', () => {
  const m = matchScore(req({ location: undefined }), item());
  expect(m.usedProximity).toBe(false);
  expect(m.distanceKm).toBeNull();
  expect(m.score).toBe(1);
  const half = matchScore(req({ location: undefined }), item({ photoLabels: [{ label: 'bicycle', confidence: 0.9 }] }));
  expect(half.score).toBeCloseTo(0.4 / 0.7, 3);
});

test('no labels and no location: field only', () => {
  const m = matchScore(req({ location: undefined, photoLabels: [] }), item());
  expect(m.score).toBe(1);
});

test('field score: category 0.5 + subcategory 0.3 + characteristics 0.2', () => {
  expect(fieldScore(req({ subcategory: 'Hammer' }), item())).toBeCloseTo(0.7, 5);
  expect(fieldScore(req({ category: 'Appliances', subcategory: 'Blender', characteristics: ['x'] }), item())).toBe(0);
});

test('characteristics: extra features on the item are not penalized', () => {
  expect(fieldScore(req({ characteristics: ['cordless', '18v'] }), item({ characteristics: ['cordless', '18v', 'bosch'] }))).toBe(1);
  expect(fieldScore(req({ characteristics: ['cordless', 'bosch'] }), item({ characteristics: ['cordless'] }))).toBeCloseTo(0.9, 5);
});

describe('rankMatches', () => {
  test('hard filters: availability, budget, verified owner, own items, category', () => {
    const items: ItemDoc[] = [
      item({ id: 'best' }),
      item({ id: 'rented', status: 'rented' }),
      item({ id: 'reserved', status: 'reserved' }),
      item({ id: 'pricey', dailyRate: 999 }),
      item({ id: 'unverified', ownerVerified: false }),
      item({ id: 'mine', ownerId: 'borrower' }),
      item({ id: 'wrongcat', category: 'Appliances', subcategory: 'Blender' }),
      item({ id: 'far', location: km(8), photoLabels: [] }),
    ];
    expect(rankMatches(req(), items).map((m) => m.itemId)).toEqual(['best', 'far']);
  });

  test('default minScore 0.4 drops weak matches; minScore can be overridden', () => {
    const weak = item({ id: 'weak', subcategory: 'Hammer', characteristics: [], location: km(9.5), photoLabels: [] });
    expect(rankMatches(req({ characteristics: ['cordless'] }), [weak]).length).toBe(0);
    expect(rankMatches(req({ characteristics: ['cordless'] }), [weak], { minScore: 0 }).length).toBe(1);
  });

  test('ties break by trust score, then distance', () => {
    const items = [
      item({ id: 'low', trustScore: 3 }),
      item({ id: 'high', trustScore: 5 }),
    ];
    expect(rankMatches(req(), items).map((m) => m.itemId)).toEqual(['high', 'low']);
    const near = [
      item({ id: 'far2', trustScore: 4, location: km(0) }),
      item({ id: 'near2', trustScore: 4, location: km(0) }),
    ];
    expect(rankMatches(req({ location: undefined }), near).length).toBe(2);
  });

  test('returns at most the top N', () => {
    const items = Array.from({ length: 8 }, (_, n) => item({ id: `i${n}`, trustScore: n }));
    expect(rankMatches(req(), items).length).toBe(5);
    expect(rankMatches(req(), items, { limit: 3 }).map((m) => m.itemId)).toEqual(['i7', 'i6', 'i5']);
  });
});
