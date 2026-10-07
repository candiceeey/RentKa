import { haversineKm, matchScore, rankMatches, fieldScore, labelScore, proximityScore } from '../src/matching';
import { ItemDoc, RequestDoc } from '../src/types';

const here = { lat: 8.9475, lng: 125.5406 }; // Butuan City
const km = (k: number) => ({ lat: here.lat + k / 111.195, lng: here.lng });

const req = (o: Partial<RequestDoc> = {}): RequestDoc => ({
  category: 'Tools', subcategory: 'Drill', characteristics: ['cordless'],
  dailyBudget: 200, location: here,
  aiLabels: [{ label: 'Drill', confidence: 0.9 }, { label: 'Power tool', confidence: 0.8 }], ...o,
});
const item = (o: Partial<ItemDoc> = {}): ItemDoc => ({
  id: 'i1', category: 'Tools', subcategory: 'Drill', characteristics: ['cordless', '18v'],
  dailyRate: 150, status: 'available', location: here,
  aiLabels: [{ label: 'drill', confidence: 0.95 }, { label: 'power tool', confidence: 0.85 }], ...o,
});

test('haversine: 1 degree of latitude is about 111 km', () => {
  expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 0);
  expect(haversineKm(here, here)).toBe(0);
});

test('perfect match scores 1.0', () => {
  expect(matchScore(req(), item()).score).toBe(1);
});

test('weights: field 0.40, labels 0.30, proximity 0.30', () => {
  // field = 1, labels = 0 (no overlap), proximity = 1  => 0.40 + 0 + 0.30 = 0.70
  const m = matchScore(req(), item({ aiLabels: [{ label: 'bicycle', confidence: 0.9 }] }));
  expect(m.score).toBeCloseTo(0.7, 4);
  expect(m.usedLabels).toBe(true);
});

test('no photo: label weight is redistributed (0.55 / 0.45)', () => {
  // field = 0.5 cat + 0 sub + 0.2 (no characteristics requested) = 0.7; proximity at 5 km of 10 = 0.5
  const m = matchScore(req({ aiLabels: [], subcategory: 'Hammer', characteristics: [] }), item({ location: km(5) }));
  expect(m.usedLabels).toBe(false);
  expect(m.score).toBeCloseTo(0.55 * 0.7 + 0.45 * 0.5, 2);
});

test('labels below 0.70 confidence are ignored', () => {
  const r = req({ aiLabels: [{ label: 'drill', confidence: 0.69 }] });
  expect(matchScore(r, item()).usedLabels).toBe(false);
});

test('label overlap is the share of the request labels found on the item', () => {
  const r = req({ aiLabels: [{ label: 'drill', confidence: 0.9 }, { label: 'tool', confidence: 0.8 }, { label: 'wood', confidence: 0.5 }] });
  expect(labelScore(r, item())).toBe(0.5);
});

test('proximity falls linearly and bottoms out at 0 beyond the radius', () => {
  expect(proximityScore(0)).toBe(1);
  expect(proximityScore(5)).toBe(0.5);
  expect(proximityScore(25)).toBe(0);
});

test('field score: category 0.5 + subcategory 0.3 + characteristics 0.2', () => {
  expect(fieldScore(req({ subcategory: 'Hammer' }), item())).toBeCloseTo(0.7, 5);
  expect(fieldScore(req({ category: 'Appliances', subcategory: 'Blender', characteristics: ['x'] }), item())).toBe(0);
});

test('rankMatches filters rented items and items over budget, then sorts best first', () => {
  const items: ItemDoc[] = [
    item({ id: 'best' }),
    item({ id: 'rented', status: 'rented' }),
    item({ id: 'pricey', dailyRate: 999 }),
    item({ id: 'far', location: km(8), aiLabels: [] }),
  ];
  expect(rankMatches(req(), items).map((m) => m.itemId)).toEqual(['best', 'far']);
});

test('rankMatches respects minScore', () => {
  const items = [item({ id: 'a' }), item({ id: 'b', category: 'Appliances', subcategory: 'Blender', location: km(50), aiLabels: [] })];
  expect(rankMatches(req(), items, { minScore: 0.5 }).map((m) => m.itemId)).toEqual(['a']);
});
