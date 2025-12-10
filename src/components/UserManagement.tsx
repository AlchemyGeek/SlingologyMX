import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
  isAdmin: boolean;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, email, created_at")
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        // Fetch all admin roles
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
        }));

        setUsers(usersWithRoles);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
          <Badge variant="secondary" className="ml-2">
            {users.length} users
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Member Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
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
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
