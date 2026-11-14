/** Normalize report dates without timezone conversion or calendar rollover. */
export function normalizeOilReportDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const text = raw.trim();
  let year: number, month: number, day: number;
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const numeric = text.match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2}|\d{4})$/);
  if (iso) {
    year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]);
  } else if (numeric) {
    month = Number(numeric[1]); day = Number(numeric[2]);
    // Match the app's month/day convention; an impossible month establishes day/month.
    if (month > 12 && day <= 12) [month, day] = [day, month];
    year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
  } else {
    const named = text.replace(/,/g, "").match(/^(?:(\d{1,2})\s+([A-Za-z]+)|([A-Za-z]+)\s+(\d{1,2}))\s+(\d{2}|\d{4})$/);
    if (!named) return null;
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    month = months.indexOf((named[2] || named[3]).toLowerCase().slice(0, 3)) + 1;
    day = Number(named[1] || named[4]);
    year = named[5].length === 2 ? 2000 + Number(named[5]) : Number(named[5]);
  }
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return null;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > maxDay) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}