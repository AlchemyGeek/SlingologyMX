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
import { Plane, Plus, Pencil, Trash2, Star, StarOff } from "lucide-react";
import { toast } from "sonner";

interface AircraftFormData {
  registration: string;
  model_make: string;
}

export function AircraftManagement({ userId }: { userId: string }) {
  const { aircraft, refetchAircraft, canAddMore, maxAircraft } = useAircraft();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [deletingAircraft, setDeletingAircraft] = useState<Aircraft | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [formData, setFormData] = useState<AircraftFormData>({ registration: "", model_make: "" });
  const [saving, setSaving] = useState(false);

  const CONFIRMATION_PHRASE = "delete my aircraft";

  const openAddDialog = () => {
    setEditingAircraft(null);
    setFormData({ registration: "", model_make: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (a: Aircraft) => {
    setEditingAircraft(a);
    setFormData({ registration: a.registration, model_make: a.model_make || "" });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.registration.trim()) {
      toast.error("Registration number is required");
      return;
    }

    setSaving(true);

    try {
      if (editingAircraft) {
        // Update existing
        const { error } = await supabase
          .from("aircraft")
          .update({
            registration: formData.registration.trim().toUpperCase(),
            model_make: formData.model_make.trim() || null,
          })
          .eq("id", editingAircraft.id);

        if (error) throw error;
        toast.success("Aircraft updated successfully");
      } else {
        // Create new - set as primary if it's the first one
        const isPrimary = aircraft.length === 0;
        const { error } = await supabase.from("aircraft").insert({
          user_id: userId,
          registration: formData.registration.trim().toUpperCase(),
          model_make: formData.model_make.trim() || null,
          is_primary: isPrimary,
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
              <Plus className="h-4 w-4 mr-2" />
              Add Aircraft
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
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Aircraft
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
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
              disabled={deleteConfirmText.toLowerCase() !== CONFIRMATION_PHRASE}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
