import { useState, useEffect } from "react";
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

interface BatchCounterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counters: AircraftCounters;
  onSave: (updates: Partial<Pick<AircraftCounters, NumericCounterKey>>) => Promise<void>;
}

const counterConfig = [
  { key: "hobbs" as const, label: "Hobbs" },
  { key: "tach" as const, label: "Tach" },
  { key: "airframe_total_time" as const, label: "Airframe TT" },
  { key: "engine_total_time" as const, label: "Engine TT" },
  { key: "prop_total_time" as const, label: "Prop TT" },
];

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
  const [saving, setSaving] = useState(false);

  // Initialize values when dialog opens
  useEffect(() => {
    if (open) {
      setValues({
        hobbs: getCounterValue(counters, "hobbs").toString(),
        tach: getCounterValue(counters, "tach").toString(),
        airframe_total_time: getCounterValue(counters, "airframe_total_time").toString(),
        engine_total_time: getCounterValue(counters, "engine_total_time").toString(),
        prop_total_time: getCounterValue(counters, "prop_total_time").toString(),
      });
    }
  }, [open, counters]);

  const handleValueChange = (key: NumericCounterKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
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
      toast.success("All counters updated");
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
          <DialogTitle>Edit All Counters</DialogTitle>
          <DialogDescription>
            Update all counter values at once. This creates a single history entry.
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
