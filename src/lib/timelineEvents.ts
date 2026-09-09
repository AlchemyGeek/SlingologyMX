import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/utils";

export type TimelineCategory = "maintenance" | "directives" | "financial" | "counters";

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
    default:
      return "maintenance";
  }
};

export interface TimelineEventsResult {
  events: TimelineEvent[];
  /** True when the aircraft has at least two counter history rows (needed for projection). */
  hasCounterHistory: boolean;
}

/**
 * Gathers every dated record for one aircraft into a single, sorted event list.
 * Read-only: no writes, no derived records.
 */
export async function fetchTimelineEvents(
  userId: string,
  aircraftId: string
): Promise<TimelineEventsResult> {
  const [logs, notifications, compliance, transactions, counters] = await Promise.all([
    supabase
      .from("maintenance_logs")
      .select("id, entry_title, category, subcategory, date_performed, total_cost")
      .eq("user_id", userId)
      .eq("aircraft_id", aircraftId),
    supabase
      .from("notifications")
      .select("id, description, type, initial_date, notification_basis, counter_type, is_completed")
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
  ]);

  const firstError =
    logs.error || notifications.error || compliance.error || transactions.error || counters.error;
  if (firstError) throw firstError;

  const events: TimelineEvent[] = [];

  (logs.data ?? []).forEach((row: any) => {
    const d = dateOnly(row.date_performed);
    if (!d) return;
    events.push(
      toEvent({
        source: "maintenance_log",
        recordId: row.id,
        category: "maintenance",
        confidence: "actual",
        title: row.entry_title,
        dateISO: d,
        subtitle: [row.category, row.subcategory].filter(Boolean).join(" · "),
        amount: row.total_cost !== null ? Number(row.total_cost) : null,
      })
    );
  });

  // Only date-based notifications land on the axis; counter-based ones are projected later.
  (notifications.data ?? []).forEach((row: any) => {
    if (row.notification_basis === "Counter" || row.counter_type) return;
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
        title: "Counter reading",
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

  events.sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));

  return { events, hasCounterHistory: counterRows.length >= 2 };
}

export function countByCategory(events: TimelineEvent[]): Record<TimelineCategory, number> {
  const counts: Record<TimelineCategory, number> = {
    maintenance: 0,
    directives: 0,
    financial: 0,
    counters: 0,
  };
  events.forEach((e) => {
    counts[e.category] += 1;
  });
  return counts;
}
