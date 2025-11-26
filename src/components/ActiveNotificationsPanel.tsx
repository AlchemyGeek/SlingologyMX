import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ActiveNotificationsPanelProps {
  userId: string;
}

const ActiveNotificationsPanel = ({ userId }: ActiveNotificationsPanelProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_completed", false)
        .order("initial_date", { ascending: true });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast.error("Failed to load active notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveNotifications();
  }, [userId]);

  const handleMarkCompleted = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notification marked as completed");
      fetchActiveNotifications();
    } catch (error: any) {
      toast.error("Failed to update notification");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Notifications</CardTitle>
        <CardDescription>Maintenance tasks that need attention</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground">No active notifications. Great job staying on top of maintenance!</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium">{notification.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{notification.type}</Badge>
                    </TableCell>
                    <TableCell>{notification.component}</TableCell>
                    <TableCell>{new Date(notification.initial_date).toLocaleDateString()}</TableCell>
                    <TableCell>{notification.recurrence}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleMarkCompleted(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveNotificationsPanel;