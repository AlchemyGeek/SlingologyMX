/**
 * Parse a typed date. Accepts M/D/YY, M/D/YYYY (with "/", "-" or "."), and YYYY-MM-DD.
 * Two-digit years map to 2000–2099. Returns null if the text is not a complete valid date.
 */
export function parseDateInput(text: string): Date | null {
  const s = text.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (!match) return null;
    m = Number(match[1]);
    d = Number(match[2]);
    y = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  }
  if (y < 1900 || y > 2100) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}
