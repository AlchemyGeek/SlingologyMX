import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type TtTrackingMode = 'hobbs' | 'tach' | 'manual';

export interface Aircraft {
  id: string;
  user_id: string;
  registration: string;
  model_make: string | null;
  is_primary: boolean;
  airframe_tt_mode: TtTrackingMode;
  engine_tt_mode: TtTrackingMode;
  prop_tt_mode: TtTrackingMode;
  initial_hobbs: number | null;
  initial_tach: number | null;
  initial_airframe_total_time: number | null;
  initial_engine_total_time: number | null;
  initial_prop_total_time: number | null;
  created_at: string;
  updated_at: string;
}

interface AircraftContextType {
  aircraft: Aircraft[];
  selectedAircraft: Aircraft | null;
  loading: boolean;
  selectAircraft: (aircraftId: string) => void;
  refetchAircraft: () => Promise<void>;
  canAddMore: boolean;
  maxAircraft: number;
}

const AircraftContext = createContext<AircraftContextType | undefined>(undefined);

const MAX_AIRCRAFT = 4;
const SELECTED_AIRCRAFT_KEY = "selectedAircraftId";

export function AircraftProvider({ children, user }: { children: ReactNode; user: User | null }) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(() => {
    // Try to restore from localStorage
    return localStorage.getItem(SELECTED_AIRCRAFT_KEY);
  });
  const [loading, setLoading] = useState(true);

  const fetchAircraft = useCallback(async () => {
    if (!user?.id) {
      setAircraft([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("aircraft")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching aircraft:", error);
      setAircraft([]);
    } else {
      setAircraft((data || []).map(d => ({
        ...d,
        airframe_tt_mode: d.airframe_tt_mode as TtTrackingMode,
        engine_tt_mode: d.engine_tt_mode as TtTrackingMode,
        prop_tt_mode: d.prop_tt_mode as TtTrackingMode,
      })));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAircraft();
  }, [fetchAircraft]);

  // Auto-select primary aircraft if none selected or selection is invalid
  useEffect(() => {
    if (loading) return;

    const currentSelection = aircraft.find((a) => a.id === selectedAircraftId);
    
    if (!currentSelection && aircraft.length > 0) {
      // Select primary aircraft or first one
      const primaryAircraft = aircraft.find((a) => a.is_primary) || aircraft[0];
      setSelectedAircraftId(primaryAircraft.id);
      localStorage.setItem(SELECTED_AIRCRAFT_KEY, primaryAircraft.id);
    }
  }, [aircraft, selectedAircraftId, loading]);

  const selectAircraft = useCallback((aircraftId: string) => {
    setSelectedAircraftId(aircraftId);
    localStorage.setItem(SELECTED_AIRCRAFT_KEY, aircraftId);
  }, []);

  const selectedAircraft = aircraft.find((a) => a.id === selectedAircraftId) || null;

  return (
    <AircraftContext.Provider
      value={{
        aircraft,
        selectedAircraft,
        loading,
        selectAircraft,
        refetchAircraft: fetchAircraft,
        canAddMore: aircraft.length < MAX_AIRCRAFT,
        maxAircraft: MAX_AIRCRAFT,
      }}
    >
      {children}
    </AircraftContext.Provider>
  );
}

export function useAircraft() {
  const context = useContext(AircraftContext);
  if (context === undefined) {
    throw new Error("useAircraft must be used within an AircraftProvider");
  }
  return context;
}
