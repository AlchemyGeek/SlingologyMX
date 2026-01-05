import { supabase } from "@/integrations/supabase/client";

export interface CounterHistoryEntry {
  id: string;
  change_date: string;
  hobbs: number | null;
  tach: number | null;
  airframe_total_time: number | null;
  engine_total_time: number | null;
  prop_total_time: number | null;
}

export interface CounterUpdates {
  hobbs?: number;
  tach?: number;
  airframe_total_time?: number;
  engine_total_time?: number;
  prop_total_time?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

type CounterKey = "hobbs" | "tach" | "airframe_total_time" | "engine_total_time" | "prop_total_time";

const counterDisplayNames: Record<CounterKey, string> = {
  hobbs: "Hobbs",
  tach: "Tach",
  airframe_total_time: "Airframe TT",
  engine_total_time: "Engine TT",
  prop_total_time: "Prop TT",
};

/**
 * Validates counter updates based on the maintenance date and existing counter history.
 * 
 * Rules:
 * 1. If maintenance date is after the latest history entry: new values must be >= latest values
 * 2. If maintenance date is before the latest history entry: new values must be between
 *    the values of adjacent history entries (before and after the maintenance date)
 */
export async function validateCounterUpdates(
  aircraftId: string,
  maintenanceDate: Date,
  updates: CounterUpdates
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // Fetch all counter history entries ordered by date
  const { data: history, error } = await supabase
    .from("aircraft_counter_history")
    .select("id, change_date, hobbs, tach, airframe_total_time, engine_total_time, prop_total_time")
    .eq("aircraft_id", aircraftId)
    .order("change_date", { ascending: true });
  
  if (error) {
    console.error("Error fetching counter history:", error);
    return { isValid: false, errors: ["Failed to validate counters. Please try again."] };
  }
  
  // If no history exists, any value is valid
  if (!history || history.length === 0) {
    return { isValid: true, errors: [] };
  }
  
  const maintenanceDateStr = formatDateForComparison(maintenanceDate);
  
  // Find entries before and after the maintenance date
  const entriesBefore = history.filter(h => h.change_date < maintenanceDateStr);
  const entriesAfter = history.filter(h => h.change_date > maintenanceDateStr);
  const entriesOnSameDate = history.filter(h => h.change_date === maintenanceDateStr);
  
  const latestEntry = history[history.length - 1];
  const latestDateStr = latestEntry.change_date;
  
  // Validate each counter being updated
  const counterKeys: CounterKey[] = ["hobbs", "tach", "airframe_total_time", "engine_total_time", "prop_total_time"];
  
  for (const key of counterKeys) {
    const newValue = updates[key];
    if (newValue === undefined) continue;
    
    if (maintenanceDateStr >= latestDateStr) {
      // Case 1: Maintenance date is on or after the latest history entry
      // New value must be >= the latest value
      const latestValue = latestEntry[key] ?? 0;
      
      if (newValue < latestValue) {
        errors.push(
          `${counterDisplayNames[key]}: Value ${newValue} is less than the latest recorded value (${latestValue} on ${formatDisplayDate(latestEntry.change_date)}). New value must be >= ${latestValue}.`
        );
      }
    } else {
      // Case 2: Maintenance date is before the latest history entry
      // Find the bounds: closest entry before and after the maintenance date
      const entryBefore = entriesBefore.length > 0 ? entriesBefore[entriesBefore.length - 1] : null;
      const entryAfter = entriesAfter.length > 0 ? entriesAfter[0] : null;
      
      // For entries on the same date, we need to be <= their value
      const entrySameDate = entriesOnSameDate.length > 0 ? entriesOnSameDate[0] : null;
      
      const lowerBound = entryBefore ? (entryBefore[key] ?? 0) : 0;
      const upperBound = entrySameDate 
        ? (entrySameDate[key] ?? Infinity) 
        : (entryAfter ? (entryAfter[key] ?? Infinity) : Infinity);
      
      if (newValue < lowerBound || newValue > upperBound) {
        const lowerDateStr = entryBefore ? formatDisplayDate(entryBefore.change_date) : "start";
        const upperDateStr = entrySameDate 
          ? formatDisplayDate(entrySameDate.change_date)
          : (entryAfter ? formatDisplayDate(entryAfter.change_date) : "end");
        
        if (upperBound === Infinity) {
          errors.push(
            `${counterDisplayNames[key]}: Value ${newValue} must be >= ${lowerBound} (recorded on ${lowerDateStr}).`
          );
        } else {
          errors.push(
            `${counterDisplayNames[key]}: Value ${newValue} is outside valid range. Must be between ${lowerBound} (${lowerDateStr}) and ${upperBound} (${upperDateStr}).`
          );
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

function formatDateForComparison(date: Date): string {
  // Format as YYYY-MM-DD for string comparison
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
