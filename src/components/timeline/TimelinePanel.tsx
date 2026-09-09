import { useEffect, useState } from "react";
import { GanttChartSquare, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <p className="mt-3 font-mono text-xs text-muted-foreground">min width 900px</p>
      </div>
    </div>
  );
}

export function TimelinePanel({ userId, aircraftId, onGoToCalendar }: TimelinePanelProps) {
  const isNarrow = useIsNarrow(TIMELINE_MIN_WIDTH);

  if (isNarrow) {
    return <TimelineRedirectCard onGoToCalendar={onGoToCalendar} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Timeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every dated event on one axis, with today as the pivot. Read only.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex h-[290px] items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground">
            The timeline axis will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TimelinePanel;
