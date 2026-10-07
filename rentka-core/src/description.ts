import { Label } from './types';
import { LABEL_CONFIDENCE_MIN } from './matching';

/**
 * ML Kit returns generic labels. This maps them to RentKa categories.
 * PLACEHOLDER category names: align them with the category list in your Chapter 3 tables.
 */
export const LABEL_MAP: Record<string, { category: string; subcategory: string }> = {
  drill: { category: 'Tools', subcategory: 'Drill' },
  'power tool': { category: 'Tools', subcategory: 'Power tool' },
  hammer: { category: 'Tools', subcategory: 'Hammer' },
  wrench: { category: 'Tools', subcategory: 'Wrench' },
  ladder: { category: 'Tools', subcategory: 'Ladder' },
  'rice cooker': { category: 'Appliances', subcategory: 'Rice cooker' },
  blender: { category: 'Appliances', subcategory: 'Blender' },
  'electric fan': { category: 'Appliances', subcategory: 'Electric fan' },
  fan: { category: 'Appliances', subcategory: 'Electric fan' },
  'washing machine': { category: 'Appliances', subcategory: 'Washing machine' },
  'mobile phone': { category: 'Electronics', subcategory: 'Mobile phone' },
  'cell phone': { category: 'Electronics', subcategory: 'Mobile phone' },
  smartphone: { category: 'Electronics', subcategory: 'Mobile phone' },
  laptop: { category: 'Electronics', subcategory: 'Laptop' },
  camera: { category: 'Electronics', subcategory: 'Camera' },
  speaker: { category: 'Electronics', subcategory: 'Speaker' },
  projector: { category: 'Electronics', subcategory: 'Projector' },
  tent: { category: 'Outdoor', subcategory: 'Tent' },
  bicycle: { category: 'Outdoor', subcategory: 'Bicycle' },
  backpack: { category: 'Outdoor', subcategory: 'Backpack' },
  table: { category: 'Party & Events', subcategory: 'Table' },
  chair: { category: 'Party & Events', subcategory: 'Chair' },
  microphone: { category: 'Party & Events', subcategory: 'Microphone' },
};

const KNOWN_BRANDS = [
  'Bosch', 'Makita', 'DeWalt', 'Stanley', 'Black+Decker', 'Samsung', 'Apple', 'Xiaomi', 'Oppo',
  'Vivo', 'Realme', 'Huawei', 'Canon', 'Nikon', 'Sony', 'Panasonic', 'Philips', 'Hanabishi',
  'Kyowa', 'Imarflex', 'Asahi', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'JBL', 'Epson',
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function mapLabels(labels: Label[]) {
  const confident = labels
    .filter((l) => l.confidence >= LABEL_CONFIDENCE_MIN)
    .sort((a, b) => b.confidence - a.confidence);
  for (const l of confident) {
    const hit = LABEL_MAP[l.label.trim().toLowerCase()];
    if (hit) return { ...hit, matchedLabel: l.label.trim().toLowerCase() };
  }
  return null;
}

/** Pull a brand and model from OCR text read off the item or its box. Best effort only. */
export function extractBrandModel(ocrText?: string): string {
  if (!ocrText) return '';
  const upper = ocrText.toUpperCase();
  const brand = KNOWN_BRANDS.find((b) => upper.includes(b.toUpperCase()));
  const model = upper.match(/\b[A-Z]{1,5}[- ]?\d{2,5}[A-Z]{0,2}\b/)?.[0];
  return [brand, model].filter(Boolean).join(' ');
}

export interface AutoFill {
  usable: boolean; // false => leave fields empty and ask the user to describe the item
  description: string;
  category?: string;
  subcategory?: string;
}

/** Template-based description from ML Kit output. The user can always edit it. */
export function buildDescription(input: { labels: Label[]; ocrText?: string }): AutoFill {
  const confident = input.labels
    .filter((l) => l.confidence >= LABEL_CONFIDENCE_MIN)
    .sort((a, b) => b.confidence - a.confidence);
  if (confident.length === 0) return { usable: false, description: '' };

  const mapped = mapLabels(input.labels);
  const subject = mapped ? mapped.subcategory : cap(confident[0].label.trim().toLowerCase());
  const used = mapped ? mapped.matchedLabel : confident[0].label.trim().toLowerCase();

  const bm = extractBrandModel(input.ocrText);
  const head = bm ? `${subject} (${bm}).` : `${subject}.`;

  const others = confident
    .map((l) => l.label.trim().toLowerCase())
    .filter((l) => l !== used)
    .slice(0, 2);
  const labelPart = others.length ? ` Photo labels: ${others.join(', ')}.` : '';

  return {
    usable: true,
    description: `${head}${labelPart} Please add its condition and other details.`,
    category: mapped?.category,
    subcategory: mapped?.subcategory,
  };
}
