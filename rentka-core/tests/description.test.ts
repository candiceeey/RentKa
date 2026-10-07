import { buildDescription, extractBrandModel, mapLabels } from '../src/description';

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
  expect(r).toEqual({ usable: false, description: '' });
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
