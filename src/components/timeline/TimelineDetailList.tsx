import { format } from "date-fns";
import type { TimelineEvent, TimelineCategory } from "@/lib/timelineEvents";

const CATEGORY_LABELS: Record<TimelineCategory, string> = {
  maintenance: "Maintenance",
  directives: "Directives",
  financial: "Financial",
  counters: "Counters",
};

const CATEGORY_COLORS: Record<TimelineCategory, string> = {
  maintenance: "hsl(var(--timeline-maintenance))",
  directives: "hsl(var(--timeline-directives))",
  financial: "hsl(var(--timeline-financial))",
  counters: "hsl(var(--timeline-counters))",
};

const CONFIDENCE_LABELS: Record<TimelineEvent["confidence"], string> = {
  actual: "Recorded",
  scheduled: "Scheduled",
  projected: "Estimated",
};

/** Show at most this many rows before asking the user to zoom in. */
export const DETAIL_LIST_CAP = 60;

interface TimelineDetailListProps {
  events: TimelineEvent[];
  hoveredId: string | null;
  onHoverEvent: (id: string | null) => void;
  start: Date;
  end: Date;
  onOpenRecord?: (event: TimelineEvent) => void;
}

export function TimelineDetailList({
  events,
  hoveredId,
  onHoverEvent,
  start,
  end,
  onOpenRecord,
}: TimelineDetailListProps) {
  const visible = events
    .filter((e) => e.date >= start && e.date <= end)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">In view</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {format(start, "d MMM yyyy")} – {format(end, "d MMM yyyy")} · {visible.length} item
          {visible.length === 1 ? "" : "s"}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing in this window. Drag or zoom the axis to explore another period.
        </p>
      ) : visible.length > DETAIL_LIST_CAP ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          {visible.length} items in view — zoom in to browse them as a list.
        </p>
      ) : (
        <ul className="max-h-72 divide-y overflow-y-auto">
          {visible.map((event) => (
            <li
              key={event.id}
              role={onOpenRecord ? "button" : undefined}
              tabIndex={onOpenRecord ? 0 : undefined}
              className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                hoveredId === event.id ? "bg-muted/70" : "hover:bg-muted/40"
              } ${onOpenRecord ? "cursor-pointer" : ""}`}
              onMouseEnter={() => onHoverEvent(event.id)}
              onMouseLeave={() => onHoverEvent(null)}
              onClick={() => onOpenRecord?.(event)}
              onKeyDown={(e) => {
                if (onOpenRecord && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onOpenRecord(event);
                }
              }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[event.category] }}
              />
              <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
                {format(event.date, "d MMM yy")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{event.title}</span>
                {event.subtitle && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {event.subtitle}
                  </span>
                )}
              </span>
              <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                {CATEGORY_LABELS[event.category]}
              </span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                  event.confidence === "projected"
                    ? "border-dashed text-muted-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {CONFIDENCE_LABELS[event.confidence]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TimelineDetailList;
