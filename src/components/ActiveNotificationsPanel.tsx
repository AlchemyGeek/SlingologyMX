import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { addDays, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface ActiveNotificationsPanelProps {
  userId: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
}

const counterTypeToFieldMap: Record<string, string> = {
  "Hobbs": "hobbs",
  "Tach": "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

type AlertStatus = "normal" | "reminder" | "due";

const ActiveNotificationsPanel = ({ userId, currentCounters }: ActiveNotificationsPanelProps) => {
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

  const getAlertStatus = (notification: any): AlertStatus => {
    if (notification.notification_basis === "Counter" || notification.counter_type) {
      // Counter-based
      if (!currentCounters || !notification.counter_type) return "normal";
      const field = counterTypeToFieldMap[notification.counter_type];
      const currentValue = currentCounters[field as keyof typeof currentCounters] || 0;
      const targetValue = notification.initial_counter_value || 0;
      const remaining = targetValue - currentValue;
      const alertHours = notification.alert_hours ?? 10;
      
      if (remaining <= 0) return "due";
      if (remaining <= alertHours) return "reminder";
      return "normal";
    } else {
      // Date-based
      const dueDate = new Date(notification.initial_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const alertDays = notification.alert_days ?? 7;
      
      if (diffDays <= 0) return "due";
      if (diffDays <= alertDays) return "reminder";
      return "normal";
    }
  };

  const getDueInfo = (notification: any) => {
    if (notification.notification_basis === "Counter" || notification.counter_type) {
      if (!currentCounters || !notification.counter_type) return notification.initial_counter_value?.toFixed(1) || "-";
      const field = counterTypeToFieldMap[notification.counter_type];
      const currentValue = currentCounters[field as keyof typeof currentCounters] || 0;
      const targetValue = notification.initial_counter_value || 0;
      const remaining = targetValue - currentValue;
      return `${notification.counter_type}: ${targetValue.toFixed(1)} (${remaining.toFixed(1)} hrs remaining)`;
    }
    return new Date(notification.initial_date).toLocaleDateString();
  };

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
      if (notification.recurrence && notification.recurrence !== "None") {
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
            is_completed: false,
            subscription_id: notification.subscription_id,
            notification_basis: notification.notification_basis,
            counter_type: notification.counter_type,
            initial_counter_value: notification.counter_step 
              ? (notification.initial_counter_value || 0) + notification.counter_step 
              : notification.initial_counter_value,
            counter_step: notification.counter_step,
            alert_days: notification.alert_days,
            alert_hours: notification.alert_hours,
          });

        if (createError) throw createError;
        
        // Refresh the list to show the new notification
        await fetchActiveNotifications();
        toast.success("Notification completed and next instance created");
      } else if (notification.counter_step) {
        // Counter-based recurring notification
        const { error: createError } = await supabase
          .from("notifications")
          .insert({
            user_id: notification.user_id,
            description: notification.description,
            type: notification.type,
            component: notification.component,
            initial_date: new Date().toISOString().split('T')[0],
            recurrence: "None",
            notes: notification.notes,
            is_completed: false,
            subscription_id: notification.subscription_id,
            notification_basis: notification.notification_basis,
            counter_type: notification.counter_type,
            initial_counter_value: (notification.initial_counter_value || 0) + notification.counter_step,
            counter_step: notification.counter_step,
            alert_days: notification.alert_days,
            alert_hours: notification.alert_hours,
          });

        if (createError) throw createError;
        
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
                  <TableHead>Due</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => {
                  const alertStatus = getAlertStatus(notification);
                  const rowClassName = cn(
                    alertStatus === "reminder" && "bg-orange-500/10 hover:bg-orange-500/20",
                    alertStatus === "due" && "bg-destructive/10 hover:bg-destructive/20"
                  );
                  
                  return (
                    <TableRow key={notification.id} className={rowClassName}>
                      <TableCell className="font-medium">{notification.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{notification.type}</Badge>
                      </TableCell>
                      <TableCell>{notification.component}</TableCell>
                      <TableCell>{getDueInfo(notification)}</TableCell>
                      <TableCell>
                        {notification.notification_basis === "Counter" || notification.counter_type
                          ? notification.counter_step ? `Every ${notification.counter_step} hrs` : "None"
                          : notification.recurrence}
                      </TableCell>
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveNotificationsPanel;
