import { addDays, addMonths, addWeeks, addYears } from "date-fns";

export type RecurrenceUnit = "Days" | "Weeks" | "Months" | "Years";
export const RECURRENCE_UNITS: RecurrenceUnit[] = ["Days", "Weeks", "Months", "Years"];

export interface RecurrenceSpec {
  recurrence: string | null | undefined;
  recurrence_interval?: number | null;
  recurrence_unit?: string | null;
}

/** Advance a date by `count` occurrences of the given recurrence. */
export function addRecurrence(date: Date, spec: RecurrenceSpec, count = 1): Date {
  switch (spec.recurrence) {
    case "Weekly": return addWeeks(date, count);
    case "Bi-Monthly": return addMonths(date, count * 2);
    case "Monthly": return addMonths(date, count);
    case "Quarterly": return addMonths(date, count * 3);
    case "Semi-Annual": return addMonths(date, count * 6);
    case "Yearly": return addYears(date, count);
    case "Custom": {
      const n = (spec.recurrence_interval ?? 0) * count;
      if (!n) return date;
      switch (spec.recurrence_unit) {
        case "Days": return addDays(date, n);
        case "Weeks": return addWeeks(date, n);
        case "Months": return addMonths(date, n);
        case "Years": return addYears(date, n);
        default: return date;
      }
    }
    default: return date;
  }
}

export function isRecurring(spec: RecurrenceSpec): boolean {
  if (!spec.recurrence || spec.recurrence === "None") return false;
  if (spec.recurrence === "Custom") return !!spec.recurrence_interval && !!spec.recurrence_unit;
  return true;
}

export function recurrenceLabel(spec: RecurrenceSpec): string {
  if (spec.recurrence === "Custom") {
    const n = spec.recurrence_interval ?? 0;
    const unit = spec.recurrence_unit ?? "";
    if (!n || !unit) return "Custom";
    return `Every ${n} ${n === 1 ? unit.replace(/s$/, "").toLowerCase() : unit.toLowerCase()}`;
  }
  return spec.recurrence || "None";
}
