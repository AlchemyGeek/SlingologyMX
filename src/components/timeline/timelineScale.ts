import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { TimelineEvent } from "@/lib/timelineEvents";

export const MIN_SPAN_DAYS = 7;
export const MAX_SPAN_DAYS = 2200;
export const DEFAULT_SPAN_DAYS = 183;
/** Minimum horizontal gap between two markers before they merge into a cluster. */
export const CLUSTER_GAP_PX = 26;

export interface TimelineScale {
  start: Date;
  end: Date;
  width: number;
  spanDays: number;
  /** Pixels for a given date. */
  x: (date: Date) => number;
  /** Date for a given pixel offset. */
  dateAt: (px: number) => Date;
}

export function createScale(center: Date, spanDays: number, width: number): TimelineScale {
  const half = spanDays / 2;
  const start = addDays(center, -half);
  const end = addDays(center, half);
  const ms = end.getTime() - start.getTime();
  return {
    start,
    end,
    width,
    spanDays,
    x: (date: Date) => ((date.getTime() - start.getTime()) / ms) * width,
    dateAt: (px: number) => new Date(start.getTime() + (px / width) * ms),
  };
}

export interface TimelineTick {
  date: Date;
  x: number;
  label: string;
  major: boolean;
}

export function buildTicks(scale: TimelineScale): TimelineTick[] {
  const { start, end, spanDays } = scale;
  const ticks: TimelineTick[] = [];

  const push = (date: Date, label: string, major: boolean) => {
    if (date < start || date > end) return;
    ticks.push({ date, x: scale.x(date), label, major });
  };

  if (spanDays <= 21) {
    let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cursor <= end) {
      push(cursor, format(cursor, "d MMM"), cursor.getDate() === 1);
      cursor = addDays(cursor, 1);
    }
  } else if (spanDays <= 120) {
    let cursor = startOfWeek(start, { weekStartsOn: 1 });
    while (cursor <= end) {
      push(cursor, format(cursor, "d MMM"), cursor.getDate() <= 7);
      cursor = addDays(cursor, 7);
    }
  } else if (spanDays <= 800) {
    let cursor = startOfMonth(start);
    while (cursor <= end) {
      push(cursor, format(cursor, cursor.getMonth() === 0 ? "MMM yyyy" : "MMM"), cursor.getMonth() === 0);
      cursor = addMonths(cursor, 1);
    }
  } else {
    let cursor = startOfMonth(start);
    // snap to a quarter boundary
    cursor = addMonths(cursor, (3 - (cursor.getMonth() % 3)) % 3);
    while (cursor <= end) {
      const isYear = cursor.getMonth() === 0;
      push(cursor, isYear ? format(cursor, "yyyy") : format(cursor, "MMM"), isYear);
      cursor = addMonths(cursor, 3);
    }
  }

  return ticks;
}

export interface TimelineCluster {
  id: string;
  x: number;
  date: Date;
  events: TimelineEvent[];
}

/** Groups events on one lane whose markers would overlap. Input need not be sorted. */
export function clusterEvents(
  events: TimelineEvent[],
  scale: TimelineScale,
  gap = CLUSTER_GAP_PX
): TimelineCluster[] {
  const placed = events
    .map((event) => ({ event, x: scale.x(event.date) }))
    .filter((item) => item.x >= -gap && item.x <= scale.width + gap)
    .sort((a, b) => a.x - b.x);

  const clusters: TimelineCluster[] = [];
  placed.forEach(({ event, x }) => {
    const last = clusters[clusters.length - 1];
    if (last && x - last.x < gap) {
      last.events.push(event);
      return;
    }
    clusters.push({ id: event.id, x, date: event.date, events: [event] });
  });
  return clusters;
}

export function clampSpan(days: number): number {
  return Math.min(MAX_SPAN_DAYS, Math.max(MIN_SPAN_DAYS, Math.round(days)));
}

export function describeSpan(days: number): string {
  if (days <= 31) return `${days} days`;
  if (days <= 400) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(days >= 730 ? 0 : 1)} years`;
}

export function eventsInRange(events: TimelineEvent[], start: Date, end: Date): TimelineEvent[] {
  return events.filter((e) => e.date >= start && e.date <= end);
}

export const daysBetween = differenceInCalendarDays;
export const yearStart = startOfYear;
export const monthEnd = endOfMonth;
