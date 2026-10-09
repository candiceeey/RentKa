import {
  autofillAccuracy, buildDescription, extractBrandModel, extractChips, mapLabels, toSuggested,
} from '../src/description';

test('builds a description from confident labels and OCR brand/model', () => {
  const r = buildDescription({
    labels: [
      { label: 'Drill', confidence: 0.91 }, { label: 'Power tool', confidence: 0.84 },
      { label: 'Tool', confidence: 0.78 }, { label: 'Wood', confidence: 0.4 },
    ],
    ocrText: 'BOSCH\nPROFESSIONAL\nGSB 550\n550W',
  });
  expect(r.usable).toBe(true);
  expect(r.description).toBe('Drill (Bosch GSB 550). Photo labels: power tool, tool. Please add its condition and other details.');
  expect(r.category).toBe('Tools');
  expect(r.subcategory).toBe('Drill');
});

test('works without OCR text', () => {
  const r = buildDescription({ labels: [{ label: 'Rice cooker', confidence: 0.88 }] });
  expect(r.description).toBe('Rice cooker. Please add its condition and other details.');
  expect(r.category).toBe('Appliances');
});

test('falls back to the top label when nothing maps to a category', () => {
  const r = buildDescription({ labels: [{ label: 'gadget', confidence: 0.9 }] });
  expect(r.usable).toBe(true);
  expect(r.description.startsWith('Gadget.')).toBe(true);
  expect(r.category).toBeUndefined();
});

test('low confidence: not usable, description left empty for the user', () => {
  const r = buildDescription({ labels: [{ label: 'drill', confidence: 0.5 }] });
  expect(r).toEqual({ usable: false, description: '', characteristics: [] });
});

test('brand/model extraction', () => {
  expect(extractBrandModel('Samsung Galaxy A54')).toBe('Samsung A54');
  expect(extractBrandModel('no useful text here')).toBe('');
  expect(extractBrandModel(undefined)).toBe('');
});

test('mapLabels picks the highest-confidence mappable label', () => {
  const m = mapLabels([{ label: 'tool', confidence: 0.95 }, { label: 'laptop', confidence: 0.8 }]);
  expect(m?.subcategory).toBe('Laptop');
});

test('OCR brand and model become separate editable chips', () => {
  expect(extractChips('BOSCH\nPROFESSIONAL\nGSB 550\n550W')).toEqual(['bosch', 'gsb 550']);
  expect(extractChips(undefined)).toEqual([]);
  const r = buildDescription({ labels: [{ label: 'Drill', confidence: 0.9 }], ocrText: 'MAKITA DF333D' });
  expect(r.characteristics).toEqual(['makita', 'df333d']);
});

test('toSuggested snapshots the auto-fill output', () => {
  const a = buildDescription({ labels: [{ label: 'Drill', confidence: 0.9 }], ocrText: 'BOSCH GSB 550' });
  const s = toSuggested(a);
  expect(s.category).toBe('Tools');
  expect(s.characteristics).toEqual(['bosch', 'gsb 550']);
  a.characteristics.push('mutated');
  expect(s.characteristics).toEqual(['bosch', 'gsb 550']);
});

test('autofillAccuracy: everything accepted', () => {
  const s = { description: 'Drill.', category: 'Tools', subcategory: 'Drill', characteristics: ['bosch'] };
  const r = autofillAccuracy(s, { description: 'Drill.', category: 'Tools', subcategory: 'Drill', characteristics: ['bosch'] });
  expect(r.acceptanceRate).toBe(1);
  expect(r.descriptionEdited).toBe(false);
});

test('autofillAccuracy: user edits description, fixes subcategory, adds a chip', () => {
  const s = { description: 'Drill.', category: 'Tools', subcategory: 'Drill', characteristics: ['bosch'] };
  const r = autofillAccuracy(s, {
    description: 'Drill. Good condition.', category: 'Tools', subcategory: 'Power tool', characteristics: ['bosch', 'cordless'],
  });
  expect(r.categoryAccepted).toBe(true);
  expect(r.subcategoryAccepted).toBe(false);
  expect(r.descriptionEdited).toBe(true);
  expect(r.chipsKept).toBe(1);
  expect(r.chipsAdded).toBe(1);
  expect(r.acceptanceRate).toBeCloseTo(1 / 3, 3);
});
