import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, User, CheckCircle, Clock, Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import UserDetailDialog from "./UserDetailDialog";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
  isAdmin: boolean;
  membership_status: "Applied" | "Approved" | "Suspended";
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [signupLoading, setSignupLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, created_at, membership_status")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      const usersWithRoles: UserProfile[] = (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        created_at: profile.created_at,
        isAdmin: adminUserIds.has(profile.id),
        membership_status: (profile.membership_status || "Approved") as "Applied" | "Approved" | "Suspended",
      }));

      setUsers(usersWithRoles);
      
      // Update selectedUser with fresh data if dialog is open
      if (selectedUser) {
        const updatedSelectedUser = usersWithRoles.find(u => u.id === selectedUser.id);
        if (updatedSelectedUser) {
          setSelectedUser(updatedSelectedUser);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignupSetting = async () => {
    setSignupLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "signup_enabled")
        .single();

      if (error) throw error;
      setSignupEnabled(data?.setting_value === "true");
    } catch (error) {
      console.error("Error fetching signup setting:", error);
    } finally {
      setSignupLoading(false);
    }
  };

  const toggleSignup = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: enabled ? "true" : "false", updated_at: new Date().toISOString() })
        .eq("setting_key", "signup_enabled");

      if (error) throw error;
      setSignupEnabled(enabled);
      toast.success(`New user signups ${enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("Error updating signup setting:", error);
      toast.error("Failed to update signup setting");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSignupSetting();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleUserClick = (user: UserProfile) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
              <Badge variant="secondary" className="ml-2">
                {users.length} users
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="signup-toggle" className="text-sm text-muted-foreground">
                Allow new signups
              </Label>
              <Switch
                id="signup-toggle"
                checked={signupEnabled}
                onCheckedChange={toggleSignup}
                disabled={signupLoading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Member Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow 
                      key={user.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleUserClick(user)}
                    >
                      <TableCell className="font-medium">
                        {user.name || "Not set"}
                      </TableCell>
                      <TableCell>{user.email || "N/A"}</TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <User className="h-3 w-3 mr-1" />
                            Member
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.membership_status === "Approved" && (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {user.membership_status === "Applied" && (
                          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
                            <Clock className="h-3 w-3 mr-1" />
                            Applied
                          </Badge>
                        )}
                        {user.membership_status === "Suspended" && (
                          <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
                            <Ban className="h-3 w-3 mr-1" />
                            Suspended
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UserDetailDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUserUpdated={fetchUsers}
      />
    </>
  );
};

export default UserManagement;
