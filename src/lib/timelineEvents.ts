import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/utils";
import { getMaintenanceStatus } from "@/lib/maintenanceStatus";
import {
  computeUtilizationRate,
  projectDueEvents,
  type CounterReading,
  type HourDueCandidate,
  type UtilizationRate,
} from "@/lib/timelineProjection";

export type TimelineCategory = "maintenance" | "directives" | "financial" | "counters" | "other";

/** How certain the date is: recorded fact, scheduled item, or projected estimate. */
export type TimelineConfidence = "actual" | "scheduled" | "projected";

export type TimelineSource =
  | "maintenance_log"
  | "notification"
  | "directive_compliance"
  | "transaction"
  | "counter_history";

export interface TimelineEvent {
  /** Stable id: `${source}:${recordId}` */
  id: string;
  recordId: string;
  source: TimelineSource;
  category: TimelineCategory;
  confidence: TimelineConfidence;
  title: string;
  /** Local midnight of the event date. */
  date: Date;
  /** ISO YYYY-MM-DD */
  dateISO: string;
  subtitle?: string;
  amount?: number | null;
  /** Optional span end for duration events (e.g. maintenance shop time). */
  endDate?: Date | null;
  endDateISO?: string | null;
  /** True when the span has no recorded end yet (still in the shop). */
  openEnded?: boolean;
  meta?: Record<string, unknown>;
}

const dateOnly = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return value.split("T")[0];
};

function toEvent(params: {
  source: TimelineSource;
  recordId: string;
  category: TimelineCategory;
  confidence: TimelineConfidence;
  title: string;
  dateISO: string;
  endDateISO?: string | null;
  openEnded?: boolean;
  subtitle?: string;
  amount?: number | null;
  meta?: Record<string, unknown>;
}): TimelineEvent {
  return {
    id: `${params.source}:${params.recordId}`,
    recordId: params.recordId,
    source: params.source,
    category: params.category,
    confidence: params.confidence,
    title: params.title,
    date: parseLocalDate(params.dateISO),
    dateISO: params.dateISO,
    endDate: params.endDateISO ? parseLocalDate(params.endDateISO) : null,
    endDateISO: params.endDateISO ?? null,
    openEnded: params.openEnded ?? false,
    subtitle: params.subtitle,
    amount: params.amount ?? null,
    meta: params.meta,
  };
}

const notificationCategory = (type: string | null): TimelineCategory => {
  switch (type) {
    case "Directives":
      return "directives";
    case "Subscription":
      return "financial";
    case "Other":
      return "other";
    default:
      return "maintenance";
  }
};

export interface TimelineEventsResult {
  events: TimelineEvent[];
  /** True when the aircraft has at least two counter history rows (needed for projection). */
  hasCounterHistory: boolean;
  /** Flying rate used to place hour-based due items on the axis. */
  utilization: UtilizationRate;
  counterReadings: CounterReading[];
}

/**
 * Gathers every dated record for one aircraft into a single, sorted event list,
 * then places hour-based due items using the flying rate.
 * Read-only: no writes, no derived records.
 */
export async function fetchTimelineEvents(
  userId: string,
  aircraftId: string
): Promise<TimelineEventsResult> {
  const [logs, notifications, compliance, transactions, counters, directiveStatus, currentCountersRes, aircraftRes] =
    await Promise.all([
      supabase
        .from("maintenance_logs")
        .select(
          "id, entry_title, category, subcategory, date_started, date_completed, total_cost, is_recurring_task, next_due_hours, next_due_date, recurrence_counter_type"
        )
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId),
      supabase
        .from("notifications")
        .select(
          "id, description, type, initial_date, notification_basis, counter_type, initial_counter_value, is_completed, maintenance_log_id"
        )
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .eq("is_completed", false),
      supabase
        .from("maintenance_directive_compliance")
        .select("id, directive_id, compliance_status, compliance_date, directives(directive_code, title)")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId),
      supabase
        .from("transactions")
        .select("id, title, transaction_date, amount, currency, direction, category, status")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId),
      supabase
        .from("aircraft_counter_history")
        .select("id, change_date, hobbs, tach, airframe_total_time, engine_total_time, prop_total_time, source")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId),
      supabase
        .from("aircraft_directive_status")
        .select(
          "id, directive_id, compliance_status, next_due_date, next_due_tach, next_due_counter_type, archived, directives(directive_code, title)"
        )
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .eq("archived", false),
      supabase
        .from("aircraft_counters")
        .select("hobbs, tach, airframe_total_time, engine_total_time, prop_total_time")
        .eq("aircraft_id", aircraftId)
        .maybeSingle(),
      supabase.from("aircraft").select("*").eq("id", aircraftId).maybeSingle(),
    ]);

  const firstError =
    logs.error ||
    notifications.error ||
    compliance.error ||
    transactions.error ||
    counters.error ||
    directiveStatus.error;
  if (firstError) throw firstError;

  const events: TimelineEvent[] = [];

  const todayISO = new Date().toISOString().split("T")[0];

  (logs.data ?? []).forEach((row: any) => {
    const start = dateOnly(row.date_started);
    if (!start) return;
    const end = dateOnly(row.date_completed);
    const status = getMaintenanceStatus(row.date_started, row.date_completed);
    // Open-ended spans (no completion yet) run to today; future work starts as a point.
    const spanEnd = end ?? (status === "In Progress" ? todayISO : null);
    const statusLabel = status === "Completed" ? null : status;
    events.push(
      toEvent({
        source: "maintenance_log",
        recordId: row.id,
        category: "maintenance",
        confidence: status === "Scheduled" ? "scheduled" : "actual",
        title: row.entry_title,
        dateISO: start,
        endDateISO: spanEnd && spanEnd !== start ? spanEnd : null,
        openEnded: !end,
        subtitle: [statusLabel, row.category, row.subcategory].filter(Boolean).join(" · "),
        amount: row.total_cost !== null ? Number(row.total_cost) : null,
      })
    );
  });

  // Only date-based notifications land on the axis; counter-based ones are projected later.
  (notifications.data ?? []).forEach((row: any) => {
    if (row.notification_basis === "Counter" || row.counter_type) return;
    // The auto-created reminder for a scheduled maintenance job duplicates the job
    // itself, which is already drawn from maintenance_logs.
    if (row.maintenance_log_id && String(row.description ?? "").startsWith("Scheduled maintenance: ")) return;
    const d = dateOnly(row.initial_date);
    if (!d) return;
    events.push(
      toEvent({
        source: "notification",
        recordId: row.id,
        category: notificationCategory(row.type),
        confidence: "scheduled",
        title: row.description,
        dateISO: d,
        subtitle: row.type ? `${row.type} due` : "Due",
      })
    );
  });

  (compliance.data ?? []).forEach((row: any) => {
    const d = dateOnly(row.compliance_date);
    if (!d) return;
    const directive = row.directives;
    const code = directive?.directive_code ? `${directive.directive_code} — ` : "";
    events.push(
      toEvent({
        source: "directive_compliance",
        recordId: row.id,
        category: "directives",
        confidence: "actual",
        title: `${code}${directive?.title ?? "Compliance"}`,
        dateISO: d,
        subtitle: row.compliance_status ?? undefined,
        meta: { directiveId: row.directive_id },
      })
    );
  });

  (transactions.data ?? []).forEach((row: any) => {
    const d = dateOnly(row.transaction_date);
    if (!d) return;
    if (row.status === "Voided" || row.status === "Skipped") return;
    events.push(
      toEvent({
        source: "transaction",
        recordId: row.id,
        category: "financial",
        confidence: row.status === "Posted" ? "actual" : "scheduled",
        title: row.title,
        dateISO: d,
        subtitle: [row.category, row.status].filter(Boolean).join(" · "),
        amount: row.amount !== null ? Number(row.amount) : null,
        meta: { direction: row.direction, currency: row.currency },
      })
    );
  });

  const counterRows = (counters.data ?? []).slice();
  counterRows.forEach((row: any) => {
    const d = dateOnly(row.change_date);
    if (!d) return;
    const readings = [
      row.hobbs !== null ? `Hobbs ${Number(row.hobbs)}` : null,
      row.tach !== null ? `Tach ${Number(row.tach)}` : null,
    ].filter(Boolean);
    events.push(
      toEvent({
        source: "counter_history",
        recordId: row.id,
        category: "counters",
        confidence: "actual",
        title: "Aircraft counters updated",
        dateISO: d,
        subtitle: readings.length ? readings.join(" · ") : (row.source ?? undefined),
        meta: {
          hobbs: row.hobbs,
          tach: row.tach,
          airframe_total_time: row.airframe_total_time,
          engine_total_time: row.engine_total_time,
          prop_total_time: row.prop_total_time,
          source: row.source,
        },
      })
    );
  });

  // ---- Hour-based due items, placed by projection ----
  const readings: CounterReading[] = counterRows
    .map((row: any) => ({
      dateISO: dateOnly(row.change_date) ?? "",
      values: {
        hobbs: row.hobbs !== null ? Number(row.hobbs) : null,
        tach: row.tach !== null ? Number(row.tach) : null,
        airframe_total_time:
          row.airframe_total_time !== null ? Number(row.airframe_total_time) : null,
        engine_total_time: row.engine_total_time !== null ? Number(row.engine_total_time) : null,
        prop_total_time: row.prop_total_time !== null ? Number(row.prop_total_time) : null,
      },
    }))
    .filter((r) => r.dateISO);

  const aircraftRow: any = aircraftRes.data ?? null;
  const override =
    aircraftRow && typeof aircraftRow.utilization_hours_per_month === "number"
      ? Number(aircraftRow.utilization_hours_per_month)
      : null;

  const current: any = currentCountersRes.data ?? {};
  const currentCounters = {
    hobbs: current.hobbs !== null && current.hobbs !== undefined ? Number(current.hobbs) : null,
    tach: current.tach !== null && current.tach !== undefined ? Number(current.tach) : null,
    airframe_total_time:
      current.airframe_total_time != null ? Number(current.airframe_total_time) : null,
    engine_total_time: current.engine_total_time != null ? Number(current.engine_total_time) : null,
    prop_total_time: current.prop_total_time != null ? Number(current.prop_total_time) : null,
  };

  const utilization = computeUtilizationRate(readings, "tach", override);

  const candidates: HourDueCandidate[] = [];

  (notifications.data ?? []).forEach((row: any) => {
    if (row.notification_basis !== "Counter" && !row.counter_type) return;
    candidates.push({
      recordId: row.id,
      source: "notification",
      category: notificationCategory(row.type),
      title: row.description,
      counterLabel: row.counter_type ?? null,
      targetValue: row.initial_counter_value !== null ? Number(row.initial_counter_value) : null,
      dueDateISO: null,
    });
  });

  (logs.data ?? []).forEach((row: any) => {
    if (!row.is_recurring_task) return;
    if (row.next_due_hours === null && !row.next_due_date) return;
    candidates.push({
      recordId: `${row.id}:next`,
      source: "maintenance_log",
      category: "maintenance",
      title: `${row.entry_title} — next due`,
      counterLabel: row.recurrence_counter_type ?? "Tach",
      targetValue: row.next_due_hours !== null ? Number(row.next_due_hours) : null,
      dueDateISO: dateOnly(row.next_due_date),
      subtitle: "Recurring maintenance",
      meta: { maintenanceLogId: row.id },
    });
  });

  (directiveStatus.data ?? []).forEach((row: any) => {
    if (row.next_due_tach === null && !row.next_due_date) return;
    const directive = row.directives;
    const code = directive?.directive_code ? `${directive.directive_code} — ` : "";
    candidates.push({
      recordId: `${row.id}:next`,
      source: "directive_compliance",
      category: "directives",
      title: `${code}${directive?.title ?? "Directive"} — next due`,
      counterLabel: row.next_due_counter_type ?? "Tach",
      targetValue: row.next_due_tach !== null ? Number(row.next_due_tach) : null,
      dueDateISO: dateOnly(row.next_due_date),
      subtitle: row.compliance_status ?? undefined,
      meta: { directiveId: row.directive_id },
    });
  });

  events.push(...projectDueEvents(candidates, readings, currentCounters, utilization));

  events.sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));

  return {
    events,
    hasCounterHistory: counterRows.length >= 2,
    utilization,
    counterReadings: readings,
  };
}

export function countByCategory(events: TimelineEvent[]): Record<TimelineCategory, number> {
  const counts: Record<TimelineCategory, number> = {
    maintenance: 0,
    directives: 0,
    financial: 0,
    counters: 0,
    other: 0,
  };
  events.forEach((e) => {
    counts[e.category] += 1;
  });
  return counts;
}
