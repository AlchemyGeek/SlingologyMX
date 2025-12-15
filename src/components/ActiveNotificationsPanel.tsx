import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Plus, Pencil, Trash2, AlertCircle, Link } from "lucide-react";
import { toast } from "sonner";
import { addDays, addMonths } from "date-fns";
import { cn, parseLocalDate } from "@/lib/utils";
import NotificationForm from "./NotificationForm";

interface ActiveNotificationsPanelProps {
  userId: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
  onNotificationCompleted?: () => void;
  refreshKey?: number;
}

const counterTypeToFieldMap: Record<string, string> = {
  "Hobbs": "hobbs",
  "Tach": "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

type AlertStatus = "normal" | "reminder" | "due";

const ActiveNotificationsPanel = ({ userId, currentCounters, onNotificationCompleted, refreshKey }: ActiveNotificationsPanelProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"date" | "counter">("date");

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
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveNotifications();
  }, [userId, refreshKey]);

  const dateNotifications = notifications.filter(n => n.notification_basis === "Date" || !n.notification_basis);
  const counterNotifications = notifications.filter(n => n.notification_basis === "Counter");

  const hasActiveAlerts = notifications.some(notification => {
    const status = getAlertStatus(notification);
    return status === "reminder" || status === "due";
  });

  function getAlertStatus(notification: any): AlertStatus {
    if (notification.notification_basis === "Counter" || notification.counter_type) {
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
      const dueDate = parseLocalDate(notification.initial_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const alertDays = notification.alert_days ?? 7;
      
      if (diffDays <= 0) return "due";
      if (diffDays <= alertDays) return "reminder";
      return "normal";
    }
  }

  const calculateNextDate = (currentDate: string, recurrence: string): string => {
    const date = parseLocalDate(currentDate);
    
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
      const { data: notification, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;

      // Check if this is a subscription-linked notification with recurrence=None
      // If so, fetch the subscription's recurrence to determine if we should create next instance
      let effectiveRecurrence = notification.recurrence;
      if (notification.subscription_id && notification.recurrence === "None") {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("recurrence")
          .eq("id", notification.subscription_id)
          .single();
        
        if (subscription && subscription.recurrence !== "None") {
          effectiveRecurrence = subscription.recurrence;
        }
      }

      if (effectiveRecurrence && effectiveRecurrence !== "None") {
        const nextDate = calculateNextDate(notification.initial_date, effectiveRecurrence);
        
        const { error: createError } = await supabase
          .from("notifications")
          .insert({
            user_id: notification.user_id,
            description: notification.description,
            type: notification.type,
            initial_date: nextDate,
            recurrence: notification.recurrence, // Keep original recurrence (None for subscription-linked)
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
        
        await fetchActiveNotifications();
        onNotificationCompleted?.();
        toast.success("Notification completed and next instance created");
      } else if (notification.counter_step) {
        const { error: createError } = await supabase
          .from("notifications")
          .insert({
            user_id: notification.user_id,
            description: notification.description,
            type: notification.type,
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
        onNotificationCompleted?.();
        toast.success("Notification completed and next instance created");
      } else {
        await fetchActiveNotifications();
        onNotificationCompleted?.();
        toast.success("Notification marked as completed");
      }
    } catch (error: any) {
      toast.error("Failed to update notification");
      await fetchActiveNotifications();
      onNotificationCompleted?.();
    }
  };

  const handleEdit = (notification: any) => {
    setEditingNotification(notification);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Notification deleted");
      await fetchActiveNotifications();
      onNotificationCompleted?.();
    } catch (error: any) {
      toast.error("Failed to delete notification");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingNotification(null);
    fetchActiveNotifications();
    onNotificationCompleted?.();
  };

  const handleNewNotification = () => {
    setEditingNotification(null);
    setShowForm(true);
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const renderDateTable = () => (
    dateNotifications.length === 0 ? (
      <p className="text-muted-foreground">No active date-based notifications.</p>
    ) : (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Recurrence</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dateNotifications.map((notification) => {
              const alertStatus = getAlertStatus(notification);
              const rowClassName = cn(
                alertStatus === "reminder" && "bg-orange-500/10 hover:bg-orange-500/20",
                alertStatus === "due" && "bg-destructive/10 hover:bg-destructive/20"
              );
              
              return (
                <TableRow key={notification.id} className={rowClassName}>
                  <TableCell className="font-medium">
                    {notification.description}
                    {(notification.maintenance_log_id || notification.directive_id || notification.subscription_id) && !notification.user_modified && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block align-middle ml-1" style={{ width: 16, height: 16 }}>
                            <Link style={{ width: 16, height: 16 }} className="text-primary" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>System-managed notification</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{notification.type}</Badge>
                  </TableCell>
                  <TableCell>{parseLocalDate(notification.initial_date).toLocaleDateString()}</TableCell>
                  <TableCell>{notification.recurrence}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleMarkCompleted(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(notification)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    )
  );

  const renderCounterTable = () => (
    counterNotifications.length === 0 ? (
      <p className="text-muted-foreground">No active counter-based notifications.</p>
    ) : (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Counter</TableHead>
              <TableHead>Due At</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Recurrence</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {counterNotifications.map((notification) => {
              const alertStatus = getAlertStatus(notification);
              const rowClassName = cn(
                alertStatus === "reminder" && "bg-orange-500/10 hover:bg-orange-500/20",
                alertStatus === "due" && "bg-destructive/10 hover:bg-destructive/20"
              );
              
              const field = counterTypeToFieldMap[notification.counter_type];
              const currentValue = currentCounters?.[field as keyof typeof currentCounters] || 0;
              const targetValue = notification.initial_counter_value || 0;
              const remaining = targetValue - currentValue;
              
              return (
                <TableRow key={notification.id} className={rowClassName}>
                  <TableCell className="font-medium">
                    {notification.description}
                    {(notification.maintenance_log_id || notification.directive_id || notification.subscription_id) && !notification.user_modified && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block align-middle ml-1" style={{ width: 16, height: 16 }}>
                            <Link style={{ width: 16, height: 16 }} className="text-primary" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>System-managed notification</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{notification.type}</Badge>
                  </TableCell>
                  <TableCell>{notification.counter_type}</TableCell>
                  <TableCell>{targetValue.toFixed(1)}</TableCell>
                  <TableCell>
                    <span className={remaining <= 0 ? "text-destructive font-medium" : ""}>
                      {remaining.toFixed(1)} hrs
                    </span>
                  </TableCell>
                  <TableCell>
                    {notification.counter_step ? `Every ${notification.counter_step} hrs` : "None"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleMarkCompleted(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(notification)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    )
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Notifications
              {hasActiveAlerts && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </CardTitle>
            <CardDescription>Manage and track your maintenance notifications</CardDescription>
          </div>
          <Button onClick={handleNewNotification}>
            <Plus className="h-4 w-4 mr-2" />
            New Notification
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <NotificationForm
            userId={userId}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditingNotification(null); }}
            editingNotification={editingNotification}
            currentCounters={currentCounters}
            notificationBasis={activeTab === "counter" ? "Counter" : "Date"}
          />
        ) : notifications.length === 0 ? (
          <p className="text-muted-foreground">No active notifications. Click "New Notification" to create one.</p>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "date" | "counter")}>
            <TabsList>
              <TabsTrigger value="date">Date Based ({dateNotifications.length})</TabsTrigger>
              <TabsTrigger value="counter">Counter Based ({counterNotifications.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="date" className="mt-4">
              {renderDateTable()}
            </TabsContent>
            
            <TabsContent value="counter" className="mt-4">
              {renderCounterTable()}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveNotificationsPanel;
