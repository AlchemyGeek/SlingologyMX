import { supabase } from "@/integrations/supabase/client";

export type CounterType = "hobbs" | "tach" | "airframe_total_time" | "engine_total_time" | "prop_total_time";

export type CounterValueType = "actual" | "interpolated" | "extrapolated";

export interface CounterEntry {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface CounterResult {
  value: number;
  type: CounterValueType;
  confidence: "high" | "low";
  explanation: string;
}

export interface CounterLog {
  entries: CounterEntry[];
  counterType: CounterType;
}

interface RawHistoryEntry {
  change_date: string;
  hobbs: number | null;
  tach: number | null;
  airframe_total_time: number | null;
  engine_total_time: number | null;
  prop_total_time: number | null;
}

/**
 * Fetches counter history for an aircraft and returns entries for a specific counter type.
 */
export async function fetchCounterLog(
  aircraftId: string,
  counterType: CounterType
): Promise<CounterLog> {
  const { data, error } = await supabase
    .from("aircraft_counter_history")
    .select("change_date, hobbs, tach, airframe_total_time, engine_total_time, prop_total_time")
    .eq("aircraft_id", aircraftId)
    .order("change_date", { ascending: true });

  if (error) {
    console.error("Error fetching counter history:", error);
    return { entries: [], counterType };
  }

  // Map entries and normalize dates
  const rawEntries: CounterEntry[] = (data as RawHistoryEntry[])
    .map((row) => ({
      // Normalize date to YYYY-MM-DD format (remove timezone info)
      date: row.change_date.split("T")[0],
      value: row[counterType] ?? null,
    }))
    .filter((e): e is CounterEntry => e.value !== null);

  // Deduplicate by date, keeping the highest value for each date
  // (counters are monotonically increasing, so highest is most accurate)
  const entriesByDate = new Map<string, number>();
  rawEntries.forEach((entry) => {
    const existing = entriesByDate.get(entry.date);
    if (existing === undefined || entry.value > existing) {
      entriesByDate.set(entry.date, entry.value);
    }
  });

  const entries: CounterEntry[] = Array.from(entriesByDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { entries, counterType };
}

/**
 * Gets a counter value for any analysis date using interpolation or extrapolation.
 * Returns null if value cannot be determined (e.g., date before first entry, invalid log).
 */
export function getCounterValue(
  log: CounterLog,
  analysisDate: string,
  lookbackDays: number = 90
): CounterResult | null {
  const { entries } = log;

  // No entries - cannot determine value
  if (entries.length === 0) {
    return null;
  }

  const targetDate = new Date(analysisDate + "T00:00:00");
  
  // Find exact match first
  const exactMatch = entries.find((e) => e.date === analysisDate);
  if (exactMatch) {
    return {
      value: exactMatch.value,
      type: "actual",
      confidence: "high",
      explanation: `Actual recorded value on ${formatDate(analysisDate)}`,
    };
  }

  // Check if date is before first entry - fall back to first entry value
  // This allows partial-period calculations when analysis starts before history
  const firstEntry = entries[0];
  if (analysisDate < firstEntry.date) {
    return {
      value: firstEntry.value,
      type: "interpolated",
      confidence: "low",
      explanation: `Earliest available value from ${formatDate(firstEntry.date)} (analysis date precedes counter history)`,
    };
  }

  // Check if date is after last entry - extrapolation
  const lastEntry = entries[entries.length - 1];
  if (analysisDate > lastEntry.date) {
    return extrapolateForward(entries, analysisDate, lookbackDays);
  }

  // Date is between entries - interpolation
  return interpolateBetween(entries, analysisDate);
}

/**
 * Linear interpolation between two known entries.
 */
function interpolateBetween(
  entries: CounterEntry[],
  targetDate: string
): CounterResult | null {
  // Find the entries that bracket the target date
  let entryBefore: CounterEntry | null = null;
  let entryAfter: CounterEntry | null = null;

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].date <= targetDate) {
      entryBefore = entries[i];
    }
    if (entries[i].date > targetDate && !entryAfter) {
      entryAfter = entries[i];
      break;
    }
  }

  if (!entryBefore || !entryAfter) {
    return null;
  }

  // Validate monotonic increase
  if (entryAfter.value < entryBefore.value) {
    return null; // Invalid: counter decreased
  }

  // Same date entries - use later value (already handled by exact match above)
  if (entryBefore.date === entryAfter.date) {
    return {
      value: entryAfter.value,
      type: "actual",
      confidence: "high",
      explanation: `Actual recorded value on ${formatDate(entryAfter.date)}`,
    };
  }

  const daysBefore = daysBetween(entryBefore.date, targetDate);
  const totalDays = daysBetween(entryBefore.date, entryAfter.date);
  
  const rate = (entryAfter.value - entryBefore.value) / totalDays;
  const interpolatedValue = entryBefore.value + rate * daysBefore;

  // Mark low confidence if large gap
  const confidence = totalDays > 180 ? "low" : "high";

  return {
    value: Math.round(interpolatedValue * 10) / 10,
    type: "interpolated",
    confidence,
    explanation: `Interpolated between ${formatDate(entryBefore.date)} and ${formatDate(entryAfter.date)}`,
  };
}

/**
 * Linear extrapolation after the last known entry.
 */
function extrapolateForward(
  entries: CounterEntry[],
  targetDate: string,
  lookbackDays: number
): CounterResult | null {
  // Need at least 2 entries for extrapolation
  if (entries.length < 2) {
    return null;
  }

  const lastEntry = entries[entries.length - 1];
  
  // Find entries within lookback window for rate calculation
  const lookbackCutoff = new Date(lastEntry.date + "T00:00:00");
  lookbackCutoff.setDate(lookbackCutoff.getDate() - lookbackDays);
  const lookbackDateStr = formatDateISO(lookbackCutoff);

  // Get entries in lookback window (at least use last 2 entries)
  const windowEntries = entries.filter((e) => e.date >= lookbackDateStr);
  const rateEntries = windowEntries.length >= 2 ? windowEntries : entries.slice(-2);

  const firstRateEntry = rateEntries[0];
  const lastRateEntry = rateEntries[rateEntries.length - 1];

  // Calculate rate
  const rateDays = daysBetween(firstRateEntry.date, lastRateEntry.date);
  if (rateDays === 0) {
    return null; // Cannot calculate rate from same-day entries
  }

  const rate = (lastRateEntry.value - firstRateEntry.value) / rateDays;

  // Handle zero or negative rate
  const isLowConfidence = rate <= 0;

  // Calculate extrapolated value
  const daysForward = daysBetween(lastEntry.date, targetDate);
  const extrapolatedValue = lastEntry.value + rate * daysForward;

  const windowDays = daysBetween(firstRateEntry.date, lastRateEntry.date);

  return {
    value: Math.round(extrapolatedValue * 10) / 10,
    type: "extrapolated",
    confidence: isLowConfidence ? "low" : "high",
    explanation: `Projected using average usage from the last ${windowDays} days`,
  };
}

/**
 * Calculate usage rate (hours per day) from counter log.
 * Returns null if insufficient data.
 */
export function calculateUsageRate(
  log: CounterLog,
  lookbackDays: number = 90
): { rate: number; windowDays: number; confidence: "high" | "low" } | null {
  const { entries } = log;

  if (entries.length < 2) {
    return null;
  }

  const lastEntry = entries[entries.length - 1];
  const lookbackCutoff = new Date(lastEntry.date + "T00:00:00");
  lookbackCutoff.setDate(lookbackCutoff.getDate() - lookbackDays);
  const lookbackDateStr = formatDateISO(lookbackCutoff);

  const windowEntries = entries.filter((e) => e.date >= lookbackDateStr);
  const rateEntries = windowEntries.length >= 2 ? windowEntries : entries.slice(-2);

  const firstEntry = rateEntries[0];
  const lastRateEntry = rateEntries[rateEntries.length - 1];

  const windowDays = daysBetween(firstEntry.date, lastRateEntry.date);
  if (windowDays === 0) {
    return null;
  }

  const rate = (lastRateEntry.value - firstEntry.value) / windowDays;

  return {
    rate,
    windowDays,
    confidence: rate <= 0 ? "low" : "high",
  };
}

/**
 * Calculates owner-specific hours by subtracting the initial (acquisition) value.
 * Returns 0 if absolute value is less than initial.
 */
export function getOwnerHours(
  absoluteValue: number,
  initialValue: number | null
): number {
  const offset = initialValue ?? 0;
  return Math.max(0, absoluteValue - offset);
}

// Helper functions
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + "T00:00:00");
  const b = new Date(dateB + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
