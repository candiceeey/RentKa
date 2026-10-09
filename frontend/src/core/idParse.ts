/**
 * Heuristic parser for OCR text read from a Philippine ID. OCR is imperfect and layouts differ,
 * so every field is pre-filled only as a suggestion: the user must be able to edit all of them.
 * Parsed data stays on the device (expo-secure-store); the cloud only gets verified/isAdult/hash.
 */
export interface ParsedId {
  idType: 'PhilSys' | 'DriversLicense' | 'UMID' | 'Passport' | 'Unknown';
  fullName?: string;
  birthdate?: string; // YYYY-MM-DD
  idNumber?: string;
  confidence: 'high' | 'low';
  missing: string[];
}

const MONTHS: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};
const MON = '(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\\.?';
const pad = (n: string) => n.padStart(2, '0');

export function detectIdType(text: string): ParsedId['idType'] {
  const t = text.toUpperCase();
  if (t.includes('PHILSYS') || t.includes('PHILIPPINE IDENTIFICATION')) return 'PhilSys';
  if (t.includes("DRIVER'S LICENSE") || t.includes('DRIVERS LICENSE') || t.includes('LAND TRANSPORTATION')) return 'DriversLicense';
  if (t.includes('UMID') || t.includes('UNIFIED MULTI-PURPOSE')) return 'UMID';
  if (t.includes('PASSPORT')) return 'Passport';
  return 'Unknown';
}

export function parseDate(segment: string): string | undefined {
  let m = segment.match(/\b((?:19|20)\d{2})[\/.-](0?[1-9]|1[0-2])[\/.-](0?[1-9]|[12]\d|3[01])\b/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = segment.match(/\b(0?[1-9]|1[0-2])[\/.-](0?[1-9]|[12]\d|3[01])[\/.-]((?:19|20)\d{2})\b/);
  if (m) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;
  m = segment.match(new RegExp(`\\b${MON}\\s+(\\d{1,2}),?\\s+((?:19|20)\\d{2})\\b`, 'i'));
  if (m) return `${m[3]}-${MONTHS[m[1].toUpperCase()]}-${pad(m[2])}`;
  m = segment.match(new RegExp(`\\b(\\d{1,2})\\s+${MON},?\\s+((?:19|20)\\d{2})\\b`, 'i'));
  if (m) return `${m[3]}-${MONTHS[m[2].toUpperCase()]}-${pad(m[1])}`;
  return undefined;
}

function valueAfterLabel(lines: string[], labelRe: RegExp): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    if (!labelRe.test(lines[i])) continue;
    const inline = lines[i].split(':').slice(1).join(':').trim();
    if (inline) return inline;
    for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
      const v = lines[j].trim();
      if (v) return v;
    }
  }
  return undefined;
}

const title = (s: string) =>
  s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\s+/g, ' ').trim();

export function parseId(ocrText: string): ParsedId {
  const lines = ocrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const idType = detectIdType(ocrText);

  const last = valueAfterLabel(lines, /last\s*name|surname/i);
  const given = valueAfterLabel(lines, /given\s*names?|first\s*name/i);
  const middle = valueAfterLabel(lines, /middle\s*name/i);
  const nameParts = [given, middle, last].filter(Boolean) as string[];
  const fullName = nameParts.length >= 2 ? title(nameParts.join(' ')) : undefined;

  // Prefer a date next to a birth label; otherwise fall back to the first date (low confidence).
  let birthdate: string | undefined;
  let birthFromLabel = false;
  for (let i = 0; i < lines.length && !birthdate; i++) {
    if (/birth|kapanganakan|\bdob\b/i.test(lines[i])) {
      birthdate = parseDate(`${lines[i]} ${lines[i + 1] ?? ''}`);
      birthFromLabel = !!birthdate;
    }
  }
  if (!birthdate) birthdate = parseDate(ocrText);

  let idNumber: string | undefined;
  const phil = ocrText.match(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/); // no \s: must not span lines
  const lto = ocrText.match(/\b[A-Z]\d{2}-\d{2}-\d{6}\b/);
  if (phil) idNumber = `${phil[1]}${phil[2]}${phil[3]}${phil[4]}`;
  else if (lto) idNumber = lto[0];
  else idNumber = valueAfterLabel(lines, /(id|license|licence|crn|passport)\s*(no|number|#)/i);

  const missing: string[] = [];
  if (!fullName) missing.push('fullName');
  if (!birthdate) missing.push('birthdate');
  if (!idNumber) missing.push('idNumber');

  return {
    idType,
    fullName,
    birthdate,
    idNumber,
    confidence: missing.length === 0 && birthFromLabel && idType !== 'Unknown' ? 'high' : 'low',
    missing,
  };
}
