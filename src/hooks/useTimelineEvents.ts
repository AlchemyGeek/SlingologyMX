import { useCallback, useEffect, useState } from "react";
import { fetchTimelineEvents, TimelineEvent } from "@/lib/timelineEvents";
import type { UtilizationRate } from "@/lib/timelineProjection";

const NO_RATE: UtilizationRate = {
  hoursPerMonth: null,
  hoursPerDay: null,
  source: "none",
  windowDays: 0,
  counterField: "tach",
};

export function useTimelineEvents(userId: string, aircraftId: string, refreshKey?: number) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [utilization, setUtilization] = useState<UtilizationRate>(NO_RATE);
  const [hasCounterHistory, setHasCounterHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !aircraftId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTimelineEvents(userId, aircraftId);
      setEvents(result.events);
      setUtilization(result.utilization);
      setHasCounterHistory(result.hasCounterHistory);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load timeline data");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [userId, aircraftId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return { events, hasCounterHistory, loading, error, refetch: load };
}
