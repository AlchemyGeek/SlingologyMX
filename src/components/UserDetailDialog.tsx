import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, User, Database, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
  isAdmin: boolean;
  membership_status: string;
}

interface RecordCounts {
  maintenance_logs: number;
  directives: number;
  notifications: number;
  subscriptions: number;
  aircraft_counters: number;
  aircraft_counter_history: number;
  aircraft_directive_status: number;
  directive_history: number;
  maintenance_directive_compliance: number;
}

interface UserDetailDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

const UserDetailDialog = ({ user, open, onOpenChange, onUserUpdated }: UserDetailDialogProps) => {
  const [recordCounts, setRecordCounts] = useState<RecordCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [processing, setProcessing] = useState(false);

  const WIPE_CONFIRMATION = "WIPE ALL DATA";
  const DELETE_CONFIRMATION = "DELETE ACCOUNT";

  useEffect(() => {
    if (user && open) {
      setIsAdmin(user.isAdmin);
      fetchRecordCounts(user.id);
    }
  }, [user, open]);

  const fetchRecordCounts = async (userId: string) => {
    setLoadingCounts(true);
    try {
      const [
        maintenanceLogs,
        directives,
        notifications,
        subscriptions,
        aircraftCounters,
        aircraftCounterHistory,
        aircraftDirectiveStatus,
        directiveHistory,
        maintenanceDirectiveCompliance,
      ] = await Promise.all([
        supabase.from("maintenance_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("directives").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("aircraft_counters").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("aircraft_counter_history").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("aircraft_directive_status").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("directive_history").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("maintenance_directive_compliance").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      setRecordCounts({
        maintenance_logs: maintenanceLogs.count || 0,
        directives: directives.count || 0,
        notifications: notifications.count || 0,
        subscriptions: subscriptions.count || 0,
        aircraft_counters: aircraftCounters.count || 0,
        aircraft_counter_history: aircraftCounterHistory.count || 0,
        aircraft_directive_status: aircraftDirectiveStatus.count || 0,
        directive_history: directiveHistory.count || 0,
        maintenance_directive_compliance: maintenanceDirectiveCompliance.count || 0,
      });
    } catch (error) {
      console.error("Error fetching record counts:", error);
      toast.error("Failed to fetch record counts");
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleRoleToggle = async (checked: boolean) => {
    if (!user) return;
    setUpdatingRole(true);

    try {
      if (checked) {
        // Add admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "admin" });
        if (error) throw error;
        toast.success("Admin role granted");
      } else {
        // Remove admin role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .eq("role", "admin");
        if (error) throw error;
        toast.success("Admin role removed");
      }
      setIsAdmin(checked);
      onUserUpdated();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(false);
    }
  };

  const wipeUserData = async () => {
    if (!user || confirmationText !== WIPE_CONFIRMATION) return;
    setProcessing(true);

    try {
      // Delete in order to respect foreign key constraints
      await supabase.from("maintenance_directive_compliance").delete().eq("user_id", user.id);
      await supabase.from("aircraft_directive_status").delete().eq("user_id", user.id);
      await supabase.from("directive_history").delete().eq("user_id", user.id);
      await supabase.from("notifications").delete().eq("user_id", user.id);
      await supabase.from("maintenance_logs").delete().eq("user_id", user.id);
      await supabase.from("directives").delete().eq("user_id", user.id);
      await supabase.from("subscriptions").delete().eq("user_id", user.id);
      await supabase.from("aircraft_counter_history").delete().eq("user_id", user.id);
      await supabase.from("aircraft_counters").delete().eq("user_id", user.id);

      toast.success("User data wiped successfully");
      setWipeDialogOpen(false);
      setConfirmationText("");
      fetchRecordCounts(user.id);
      onUserUpdated();
    } catch (error) {
      console.error("Error wiping user data:", error);
      toast.error("Failed to wipe user data");
    } finally {
      setProcessing(false);
    }
  };

  const deleteUserAccount = async () => {
    if (!user || confirmationText !== DELETE_CONFIRMATION) return;
    setProcessing(true);

    try {
      // Wipe data first
      await supabase.from("maintenance_directive_compliance").delete().eq("user_id", user.id);
      await supabase.from("aircraft_directive_status").delete().eq("user_id", user.id);
      await supabase.from("directive_history").delete().eq("user_id", user.id);
      await supabase.from("notifications").delete().eq("user_id", user.id);
      await supabase.from("maintenance_logs").delete().eq("user_id", user.id);
      await supabase.from("directives").delete().eq("user_id", user.id);
      await supabase.from("subscriptions").delete().eq("user_id", user.id);
      await supabase.from("aircraft_counter_history").delete().eq("user_id", user.id);
      await supabase.from("aircraft_counters").delete().eq("user_id", user.id);
      
      // Delete user roles
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      
      // Delete profile (this may cascade from auth.users deletion)
      // Note: Actually deleting the auth.users record requires admin API
      // For now, we'll delete the profile which effectively disables the account
      const { error } = await supabase.from("profiles").delete().eq("id", user.id);
      if (error) throw error;

      toast.success("User account deleted successfully");
      setDeleteDialogOpen(false);
      setConfirmationText("");
      onOpenChange(false);
      onUserUpdated();
    } catch (error) {
      console.error("Error deleting user account:", error);
      toast.error("Failed to delete user account");
    } finally {
      setProcessing(false);
    }
  };

  const totalRecords = recordCounts
    ? Object.values(recordCounts).reduce((a, b) => a + b, 0)
    : 0;

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {user.isAdmin ? <Shield className="h-5 w-5 text-amber-500" /> : <User className="h-5 w-5" />}
              {user.name || "Unnamed User"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{user.email || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p>
                  <Badge variant="outline">{user.membership_status}</Badge>
                </p>
              </div>
            </div>

            <Separator />

            {/* Record Counts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database Records
                  {!loadingCounts && <Badge variant="secondary">{totalRecords} total</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCounts ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : recordCounts ? (
                  <div className="grid grid-cols-3 gap-3">
                    <RecordCountCard label="Maintenance Logs" count={recordCounts.maintenance_logs} />
                    <RecordCountCard label="Directives" count={recordCounts.directives} />
                    <RecordCountCard label="Notifications" count={recordCounts.notifications} />
                    <RecordCountCard label="Subscriptions" count={recordCounts.subscriptions} />
                    <RecordCountCard label="Counter History" count={recordCounts.aircraft_counter_history} />
                    <RecordCountCard label="Directive History" count={recordCounts.directive_history} />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Separator />

            {/* Role Management */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Admin Role</Label>
                <p className="text-sm text-muted-foreground">
                  Grant or revoke administrative privileges
                </p>
              </div>
              <Switch
                checked={isAdmin}
                onCheckedChange={handleRoleToggle}
                disabled={updatingRole}
              />
            </div>

            <Separator />

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Wipe User Database</p>
                    <p className="text-sm text-muted-foreground">
                      Delete all records except bugs and feature requests
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setConfirmationText("");
                      setWipeDialogOpen(true);
                    }}
                  >
                    Wipe Data
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete User Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete user and all their data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setConfirmationText("");
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wipe Confirmation Dialog */}
      <AlertDialog open={wipeDialogOpen} onOpenChange={setWipeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Wipe User Database
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete all maintenance logs, directives, notifications,
                subscriptions, and counter data for <strong>{user.name || user.email}</strong>.
              </p>
              <p>Bug reports and feature requests will be preserved.</p>
              <p className="font-medium">
                Type <code className="bg-muted px-1 py-0.5 rounded">{WIPE_CONFIRMATION}</code> to confirm:
              </p>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={WIPE_CONFIRMATION}
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={wipeUserData}
              disabled={confirmationText !== WIPE_CONFIRMATION || processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Wipe All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete the user account and ALL associated data for{" "}
                <strong>{user.name || user.email}</strong>.
              </p>
              <p className="text-destructive font-medium">This action cannot be undone.</p>
              <p className="font-medium">
                Type <code className="bg-muted px-1 py-0.5 rounded">{DELETE_CONFIRMATION}</code> to confirm:
              </p>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={DELETE_CONFIRMATION}
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUserAccount}
              disabled={confirmationText !== DELETE_CONFIRMATION || processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const RecordCountCard = ({ label, count }: { label: string; count: number }) => (
  <div className="bg-muted/50 rounded-lg p-3 text-center">
    <p className="text-2xl font-bold">{count}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default UserDetailDialog;
