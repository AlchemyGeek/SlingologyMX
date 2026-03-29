import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AircraftCounters, NumericCounterKey } from "@/hooks/useAircraftCounters";
import { TtTrackingMode } from "@/contexts/AircraftContext";
import { Link2 } from "lucide-react";

interface CounterModes {
  airframe_tt_mode: TtTrackingMode;
  engine_tt_mode: TtTrackingMode;
  prop_tt_mode: TtTrackingMode;
}

interface BatchCounterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counters: AircraftCounters;
  counterModes: CounterModes;
  onSave: (updates: Partial<Pick<AircraftCounters, NumericCounterKey>>) => Promise<void>;
}

const counterConfig = [
  { key: "hobbs" as const, label: "Hobbs" },
  { key: "tach" as const, label: "Tach" },
  { key: "airframe_total_time" as const, label: "Airframe TT" },
  { key: "engine_total_time" as const, label: "Engine TT" },
  { key: "prop_total_time" as const, label: "Prop TT" },
];

// Map TT counter keys to their mode key
const ttModeMap: Record<string, keyof CounterModes> = {
  airframe_total_time: "airframe_tt_mode",
  engine_total_time: "engine_tt_mode",
  prop_total_time: "prop_tt_mode",
};

// Helper to get numeric value, defaulting null to 0
const getCounterValue = (counters: AircraftCounters, key: NumericCounterKey): number => {
  const value = counters[key];
  return typeof value === "number" ? value : 0;
};

const getLinkedLabel = (mode: TtTrackingMode): string => {
  if (mode === "hobbs") return "Linked to Hobbs";
  if (mode === "tach") return "Linked to Tach";
  return "";
};

export function BatchCounterEditDialog({
  open,
  onOpenChange,
  counters,
  counterModes,
  onSave,
}: BatchCounterEditDialogProps) {
  const [values, setValues] = useState<Record<NumericCounterKey, string>>({
    hobbs: "",
    tach: "",
    airframe_total_time: "",
    engine_total_time: "",
    prop_total_time: "",
  });
  const [saving, setSaving] = useState(false);
  
  // Track the original values to calculate deltas
  const originalValues = useRef<Record<NumericCounterKey, number>>({
    hobbs: 0,
    tach: 0,
    airframe_total_time: 0,
    engine_total_time: 0,
    prop_total_time: 0,
  });

  // Determine if a counter is linked (read-only)
  const getMode = (key: NumericCounterKey): TtTrackingMode | null => {
    const modeKey = ttModeMap[key];
    return modeKey ? counterModes[modeKey] : null;
  };

  const isLinked = (key: NumericCounterKey): boolean => {
    const mode = getMode(key);
    return mode === "hobbs" || mode === "tach";
  };

  // Initialize values when dialog opens
  useEffect(() => {
    if (open) {
      const initial = {
        hobbs: getCounterValue(counters, "hobbs"),
        tach: getCounterValue(counters, "tach"),
        airframe_total_time: getCounterValue(counters, "airframe_total_time"),
        engine_total_time: getCounterValue(counters, "engine_total_time"),
        prop_total_time: getCounterValue(counters, "prop_total_time"),
      };
      originalValues.current = initial;
      setValues({
        hobbs: initial.hobbs.toString(),
        tach: initial.tach.toString(),
        airframe_total_time: initial.airframe_total_time.toString(),
        engine_total_time: initial.engine_total_time.toString(),
        prop_total_time: initial.prop_total_time.toString(),
      });
    }
  }, [open, counters]);

  // Recompute linked TT values whenever hobbs or tach change
  useEffect(() => {
    if (!open) return;
    
    setValues(prev => {
      const updated = { ...prev };
      const ttKeys: NumericCounterKey[] = ["airframe_total_time", "engine_total_time", "prop_total_time"];
      
      for (const ttKey of ttKeys) {
        const mode = getMode(ttKey);
        if (mode === "hobbs" || mode === "tach") {
          const sourceKey: NumericCounterKey = mode;
          const sourceNew = parseFloat(prev[sourceKey]) || 0;
          const sourceOriginal = originalValues.current[sourceKey];
          const delta = sourceNew - sourceOriginal;
          const ttOriginal = originalValues.current[ttKey];
          updated[ttKey] = (ttOriginal + delta).toFixed(1);
        }
      }
      
      return updated;
    });
  }, [values.hobbs, values.tach, open, counterModes]);

  const handleValueChange = (key: NumericCounterKey, value: string) => {
    // Linked counters are read-only — shouldn't reach here but guard anyway
    if (isLinked(key)) return;
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    // Validate all values
    const updates: Partial<Pick<AircraftCounters, NumericCounterKey>> = {};
    const errors: string[] = [];

    for (const config of counterConfig) {
      const newValue = parseFloat(values[config.key]);
      const currentValue = getCounterValue(counters, config.key);

      if (isNaN(newValue) || newValue < 0) {
        errors.push(`${config.label}: Please enter a valid positive number`);
        continue;
      }

      if (newValue < currentValue) {
        errors.push(`${config.label}: Value cannot be less than current (${currentValue.toFixed(1)})`);
        continue;
      }

      // Only include if value changed
      if (newValue !== currentValue) {
        updates[config.key] = newValue;
      }
    }

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(updates);
      toast.success("Counters updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update counters");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Counters</DialogTitle>
          <DialogDescription>
            Update counter values. Linked counters auto-update based on their source.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {counterConfig.map((config) => {
            const linked = isLinked(config.key);
            const mode = getMode(config.key);
            return (
              <div key={config.key} className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor={config.key} className="text-right">
                  {config.label}
                </Label>
                {linked ? (
                  <div className="col-span-2 flex items-center gap-2">
                    <Input
                      id={config.key}
                      type="number"
                      step="0.1"
                      value={values[config.key]}
                      disabled
                      className="col-span-1 bg-muted"
                    />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Link2 className="h-3 w-3" />
                      {getLinkedLabel(mode!)}
                    </span>
                  </div>
                ) : (
                  <Input
                    id={config.key}
                    type="number"
                    step="0.1"
                    min="0"
                    value={values[config.key]}
                    onChange={(e) => handleValueChange(config.key, e.target.value)}
                    className="col-span-2"
                  />
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
