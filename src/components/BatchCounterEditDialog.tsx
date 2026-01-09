import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface BatchCounterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counters: AircraftCounters;
  onSave: (updates: Partial<Pick<AircraftCounters, NumericCounterKey>>) => Promise<void>;
}

const counterConfig = [
  { key: "hobbs" as const, label: "Hobbs", syncable: false },
  { key: "tach" as const, label: "Tach", syncable: true },
  { key: "airframe_total_time" as const, label: "Airframe TT", syncable: true },
  { key: "engine_total_time" as const, label: "Engine TT", syncable: true },
  { key: "prop_total_time" as const, label: "Prop TT", syncable: true },
];

const syncableKeys: NumericCounterKey[] = ["tach", "airframe_total_time", "engine_total_time", "prop_total_time"];

// Helper to get numeric value, defaulting null to 0
const getCounterValue = (counters: AircraftCounters, key: NumericCounterKey): number => {
  const value = counters[key];
  return typeof value === "number" ? value : 0;
};

export function BatchCounterEditDialog({
  open,
  onOpenChange,
  counters,
  onSave,
}: BatchCounterEditDialogProps) {
  const [values, setValues] = useState<Record<NumericCounterKey, string>>({
    hobbs: "",
    tach: "",
    airframe_total_time: "",
    engine_total_time: "",
    prop_total_time: "",
  });
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Track the original values to calculate deltas
  const originalValues = useRef<Record<NumericCounterKey, number>>({
    hobbs: 0,
    tach: 0,
    airframe_total_time: 0,
    engine_total_time: 0,
    prop_total_time: 0,
  });

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
      setSyncEnabled(true);
    }
  }, [open, counters]);

  const handleValueChange = (key: NumericCounterKey, value: string) => {
    const config = counterConfig.find(c => c.key === key);
    
    // If sync is enabled and this is a syncable counter, apply delta to all syncable counters
    if (syncEnabled && config?.syncable) {
      const newValue = parseFloat(value) || 0;
      const originalValue = originalValues.current[key];
      const delta = newValue - originalValue;
      
      setValues(prev => {
        const updated = { ...prev, [key]: value };
        // Apply the same delta to other syncable counters
        syncableKeys.forEach(syncKey => {
          if (syncKey !== key) {
            const syncOriginal = originalValues.current[syncKey];
            const syncedValue = syncOriginal + delta;
            updated[syncKey] = syncedValue.toFixed(1);
          }
        });
        return updated;
      });
    } else {
      setValues(prev => ({ ...prev, [key]: value }));
    }
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
            Update counter values. This creates a single history entry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {counterConfig.map((config) => (
            <div key={config.key} className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor={config.key} className="text-right">
                {config.label}
              </Label>
              <Input
                id={config.key}
                type="number"
                step="0.1"
                min="0"
                value={values[config.key]}
                onChange={(e) => handleValueChange(config.key, e.target.value)}
                className="col-span-2"
              />
            </div>
          ))}
          
          <div className="flex items-center justify-between pt-4 border-t">
            <Label htmlFor="sync-toggle" className="text-sm text-muted-foreground">
              Sync Tach, Airframe, Engine &amp; Prop
            </Label>
            <Switch
              id="sync-toggle"
              checked={syncEnabled}
              onCheckedChange={setSyncEnabled}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, changing any synced counter applies the same increment to all others.
          </p>
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
