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

export type CounterChangeSource = "Dashboard" | "Maintenance Record";

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

  const logCounterHistory = async (newCounters: Partial<AircraftCounters>, source: CounterChangeSource) => {
    if (!userId || !aircraftId) return;
    
    // Merge current counters with new values
    const finalCounters = {
      hobbs: newCounters.hobbs ?? counters.hobbs,
      tach: newCounters.tach ?? counters.tach,
      airframe_total_time: newCounters.airframe_total_time ?? counters.airframe_total_time,
      engine_total_time: newCounters.engine_total_time ?? counters.engine_total_time,
      prop_total_time: newCounters.prop_total_time ?? counters.prop_total_time,
    };

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
      }]);

    if (error) {
      console.error("Error logging counter history:", error);
    }
  };

  const updateCounter = async (
    field: keyof Omit<AircraftCounters, "id">, 
    value: number, 
    source: CounterChangeSource = "Dashboard"
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

    // Log the history
    await logCounterHistory({ [field]: value }, source);

    setCounters((prev) => ({ ...prev, [field]: value }));
  };

  const updateAllCounters = async (
    newCounters: Partial<Omit<AircraftCounters, "id">>,
    source: CounterChangeSource = "Dashboard"
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

    // Log the history
    await logCounterHistory(newCounters, source);

    setCounters((prev) => ({ ...prev, ...newCounters }));
  };

  return { counters, loading, updateCounter, updateAllCounters, refetch: fetchCounters };
};
