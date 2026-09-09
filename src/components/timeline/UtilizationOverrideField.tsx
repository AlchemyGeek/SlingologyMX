import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface UtilizationOverrideFieldProps {
  aircraftId: string;
  /** Automatic rate shown when no override is set. */
  automaticHoursPerMonth?: number | null;
  onSaved?: () => void;
}

/**
 * Owner override for expected flying hours per month.
 * Stored on the aircraft record; falls back to the automatic average when cleared.
 */
export function UtilizationOverrideField({
  aircraftId,
  automaticHoursPerMonth,
  onSaved,
}: UtilizationOverrideFieldProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!aircraftId) return;
      const { data, error } = await supabase
        .from("aircraft")
        .select("*")
        .eq("id", aircraftId)
        .maybeSingle();
      if (cancelled) return;
      if (error) return;
      const row: any = data;
      if (!row || !("utilization_hours_per_month" in row)) {
        setAvailable(false);
        return;
      }
      setValue(
        row.utilization_hours_per_month !== null && row.utilization_hours_per_month !== undefined
          ? String(row.utilization_hours_per_month)
          : ""
      );
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [aircraftId]);

  const save = async () => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
      toast.error("Enter a positive number of hours, or leave it blank.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("aircraft")
      .update({ utilization_hours_per_month: parsed } as any)
      .eq("id", aircraftId);
    setSaving(false);
    if (error) {
      setAvailable(false);
      toast.error("This setting is not available yet on this version.");
      return;
    }
    toast.success(parsed === null ? "Using the automatic rate again" : "Flying rate saved");
    onSaved?.();
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <Label htmlFor="utilization-override" className="text-xs text-muted-foreground">
        Expected flying hours per month
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="utilization-override"
          inputMode="decimal"
          disabled={!available}
          placeholder={
            automaticHoursPerMonth ? `${automaticHoursPerMonth.toFixed(1)} (automatic)` : "Automatic"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 max-w-[140px]"
        />
        <Button size="sm" variant="outline" onClick={save} disabled={saving || !available}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {available
          ? "Leave blank to use the average of the last six months of counter readings."
          : "Saving this rate becomes available once you accept these changes; until then the automatic six-month average is used."}
      </p>
    </div>
  );
}
