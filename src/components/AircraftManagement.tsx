import { useState } from "react";
import { useAircraft, Aircraft } from "@/contexts/AircraftContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plane, Plus, Pencil, Trash2, Star, StarOff, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { componentTimeFromTach } from "@/lib/aircraftCounters";

interface AircraftFormData {
  registration: string;
  model_make: string;
  serial_number: string;
  link_hobbs_to_tach: boolean;
  initial_hobbs: string;
  initial_tach: string;
  initial_airframe_total_time: string;
  initial_engine_total_time: string;
  initial_prop_total_time: string;
}

const INITIAL_COUNTER_KEYS = [
  { key: "initial_hobbs" as const, label: "Hobbs" },
  { key: "initial_tach" as const, label: "Tach" },
  { key: "initial_airframe_total_time" as const, label: "Airframe TT" },
  { key: "initial_engine_total_time" as const, label: "Engine TT" },
  { key: "initial_prop_total_time" as const, label: "Prop TT" },
] as const;

const emptyInitialCounters = {
  initial_hobbs: "",
  initial_tach: "",
  initial_airframe_total_time: "",
  initial_engine_total_time: "",
  initial_prop_total_time: "",
};

const formatInitialValue = (v: number | null): string => v !== null ? String(v) : "";

export function AircraftManagement({ userId }: { userId: string }) {
  const { aircraft, refetchAircraft, canAddMore, maxAircraft } = useAircraft();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [deletingAircraft, setDeletingAircraft] = useState<Aircraft | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [formData, setFormData] = useState<AircraftFormData>({ registration: "", model_make: "", serial_number: "", link_hobbs_to_tach: false, ...emptyInitialCounters });
  const [saving, setSaving] = useState(false);
  const [showInitialChangeWarning, setShowInitialChangeWarning] = useState(false);
  const [initialChangeConfirmText, setInitialChangeConfirmText] = useState("");
  const [initialCountersOpen, setInitialCountersOpen] = useState(false);
  const [showResetCounterWarning, setShowResetCounterWarning] = useState(false);
  const [resetCounterType, setResetCounterType] = useState<"engine_total_time" | "prop_total_time" | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [overhaulDate, setOverhaulDate] = useState("");
  const [overhaulTach, setOverhaulTach] = useState("");
  const [overhaulHours, setOverhaulHours] = useState("0");

  const CONFIRMATION_PHRASE = "DELETE MY AIRCRAFT";
  const RESET_PHRASE = "RESET";

  const openAddDialog = () => {
    setEditingAircraft(null);
    setFormData({ registration: "", model_make: "", serial_number: "", link_hobbs_to_tach: false, ...emptyInitialCounters });
    setInitialCountersOpen(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (a: Aircraft) => {
    setEditingAircraft(a);
    setFormData({
      registration: a.registration,
      model_make: a.model_make || "",
      serial_number: a.serial_number || "",
      link_hobbs_to_tach: a.link_hobbs_to_tach,
      initial_hobbs: formatInitialValue(a.initial_hobbs),
      initial_tach: formatInitialValue(a.initial_tach),
      initial_airframe_total_time: formatInitialValue(a.initial_airframe_total_time),
      initial_engine_total_time: formatInitialValue(a.initial_engine_total_time),
      initial_prop_total_time: formatInitialValue(a.initial_prop_total_time),
    });
    setInitialCountersOpen(false);
    setIsDialogOpen(true);
  };

  // Check if any initial values were previously set on the aircraft being edited
  const hadInitialValues = (a: Aircraft | null): boolean => {
    if (!a) return false;
    return a.initial_hobbs !== null || a.initial_tach !== null || 
           a.initial_airframe_total_time !== null || a.initial_engine_total_time !== null || 
           a.initial_prop_total_time !== null;
  };

  // Check if initial counter values changed
  const initialValuesChanged = (a: Aircraft | null): boolean => {
    if (!a) return false;
    return (!formData.link_hobbs_to_tach && formatInitialValue(a.initial_hobbs) !== formData.initial_hobbs) ||
           formatInitialValue(a.initial_tach) !== formData.initial_tach ||
           formatInitialValue(a.initial_airframe_total_time) !== formData.initial_airframe_total_time ||
           formatInitialValue(a.initial_engine_total_time) !== formData.initial_engine_total_time ||
           formatInitialValue(a.initial_prop_total_time) !== formData.initial_prop_total_time;
  };

  const handleSave = async (_unused = false, skipInitialWarning = false) => {
    if (!formData.registration.trim()) {
      toast.error("Registration number is required");
      return;
    }

    // Check if initial counter values changed on existing aircraft that already had them
    if (editingAircraft && !skipInitialWarning && hadInitialValues(editingAircraft) && initialValuesChanged(editingAircraft)) {
      setShowInitialChangeWarning(true);
      setInitialChangeConfirmText("");
      return;
    }

    setSaving(true);

    const parseInitial = (v: string): number | null => {
      if (v.trim() === "") return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };

    try {
      if (editingAircraft) {
        const initialUpdates = {
          initial_hobbs: formData.link_hobbs_to_tach ? parseInitial(formData.initial_tach) : parseInitial(formData.initial_hobbs),
          initial_tach: parseInitial(formData.initial_tach),
          initial_airframe_total_time: parseInitial(formData.initial_airframe_total_time),
          initial_engine_total_time: parseInitial(formData.initial_engine_total_time),
          initial_prop_total_time: parseInitial(formData.initial_prop_total_time),
        };

        // Update aircraft record
        const { error } = await supabase
          .from("aircraft")
          .update({
            registration: formData.registration.trim().toUpperCase(),
            model_make: formData.model_make.trim() || null,
            serial_number: formData.serial_number.trim() || null,
            link_hobbs_to_tach: formData.link_hobbs_to_tach,
            ...initialUpdates,
          })
          .eq("id", editingAircraft.id);

        if (error) throw error;

        // If initial values changed and we skipped warning (meaning user confirmed),
        // reset counters to initial values and delete history
        if (skipInitialWarning && hadInitialValues(editingAircraft) && initialValuesChanged(editingAircraft)) {
          // Reset counters to initial values
          await supabase
            .from("aircraft_counters")
            .update({
              hobbs: initialUpdates.initial_hobbs ?? 0,
              tach: initialUpdates.initial_tach ?? 0,
              airframe_total_time: initialUpdates.initial_airframe_total_time ?? 0,
              engine_total_time: initialUpdates.initial_engine_total_time ?? 0,
              prop_total_time: initialUpdates.initial_prop_total_time ?? 0,
            })
            .eq("aircraft_id", editingAircraft.id);

          // Delete all counter history
          await supabase
            .from("aircraft_counter_history")
            .delete()
            .eq("aircraft_id", editingAircraft.id);

          toast.success("Aircraft updated. Counters reset to acquisition values and history cleared.");
        } else {
          toast.success("Aircraft updated successfully");
        }
      } else {
        // Create new - set as primary if it's the first one
        const isPrimary = aircraft.length === 0;
        const { error } = await supabase.from("aircraft").insert({
          user_id: userId,
          registration: formData.registration.trim().toUpperCase(),
          model_make: formData.model_make.trim() || null,
          serial_number: formData.serial_number.trim() || null,
          is_primary: isPrimary,
          link_hobbs_to_tach: formData.link_hobbs_to_tach,
        });

        if (error) throw error;
        toast.success("Aircraft added successfully");
      }

      await refetchAircraft();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving aircraft:", error);
      toast.error(error.message || "Failed to save aircraft");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAircraft) return;

    try {
      const { error } = await supabase.from("aircraft").delete().eq("id", deletingAircraft.id);

      if (error) throw error;

      // If we deleted the primary, set another as primary
      if (deletingAircraft.is_primary && aircraft.length > 1) {
        const remaining = aircraft.filter((a) => a.id !== deletingAircraft.id);
        if (remaining.length > 0) {
          await supabase.from("aircraft").update({ is_primary: true }).eq("id", remaining[0].id);
        }
      }

      toast.success("Aircraft deleted successfully");
      await refetchAircraft();
      setDeletingAircraft(null);
    } catch (error: any) {
      console.error("Error deleting aircraft:", error);
      toast.error(error.message || "Failed to delete aircraft");
    }
  };

  const handleSetPrimary = async (a: Aircraft) => {
    try {
      // First, unset all as primary
      await supabase.from("aircraft").update({ is_primary: false }).eq("user_id", userId);

      // Then set the selected one as primary
      const { error } = await supabase.from("aircraft").update({ is_primary: true }).eq("id", a.id);

      if (error) throw error;

      toast.success(`${a.registration} is now your primary aircraft`);
      await refetchAircraft();
    } catch (error: any) {
      console.error("Error setting primary aircraft:", error);
      toast.error("Failed to set primary aircraft");
    }
  };

  const openOverhaul = async (type: "engine_total_time" | "prop_total_time") => {
    if (!editingAircraft) return;
    const { data } = await supabase
      .from("aircraft_counters")
      .select("tach")
      .eq("aircraft_id", editingAircraft.id)
      .maybeSingle();
    setResetCounterType(type);
    setOverhaulDate(new Date().toISOString().split("T")[0]);
    setOverhaulTach(data?.tach != null ? String(data.tach) : "");
    setOverhaulHours("0");
    setResetConfirmText("");
    setShowResetCounterWarning(true);
  };

  const handleResetCounter = async () => {
    if (!editingAircraft || !resetCounterType) return;
    const installTach = parseFloat(overhaulTach);
    const startHours = parseFloat(overhaulHours);
    if (isNaN(installTach) || installTach < 0 || isNaN(startHours) || startHours < 0 || !overhaulDate) {
      toast.error("Enter a valid date, Tach and starting hours");
      return;
    }
    setResetting(true);
    try {
      const { data: currentCounters } = await supabase
        .from("aircraft_counters")
        .select("hobbs, tach, airframe_total_time, engine_total_time, prop_total_time")
        .eq("aircraft_id", editingAircraft.id)
        .maybeSingle();

      const currentTach = Number(currentCounters?.tach ?? 0);
      if (installTach > currentTach) {
        toast.error(`Tach at install cannot be above the current Tach (${currentTach.toFixed(1)})`);
        setResetting(false);
        return;
      }
      const newValue = componentTimeFromTach(currentTach, installTach, startHours);

      const { error: updateError } = await supabase
        .from("aircraft_counters")
        .update({ [resetCounterType]: newValue })
        .eq("aircraft_id", editingAircraft.id);
      if (updateError) throw updateError;

      const isEngine = resetCounterType === "engine_total_time";
      const { error: acError } = await supabase
        .from("aircraft")
        .update(isEngine
          ? { engine_overhaul_tach: installTach, engine_overhaul_hours: startHours, engine_overhaul_date: overhaulDate }
          : { prop_overhaul_tach: installTach, prop_overhaul_hours: startHours, prop_overhaul_date: overhaulDate })
        .eq("id", editingAircraft.id);
      if (acError) throw acError;

      const { error: historyError } = await supabase.from("aircraft_counter_history").insert({
        user_id: userId,
        aircraft_id: editingAircraft.id,
        hobbs: currentCounters?.hobbs ?? null,
        tach: currentCounters?.tach ?? null,
        airframe_total_time: currentCounters?.airframe_total_time ?? null,
        engine_total_time: isEngine ? newValue : (currentCounters?.engine_total_time ?? null),
        prop_total_time: !isEngine ? newValue : (currentCounters?.prop_total_time ?? null),
        source: isEngine ? "Engine Overhaul" : "Prop Overhaul",
        change_date: new Date().toISOString(),
      });
      if (historyError) throw historyError;

      toast.success(`${isEngine ? "Engine" : "Prop"} TT is now ${newValue.toFixed(1)} hrs. A history entry has been recorded.`);
      await refetchAircraft();
      setShowResetCounterWarning(false);
      setResetCounterType(null);
      setResetConfirmText("");
    } catch (error: any) {
      console.error("Error recording overhaul:", error);
      toast.error("Failed to record overhaul");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              My Aircraft
            </CardTitle>
            <CardDescription>
              Manage your aircraft ({aircraft.length}/{maxAircraft})
            </CardDescription>
          </div>
          {canAddMore && (
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4" />
              <span className="sr-only">New Aircraft</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {aircraft.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No aircraft registered yet.</p>
            <Button onClick={openAddDialog} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Your First Aircraft</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {aircraft.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Plane className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.registration}</span>
                      {a.is_primary && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Primary
                        </span>
                      )}
                    </div>
                    {a.model_make && <p className="text-sm text-muted-foreground">{a.model_make}</p>}
                    {a.serial_number && <p className="text-xs text-muted-foreground">S/N: {a.serial_number}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!a.is_primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetPrimary(a)}
                      title="Set as primary"
                    >
                      <StarOff className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {aircraft.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingAircraft(a)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!canAddMore && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Maximum of {maxAircraft} aircraft per account reached.
          </p>
        )}

      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAircraft ? "Edit Aircraft" : "Add New Aircraft"}</DialogTitle>
            <DialogDescription>
              {editingAircraft
                ? "Update your aircraft information."
                : "Add a new aircraft to your account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number *</Label>
              <Input
                id="registration"
                value={formData.registration}
                onChange={(e) =>
                  setFormData({ ...formData, registration: e.target.value.toUpperCase() })
                }
                placeholder="N12345"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model_make">Model / Make</Label>
              <Input
                id="model_make"
                value={formData.model_make}
                onChange={(e) => setFormData({ ...formData, model_make: e.target.value })}
                placeholder="e.g., Sling TSi"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="e.g., 234SK"
                maxLength={50}
              />
            </div>

            {/* Acquisition Counters */}
            <Collapsible open={initialCountersOpen} onOpenChange={setInitialCountersOpen}>
              <div className="pt-2 border-t">
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                  {initialCountersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Label className="text-sm font-medium cursor-pointer">Acquisition Counters</Label>
                </CollapsibleTrigger>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Counter values when you acquired this aircraft. Used to calculate owner-specific usage for financial analysis.
                </p>
                <CollapsibleContent className="space-y-3 mt-3">
                  {INITIAL_COUNTER_KEYS.filter(({ key }) => !(formData.link_hobbs_to_tach && key === "initial_hobbs")).map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-2 items-center gap-4">
                      <Label className="text-sm">{label}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        placeholder="Not set"
                      />
                    </div>
                  ))}
                </CollapsibleContent>
              </div>
            </Collapsible>
            {/* Counter Tracking */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="link_hobbs_to_tach" className="text-sm font-medium">
                  Track Tach only (hide Hobbs)
                </Label>
                <Switch
                  id="link_hobbs_to_tach"
                  checked={formData.link_hobbs_to_tach}
                  onCheckedChange={(checked) => setFormData({ ...formData, link_hobbs_to_tach: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Airframe, Engine and Prop TT always advance with Tach. Turn this on if you don't track a separate Hobbs meter — Hobbs is hidden and follows Tach.
              </p>
            </div>

            {/* Engine / Prop overhaul - only show when editing */}
            {editingAircraft && (
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Engine / Propeller Overhaul or Replacement</Label>
                <p className="text-xs text-muted-foreground">
                  Restart the Engine or Prop TT count after an overhaul or replacement. Airframe TT never resets.
                </p>
                {(editingAircraft.engine_overhaul_date || editingAircraft.prop_overhaul_date) && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {editingAircraft.engine_overhaul_date && (
                      <p>Engine: {editingAircraft.engine_overhaul_date} at Tach {editingAircraft.engine_overhaul_tach ?? "—"} ({editingAircraft.engine_overhaul_hours.toFixed(1)} hrs)</p>
                    )}
                    {editingAircraft.prop_overhaul_date && (
                      <p>Prop: {editingAircraft.prop_overhaul_date} at Tach {editingAircraft.prop_overhaul_tach ?? "—"} ({editingAircraft.prop_overhaul_hours.toFixed(1)} hrs)</p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openOverhaul("engine_total_time")}>
                    Record Engine Overhaul
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openOverhaul("prop_total_time")}>
                    Record Prop Overhaul
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSave()} disabled={saving}>
              {saving ? "Saving..." : editingAircraft ? "Update" : "Add Aircraft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deletingAircraft} 
        onOpenChange={(open) => {
          if (!open) {
            setDeletingAircraft(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Aircraft?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Are you sure you want to delete <strong>{deletingAircraft?.registration}</strong>? This
                  will also delete all associated maintenance logs, directives, equipment, and
                  notifications for this aircraft. This action cannot be undone.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    To confirm, type "<span className="font-semibold">{CONFIRMATION_PHRASE}</span>" below:
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={CONFIRMATION_PHRASE}
                    className="mt-2"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText !== CONFIRMATION_PHRASE}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Initial Counter Change Warning */}
      <AlertDialog
        open={showInitialChangeWarning}
        onOpenChange={(open) => {
          if (!open) {
            setShowInitialChangeWarning(false);
            setInitialChangeConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Acquisition Counters?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Changing acquisition counter values will <strong>reset your current counters</strong> to these new values and <strong>delete all counter history</strong>. This will impact all of your records and may invalidate your existing financial analysis.
                </p>
                <p className="font-medium text-foreground">
                  This action cannot be undone. Make sure you understand the implications.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    To confirm, type "<span className="font-semibold">{RESET_PHRASE}</span>" below:
                  </p>
                  <Input
                    value={initialChangeConfirmText}
                    onChange={(e) => setInitialChangeConfirmText(e.target.value.toUpperCase())}
                    placeholder={RESET_PHRASE}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInitialChangeConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowInitialChangeWarning(false);
                setInitialChangeConfirmText("");
                handleSave(true, true);
              }}
              disabled={initialChangeConfirmText !== RESET_PHRASE}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Counter Reset Warning */}
      <AlertDialog
        open={showResetCounterWarning}
        onOpenChange={(open) => {
          if (!open) {
            setShowResetCounterWarning(false);
            setResetCounterType(null);
            setResetConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Record {resetCounterType === "engine_total_time" ? "Engine" : "Propeller"} Overhaul / Replacement
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  From this point on, {resetCounterType === "engine_total_time" ? "Engine TT" : "Prop TT"} counts up with Tach starting from the hours you enter below. A history entry is recorded.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="overhaul_date" className="text-foreground">Date</Label>
                    <Input
                      id="overhaul_date"
                      type="date"
                      value={overhaulDate}
                      onChange={(e) => setOverhaulDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="overhaul_tach" className="text-foreground">Tach at install</Label>
                    <Input
                      id="overhaul_tach"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={overhaulTach}
                      onChange={(e) => setOverhaulTach(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="overhaul_hours" className="text-foreground">Starting hours</Label>
                    <Input
                      id="overhaul_hours"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={overhaulHours}
                      onChange={(e) => setOverhaulHours(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use 0.0 for a zero-time overhaul or new unit; enter existing hours for a used or mid-time unit.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    To confirm, type "<span className="font-semibold">{RESET_PHRASE}</span>" below:
                  </p>
                  <Input
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                    placeholder={RESET_PHRASE}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleResetCounter(); }}
              disabled={resetConfirmText !== RESET_PHRASE || resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? "Saving..." : "Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
