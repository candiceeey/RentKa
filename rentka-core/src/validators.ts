/** Luhn check used by IMEI numbers. */
function luhnOk(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function isValidImei(value: string): boolean {
  const v = value.replace(/[\s-]/g, '');
  return /^\d{15}$/.test(v) && luhnOk(v);
}

export type UniqueIdType = 'IMEI' | 'SERIAL' | 'MARK';

export function normalizeUniqueId(type: UniqueIdType, value: string): string {
  const v = value.trim();
  if (type === 'IMEI') return v.replace(/[\s-]/g, '');
  if (type === 'SERIAL') return v.replace(/[\s-]/g, '').toUpperCase();
  return v.replace(/\s+/g, ' ').toLowerCase();
}

/** Returns an error message, or null when valid. */
export function validateUniqueId(type: UniqueIdType, value: string): string | null {
  const v = normalizeUniqueId(type, value);
  if (!v) return 'Required';
  if (type === 'IMEI') return isValidImei(v) ? null : 'Invalid IMEI (15 digits, check digit must match)';
  if (type === 'SERIAL') return v.length >= 4 ? null : 'Serial number looks too short';
  return v.length >= 5 ? null : 'Describe a distinguishing mark (at least 5 characters)';
}

export function maskUniqueId(value: string): string {
  const v = value.trim();
  if (v.length <= 4) return '•'.repeat(v.length);
  return '•'.repeat(v.length - 4) + v.slice(-4);
}

/** birthdate as YYYY-MM-DD */
export function isAdult(birthdate: string, today: Date = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getUTCFullYear() - y;
  const hadBirthday =
    today.getUTCMonth() + 1 > mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() >= d);
  if (!hadBirthday) age--;
  return age >= 18;
}
