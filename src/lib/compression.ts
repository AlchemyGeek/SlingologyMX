export const COMPRESSION_MAX = 80;
export const CYLINDER_COUNTS = [2, 4, 6] as const;
export const DEFAULT_CYLINDER_COUNT = 4;
export const DEFAULT_COMPRESSION_THRESHOLD = 60;

/** Parses a whole-number reading 0-80; returns null when invalid. */
export function parseCompression(input: string): number | null {
  const s = input.trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = parseInt(s, 10);
  return n >= 0 && n <= COMPRESSION_MAX ? n : null;
}

export function formatCompression(n: number): string {
  return `${String(n).padStart(2, "0")}/${COMPRESSION_MAX}`;
}

export function isLowCompression(n: number, threshold: number): boolean {
  return n < threshold;
}

/** Normalizes a stored jsonb value into an array of readings, or null. */
export function readCompressions(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  return v.every((x) => typeof x === "number") ? (v as number[]) : null;
}
