import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import {
  GanttChartSquare,
  Calendar as CalendarIcon,
  ZoomIn,
  ZoomOut,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimelineEvents } from "@/hooks/useTimelineEvents";
import { countByCategory, TimelineCategory } from "@/lib/timelineEvents";
import { TimelineAxis } from "./TimelineAxis";
import { TimelineDetailList } from "./TimelineDetailList";
import {
  clampSpan,
  describeSpan,
  eventsInRange,
  DEFAULT_SPAN_DAYS,
  type TimelineCluster,
} from "./timelineScale";


export const TIMELINE_MIN_WIDTH = 900;

interface TimelinePanelProps {
  userId: string;
  aircraftId: string;
  onGoToCalendar: () => void;
}

function useIsNarrow(minWidth: number) {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < minWidth : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${minWidth - 1}px)`);
    const onChange = () => setIsNarrow(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [minWidth]);

  return isNarrow;
}

function TimelineRedirectCard({ onGoToCalendar }: { onGoToCalendar: () => void }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center py-8">
      <div className="w-full max-w-[420px] rounded-xl border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
          <GanttChartSquare className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">Timeline needs a larger screen</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The Timeline view relies on a wide horizontal axis. Rotate to landscape, or open it on a
          tablet or desktop.
        </p>
        <Button className="mt-5 w-full" onClick={onGoToCalendar}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          Go to Calendar view
        </Button>
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<TimelineCategory, string> = {
  maintenance: "Maintenance",
  directives: "Directives & bulletins",
  financial: "Financial",
  counters: "Counters",
};

const CATEGORY_COLORS: Record<TimelineCategory, string> = {
  maintenance: "hsl(var(--timeline-maintenance))",
  directives: "hsl(var(--timeline-directives))",
  financial: "hsl(var(--timeline-financial))",
  counters: "hsl(var(--timeline-counters))",
};

export function TimelinePanel({ userId, aircraftId, onGoToCalendar }: TimelinePanelProps) {
  const isNarrow = useIsNarrow(TIMELINE_MIN_WIDTH);
  const { events, loading, error, hasCounterHistory, utilization } = useTimelineEvents(
    userId,
    aircraftId
  );

  const [spanDays, setSpanDays] = useState(DEFAULT_SPAN_DAYS);
  const [center, setCenter] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<TimelineCluster | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const counts = useMemo(() => countByCategory(events), [events]);
  const visibleCounts = useMemo(() => {
    const half = spanDays / 2;
    const start = addDays(center, -half);
    const end = addDays(center, half);
    return countByCategory(eventsInRange(events, start, end));
  }, [events, center, spanDays]);
  const projectedCount = useMemo(
    () => events.filter((e) => e.confidence === "projected").length,
    [events]
  );

  const resetToToday = () => {
    setCenter(new Date());
    setSpanDays(DEFAULT_SPAN_DAYS);
  };

  if (isNarrow) {
    return <TimelineRedirectCard onGoToCalendar={onGoToCalendar} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Timeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every dated event on one axis, with today as the pivot. Read only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-xs text-muted-foreground">{describeSpan(spanDays)}</span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            onClick={() => setSpanDays((s) => clampSpan(s / 1.6))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            onClick={() => setSpanDays((s) => clampSpan(s * 1.6))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Back to today" onClick={resetToToday}>
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(CATEGORY_LABELS) as TimelineCategory[]).map((key) => (
          <div key={key} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[key] }}
              />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[key]}
              </p>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums">
                {loading ? "—" : visibleCounts[key]}
              </span>
              {!loading && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  / {counts[key]}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {loading ? "\u00A0" : "in view / total"}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex h-[290px] items-center justify-center">
            <p className="text-sm text-muted-foreground">Gathering your events…</p>
          </div>
        ) : error ? (
          <div className="flex h-[290px] items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="py-4">
            <TimelineAxis
              events={events}
              center={center}
              spanDays={spanDays}
              onCenterChange={setCenter}
              onSpanChange={setSpanDays}
              onSelect={setSelected}
              highlightEventId={hoveredEventId}
            />
            <p className="mt-3 px-4 text-xs text-muted-foreground">
              Drag to move through time, scroll to zoom, click a dot for details. Solid dots are
              recorded, outlined dots are scheduled, dashed dots are estimated.
            </p>
          </div>
        )}
      </div>

      {!loading && !error && (
        <TimelineDetailList
          events={events}
          hoveredId={hoveredEventId}
          onHoverEvent={setHoveredEventId}
          start={addDays(center, -spanDays / 2)}
          end={addDays(center, spanDays / 2)}
        />
      )}

      <p className="text-xs text-muted-foreground">
        {utilization.hoursPerMonth
          ? `${projectedCount} future item${projectedCount === 1 ? "" : "s"} estimated from flying about ${utilization.hoursPerMonth.toFixed(1)} hours a month${
              utilization.source === "override" ? " (your figure)" : ""
            }.`
          : hasCounterHistory
            ? "Counter readings do not yet show a usable flying rate, so hour-based items are not estimated."
            : "Not enough counter readings yet to estimate future hour-based due dates."}
      </p>
    </div>
  );
}


export default TimelinePanel;
