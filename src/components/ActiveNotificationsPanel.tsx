import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { addDays, addMonths } from "date-fns";

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

  const calculateNextDate = (currentDate: string, recurrence: string): string => {
    const date = new Date(currentDate);
    
    switch (recurrence) {
      case "Weekly":
        return addDays(date, 7).toISOString().split('T')[0];
      case "Bi-Monthly":
        return addMonths(date, 2).toISOString().split('T')[0];
      case "Monthly":
        return addMonths(date, 1).toISOString().split('T')[0];
      case "Quarterly":
        return addMonths(date, 3).toISOString().split('T')[0];
      case "Semi-Annual":
        return addMonths(date, 6).toISOString().split('T')[0];
      case "Yearly":
        return addMonths(date, 12).toISOString().split('T')[0];
      default:
        return currentDate;
    }
  };

  const handleMarkCompleted = async (id: string) => {
    try {
      // First, get the notification details
      const { data: notification, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Mark current notification as completed
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;

      // If it's a recurring notification, create the next instance
      if (notification.recurrence) {
        const nextDate = calculateNextDate(notification.initial_date, notification.recurrence);
        
        const { error: createError } = await supabase
          .from("notifications")
          .insert({
            user_id: notification.user_id,
            description: notification.description,
            type: notification.type,
            component: notification.component,
            initial_date: nextDate,
            recurrence: notification.recurrence,
            notes: notification.notes,
            is_completed: false
          });

        if (createError) throw createError;
        
        // Refresh the list to show the new notification
        await fetchActiveNotifications();
        toast.success("Notification completed and next instance created");
      } else {
        // Refresh the list
        await fetchActiveNotifications();
        toast.success("Notification marked as completed");
      }
    } catch (error: any) {
      toast.error("Failed to update notification");
      // Refresh anyway to ensure UI is in sync
      await fetchActiveNotifications();
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