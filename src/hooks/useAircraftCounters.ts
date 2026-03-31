import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NumericCounterKey = "hobbs" | "tach" | "airframe_total_time" | "engine_total_time" | "prop_total_time";

export interface AircraftCounters {
  id?: string;
  hobbs: number | null;
  tach: number | null;
  airframe_total_time: number | null;
  engine_total_time: number | null;
  prop_total_time: number | null;
  isInitialized: boolean;
}

const defaultCounters: AircraftCounters = {
  hobbs: null,
  tach: null,
  airframe_total_time: null,
  engine_total_time: null,
  prop_total_time: null,
  isInitialized: false,
};

export type CounterChangeSource = "Dashboard" | "Maintenance Record" | "Profile";

export const useAircraftCounters = (userId: string, aircraftId: string | undefined) => {
  const [counters, setCounters] = useState<AircraftCounters>(defaultCounters);
  const [loading, setLoading] = useState(true);

  const fetchCounters = useCallback(async () => {
    if (!userId || !aircraftId) {
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("aircraft_counters")
      .select("*")
      .eq("aircraft_id", aircraftId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching counters:", error);
      setLoading(false);
      return;
    }

    if (data) {
      // Check if any counter has been set (non-null and non-zero means initialized)
      // Or check if there's any history for this aircraft
      const { count: historyCount } = await supabase
        .from("aircraft_counter_history")
        .select("*", { count: "exact", head: true })
        .eq("aircraft_id", aircraftId);

      const hasHistory = (historyCount ?? 0) > 0;
      const hasNonZeroValues = 
        (data.hobbs !== null && data.hobbs > 0) ||
        (data.tach !== null && data.tach > 0) ||
        (data.airframe_total_time !== null && data.airframe_total_time > 0) ||
        (data.engine_total_time !== null && data.engine_total_time > 0) ||
        (data.prop_total_time !== null && data.prop_total_time > 0);

      const isInitialized = hasHistory || hasNonZeroValues;

      setCounters({
        id: data.id,
        hobbs: data.hobbs !== null ? Number(data.hobbs) : null,
        tach: data.tach !== null ? Number(data.tach) : null,
        airframe_total_time: data.airframe_total_time !== null ? Number(data.airframe_total_time) : null,
        engine_total_time: data.engine_total_time !== null ? Number(data.engine_total_time) : null,
        prop_total_time: data.prop_total_time !== null ? Number(data.prop_total_time) : null,
        isInitialized,
      });
    } else {
      // Create initial counters record for this aircraft
      const { data: newData, error: insertError } = await supabase
        .from("aircraft_counters")
        .insert([{ user_id: userId, aircraft_id: aircraftId }])
        .select()
        .single();

      if (!insertError && newData) {
        setCounters({
          id: newData.id,
          hobbs: null,
          tach: null,
          airframe_total_time: null,
          engine_total_time: null,
          prop_total_time: null,
          isInitialized: false,
        });
      }
    }
    setLoading(false);
  }, [userId, aircraftId]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  const logCounterHistory = async (
    newCounters: Partial<Pick<AircraftCounters, NumericCounterKey>>, 
    source: CounterChangeSource,
    changeDate?: Date,
    allCounterValues?: Partial<Pick<AircraftCounters, NumericCounterKey>>
  ) => {
    if (!userId || !aircraftId) return;
    
    // If allCounterValues is provided (e.g., from maintenance form), use those values
    // Otherwise, merge with current global counters
    const finalCounters = allCounterValues ? {
      hobbs: allCounterValues.hobbs ?? null,
      tach: allCounterValues.tach ?? null,
      airframe_total_time: allCounterValues.airframe_total_time ?? null,
      engine_total_time: allCounterValues.engine_total_time ?? null,
      prop_total_time: allCounterValues.prop_total_time ?? null,
    } : {
      hobbs: newCounters.hobbs ?? counters.hobbs,
      tach: newCounters.tach ?? counters.tach,
      airframe_total_time: newCounters.airframe_total_time ?? counters.airframe_total_time,
      engine_total_time: newCounters.engine_total_time ?? counters.engine_total_time,
      prop_total_time: newCounters.prop_total_time ?? counters.prop_total_time,
    };

    // Format the change date for insertion
    const formattedDate = changeDate 
      ? `${changeDate.getFullYear()}-${String(changeDate.getMonth() + 1).padStart(2, "0")}-${String(changeDate.getDate()).padStart(2, "0")}`
      : new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("aircraft_counter_history")
      .insert([{
        user_id: userId,
        aircraft_id: aircraftId,
        hobbs: finalCounters.hobbs,
        tach: finalCounters.tach,
        airframe_total_time: finalCounters.airframe_total_time,
        engine_total_time: finalCounters.engine_total_time,
        prop_total_time: finalCounters.prop_total_time,
        source,
        change_date: formattedDate,
      }]);

    if (error) {
      console.error("Error logging counter history:", error);
    }
  };

  const updateCounter = async (
    field: NumericCounterKey, 
    value: number, 
    source: CounterChangeSource = "Dashboard",
    changeDate?: Date
  ) => {
    if (!counters.id) return;

    const { error } = await supabase
      .from("aircraft_counters")
      .update({ [field]: value })
      .eq("id", counters.id);

    if (error) {
      console.error("Error updating counter:", error);
      throw error;
    }

    // Log the history with optional date
    await logCounterHistory({ [field]: value }, source, changeDate);

    setCounters((prev) => ({ ...prev, [field]: value, isInitialized: true }));
  };

  const updateAllCounters = async (
    newCounters: Partial<Pick<AircraftCounters, NumericCounterKey>>,
    source: CounterChangeSource = "Dashboard",
    changeDate?: Date,
    allCounterValuesForHistory?: Partial<Pick<AircraftCounters, NumericCounterKey>>
  ) => {
    if (!counters.id) return;

    const { error } = await supabase
      .from("aircraft_counters")
      .update(newCounters)
      .eq("id", counters.id);

    if (error) {
      console.error("Error updating counters:", error);
      throw error;
    }

    // Log the history with optional date
    // If allCounterValuesForHistory is provided (from maintenance form), use those for the history log
    await logCounterHistory(newCounters, source, changeDate, allCounterValuesForHistory);

    setCounters((prev) => ({ ...prev, ...newCounters, isInitialized: true }));
  };

  return { counters, loading, updateCounter, updateAllCounters, refetch: fetchCounters };
};
