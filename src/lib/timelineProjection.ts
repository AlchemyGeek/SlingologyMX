import { parseLocalDate } from "@/lib/utils";
import type { TimelineEvent, TimelineCategory } from "@/lib/timelineEvents";

export type CounterField =
  | "hobbs"
  | "tach"
  | "airframe_total_time"
  | "engine_total_time"
  | "prop_total_time";

export const COUNTER_LABEL_TO_FIELD: Record<string, CounterField> = {
  Hobbs: "hobbs",
  Tach: "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

export interface CounterReading {
  dateISO: string;
  values: Partial<Record<CounterField, number | null>>;
}

export interface UtilizationRate {
  /** Flying hours per month used for every projection. */
  hoursPerMonth: number | null;
  hoursPerDay: number | null;
  source: "override" | "history" | "none";
  /** Days of counter history the automatic rate was measured over. */
  windowDays: number;
  counterField: CounterField;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RATE_WINDOW_DAYS = 183; // trailing six months

/**
 * Trailing six-month flying rate from counter history, or the owner's override.
 */
export function computeUtilizationRate(
  readings: CounterReading[],
  counterField: CounterField,
  overrideHoursPerMonth?: number | null
): UtilizationRate {
  if (overrideHoursPerMonth && overrideHoursPerMonth > 0) {
    return {
      hoursPerMonth: overrideHoursPerMonth,
      hoursPerDay: (overrideHoursPerMonth * 12) / 365,
      source: "override",
      windowDays: 0,
      counterField,
    };
  }

  const points = readings
    .map((r) => ({ dateISO: r.dateISO, value: r.values[counterField] }))
    .filter((p): p is { dateISO: string; value: number } => typeof p.value === "number")
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  if (points.length < 2) {
    return { hoursPerMonth: null, hoursPerDay: null, source: "none", windowDays: 0, counterField };
  }

  const last = points[points.length - 1];
  const cutoff = new Date(parseLocalDate(last.dateISO).getTime() - RATE_WINDOW_DAYS * DAY_MS);
  const windowed = points.filter((p) => parseLocalDate(p.dateISO) >= cutoff);
  const used = windowed.length >= 2 ? windowed : points.slice(-2);

  const first = used[0];
  const days = Math.round(
    (parseLocalDate(last.dateISO).getTime() - parseLocalDate(first.dateISO).getTime()) / DAY_MS
  );
  const delta = last.value - first.value;

  if (days <= 0 || delta <= 0) {
    return { hoursPerMonth: null, hoursPerDay: null, source: "none", windowDays: Math.max(days, 0), counterField };
  }

  const hoursPerDay = delta / days;
  return {
    hoursPerMonth: (hoursPerDay * 365) / 12,
    hoursPerDay,
    source: "history",
    windowDays: days,
    counterField,
  };
}

/** Latest known value of one counter. */
export function latestCounterValue(
  readings: CounterReading[],
  counterField: CounterField,
  fallback?: number | null
): { value: number; dateISO: string } | null {
  const points = readings
    .map((r) => ({ dateISO: r.dateISO, value: r.values[counterField] }))
    .filter((p): p is { dateISO: string; value: number } => typeof p.value === "number")
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  if (points.length > 0) return points[points.length - 1];
  if (typeof fallback === "number") return { value: fallback, dateISO: toISO(new Date()) };
  return null;
}

/**
 * Date on which a counter is expected to reach `target`, at the given rate.
 * Returns today when the target is already passed. Null when no usable rate.
 */
export function projectDateForCounterTarget(
  currentValue: number,
  currentDateISO: string,
  target: number,
  hoursPerDay: number | null
): string | null {
  if (!hoursPerDay || hoursPerDay <= 0) return null;
  const remaining = target - currentValue;
  const today = startOfToday();
  if (remaining <= 0) return toISO(today);
  const from = parseLocalDate(currentDateISO);
  const due = new Date(from.getTime() + (remaining / hoursPerDay) * DAY_MS);
  return toISO(due < today ? today : due);
}

/** "Whichever comes first" between a fixed calendar date and a projected one. */
export function whicheverComesFirst(
  dateISO: string | null,
  projectedISO: string | null
): { dateISO: string; basis: "date" | "hours" } | null {
  if (dateISO && projectedISO) {
    return dateISO <= projectedISO
      ? { dateISO, basis: "date" }
      : { dateISO: projectedISO, basis: "hours" };
  }
  if (dateISO) return { dateISO, basis: "date" };
  if (projectedISO) return { dateISO: projectedISO, basis: "hours" };
  return null;
}

/** An item due at a counter value, and optionally also at a date. */
export interface HourDueCandidate {
  recordId: string;
  source: TimelineEvent["source"];
  category: TimelineCategory;
  title: string;
  counterLabel: string | null;
  targetValue: number | null;
  dueDateISO: string | null;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

export function projectDueEvents(
  candidates: HourDueCandidate[],
  readings: CounterReading[],
  currentCounters: Partial<Record<CounterField, number | null>>,
  rate: UtilizationRate
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  candidates.forEach((c) => {
    const field = c.counterLabel ? COUNTER_LABEL_TO_FIELD[c.counterLabel] : undefined;
    let projectedISO: string | null = null;

    if (field && typeof c.targetValue === "number") {
      const current =
        latestCounterValue(readings, field, currentCounters[field] ?? null) ?? null;
      if (current) {
        projectedISO = projectDateForCounterTarget(
          current.value,
          current.dateISO,
          c.targetValue,
          rate.hoursPerDay
        );
      }
    }

    const resolved = whicheverComesFirst(c.dueDateISO, projectedISO);
    if (!resolved) return;

    const hourBased = resolved.basis === "hours";
    const detail =
      hourBased && c.counterLabel && typeof c.targetValue === "number"
        ? `Due at ${c.counterLabel} ${c.targetValue.toFixed(1)}`
        : c.subtitle;

    events.push({
      id: `${c.source}:${c.recordId}`,
      recordId: c.recordId,
      source: c.source,
      category: c.category,
      confidence: hourBased ? "projected" : "scheduled",
      title: c.title,
      date: parseLocalDate(resolved.dateISO),
      dateISO: resolved.dateISO,
      subtitle: detail,
      amount: null,
      meta: { ...c.meta, dueBasis: resolved.basis, targetValue: c.targetValue },
    });
  });

  return events;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
