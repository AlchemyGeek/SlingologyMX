import { differenceInCalendarDays } from "date-fns";
import { parseLocalDate } from "@/lib/utils";

export type MaintenanceStatus = "Scheduled" | "In Progress" | "Completed";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Derived status of a maintenance event.
 * - Completed: a completion date exists
 * - Scheduled: start date is in the future
 * - In Progress: started today or earlier, not completed
 */
export const getMaintenanceStatus = (
  dateStarted: string | Date | null | undefined,
  dateCompleted: string | Date | null | undefined
): MaintenanceStatus => {
  if (dateCompleted) return "Completed";
  if (!dateStarted) return "In Progress";
  const start = typeof dateStarted === "string" ? parseLocalDate(dateStarted) : dateStarted;
  return start.getTime() > startOfToday().getTime() ? "Scheduled" : "In Progress";
};

/** Days the aircraft has been (or was) in the shop. Null when unknown. */
export const getShopTimeDays = (
  dateStarted: string | Date | null | undefined,
  dateCompleted: string | Date | null | undefined
): number | null => {
  if (!dateStarted) return null;
  const start = typeof dateStarted === "string" ? parseLocalDate(dateStarted) : dateStarted;
  const end = dateCompleted
    ? typeof dateCompleted === "string"
      ? parseLocalDate(dateCompleted)
      : dateCompleted
    : startOfToday();
  if (end.getTime() < start.getTime()) return null;
  return differenceInCalendarDays(end, start) + 1;
};

export const getShopTimeLabel = (
  dateStarted: string | Date | null | undefined,
  dateCompleted: string | Date | null | undefined
): string | null => {
  const status = getMaintenanceStatus(dateStarted, dateCompleted);
  if (status === "Scheduled") return null;
  const days = getShopTimeDays(dateStarted, dateCompleted);
  if (days === null) return null;
  const unit = days === 1 ? "day" : "days";
  return status === "Completed" ? `Shop time: ${days} ${unit}` : `Shop time: ${days} ${unit} so far`;
};

/** Date used for costs, counters and history ordering. */
export const effectiveMaintenanceDate = <T extends string | Date>(
  dateStarted: T,
  dateCompleted: T | null | undefined
): T => (dateCompleted ?? dateStarted);
