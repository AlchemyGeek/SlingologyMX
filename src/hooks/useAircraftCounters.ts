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

export const useAircraftCounters = (userId: string) => {
  const [counters, setCounters] = useState<AircraftCounters>(defaultCounters);
  const [loading, setLoading] = useState(true);

  const fetchCounters = useCallback(async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from("aircraft_counters")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching counters:", error);
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
      // Create initial counters record
      const { data: newData, error: insertError } = await supabase
        .from("aircraft_counters")
        .insert([{ user_id: userId }])
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
  }, [userId]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  const updateCounter = async (field: keyof Omit<AircraftCounters, "id">, value: number) => {
    if (!counters.id) return;

    const { error } = await supabase
      .from("aircraft_counters")
      .update({ [field]: value })
      .eq("id", counters.id);

    if (error) {
      console.error("Error updating counter:", error);
      throw error;
    }

    setCounters((prev) => ({ ...prev, [field]: value }));
  };

  return { counters, loading, updateCounter, refetch: fetchCounters };
};
