import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AircraftCounters {
  id?: string;
  hobbs: number;
  tach: number;
  airframe_total_time: number;
  engine_total_time: number;
  prop_total_time: number;
}

const defaultCounters: AircraftCounters = {
  hobbs: 0,
  tach: 0,
  airframe_total_time: 0,
  engine_total_time: 0,
  prop_total_time: 0,
};

export type CounterChangeSource = "Dashboard" | "Maintenance";

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
      setCounters({
        id: data.id,
        hobbs: Number(data.hobbs) || 0,
        tach: Number(data.tach) || 0,
        airframe_total_time: Number(data.airframe_total_time) || 0,
        engine_total_time: Number(data.engine_total_time) || 0,
        prop_total_time: Number(data.prop_total_time) || 0,
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
          hobbs: 0,
          tach: 0,
          airframe_total_time: 0,
          engine_total_time: 0,
          prop_total_time: 0,
        });
      }
    }
    setLoading(false);
  }, [userId, aircraftId]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  const logCounterHistory = async (
    newCounters: Partial<AircraftCounters>, 
    source: CounterChangeSource,
    changeDate?: Date,
    allCounterValues?: Partial<AircraftCounters>
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
    field: keyof Omit<AircraftCounters, "id">, 
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

    setCounters((prev) => ({ ...prev, [field]: value }));
  };

  const updateAllCounters = async (
    newCounters: Partial<Omit<AircraftCounters, "id">>,
    source: CounterChangeSource = "Dashboard",
    changeDate?: Date,
    allCounterValuesForHistory?: Partial<AircraftCounters>
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

    setCounters((prev) => ({ ...prev, ...newCounters }));
  };

  return { counters, loading, updateCounter, updateAllCounters, refetch: fetchCounters };
};
