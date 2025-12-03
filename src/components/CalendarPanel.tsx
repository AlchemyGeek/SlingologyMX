import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, isSameDay, addWeeks, addMonths } from "date-fns";

interface CalendarPanelProps {
  userId: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
}

type AlertStatus = "normal" | "alert" | "due";

const counterTypeToFieldMap: Record<string, string> = {
  "Hobbs": "hobbs",
  "Tach": "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

const CalendarPanel = ({ userId, currentCounters }: CalendarPanelProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [notificationsRes, logsRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .eq("is_completed", false),
        supabase
          .from("maintenance_logs")
          .select("*")
          .eq("user_id", userId)
      ]);

      if (notificationsRes.error) throw notificationsRes.error;
      if (logsRes.error) throw logsRes.error;
      
      setNotifications(notificationsRes.data || []);
      setMaintenanceLogs(logsRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const getNextOccurrenceDate = (initialDate: Date, recurrence: string, occurrenceCount: number): Date => {
    switch (recurrence) {
      case "Weekly":
        return addWeeks(initialDate, occurrenceCount);
      case "Bi-Monthly":
        return addWeeks(initialDate, occurrenceCount * 2);
      case "Monthly":
        return addMonths(initialDate, occurrenceCount);
      case "Quarterly":
        return addMonths(initialDate, occurrenceCount * 3);
      case "Semi-Annual":
        return addMonths(initialDate, occurrenceCount * 6);
      case "Yearly":
        return addMonths(initialDate, occurrenceCount * 12);
      default:
        return initialDate;
    }
  };

  const getNotificationAlertStatus = (notification: any): AlertStatus => {
    if (notification.notification_basis === "Counter" || notification.counter_type) {
      // Counter-based notification
      if (!currentCounters || !notification.counter_type) return "normal";
      const field = counterTypeToFieldMap[notification.counter_type];
      const currentValue = Number(currentCounters[field as keyof typeof currentCounters]) || 0;
      const targetValue = notification.initial_counter_value || 0;
      const remaining = targetValue - currentValue;
      const alertHours = notification.alert_hours ?? 10;
      
      if (remaining <= 0) return "due";
      if (remaining <= alertHours) return "alert";
      return "normal";
    } else {
      // Date-based notification
      const dueDate = new Date(notification.initial_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const alertDays = notification.alert_days ?? 7;
      
      if (diffDays <= 0) return "due";
      if (diffDays <= alertDays) return "alert";
      return "normal";
    }
  };

  const getNotificationsForDate = (date: Date) => {
    return notifications.filter((notification) => {
      const initialDate = new Date(notification.initial_date);
      
      if (isSameDay(initialDate, date)) {
        return true;
      }

      for (let i = 1; i <= 10; i++) {
        const nextDate = getNextOccurrenceDate(initialDate, notification.recurrence, i);
        if (isSameDay(nextDate, date)) {
          return true;
        }
        if (nextDate > date) {
          break;
        }
      }

      return false;
    });
  };

  const getMaintenanceLogsForDate = (date: Date) => {
    return maintenanceLogs.filter((log) => {
      const performedDate = new Date(log.date_performed);
      if (isSameDay(performedDate, date)) {
        return true;
      }
      
      if (log.next_due_date) {
        const nextDueDate = new Date(log.next_due_date);
        if (isSameDay(nextDueDate, date)) {
          return true;
        }
      }
      
      return false;
    });
  };

  const notificationsForSelectedDate = selectedDate
    ? getNotificationsForDate(selectedDate)
    : [];

  const maintenanceLogsForSelectedDate = selectedDate
    ? getMaintenanceLogsForDate(selectedDate)
    : [];

  const { datesNormal, datesAlert, datesDue, datesWithMaintenanceLogs } = useMemo(() => {
    const normal: Date[] = [];
    const alert: Date[] = [];
    const due: Date[] = [];
    const maintenance: Date[] = [];

    notifications.forEach((notification) => {
      const status = getNotificationAlertStatus(notification);
      const initialDate = new Date(notification.initial_date);
      
      const targetArray = status === "due" ? due : status === "alert" ? alert : normal;
      targetArray.push(initialDate);

      for (let i = 1; i <= 10; i++) {
        const nextDate = getNextOccurrenceDate(initialDate, notification.recurrence, i);
        targetArray.push(nextDate);
      }
    });

    maintenanceLogs.forEach((log) => {
      maintenance.push(new Date(log.date_performed));
      if (log.next_due_date) {
        maintenance.push(new Date(log.next_due_date));
      }
    });

    return { datesNormal: normal, datesAlert: alert, datesDue: due, datesWithMaintenanceLogs: maintenance };
  }, [notifications, maintenanceLogs, currentCounters]);

  const getNotificationCardStyle = (notification: any) => {
    const status = getNotificationAlertStatus(notification);
    switch (status) {
      case "due":
        return {
          className: "p-4 border border-red-500/40 bg-red-500/10 rounded-lg space-y-2",
          headerClass: "text-sm font-semibold text-red-600 dark:text-red-400",
          label: "Due/Overdue"
        };
      case "alert":
        return {
          className: "p-4 border border-orange-500/40 bg-orange-500/10 rounded-lg space-y-2",
          headerClass: "text-sm font-semibold text-orange-600 dark:text-orange-400",
          label: "Alert"
        };
      default:
        return {
          className: "p-4 border border-primary/20 bg-primary/5 rounded-lg space-y-2",
          headerClass: "text-sm font-semibold text-primary",
          label: "Normal"
        };
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading calendar...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar View</CardTitle>
        <CardDescription>View your scheduled maintenance and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6 justify-center">
          <div className="space-y-4 shrink-0 flex flex-col items-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                hasNotification: datesNormal,
                hasNotificationAlert: datesAlert,
                hasNotificationDue: datesDue,
                hasMaintenanceLog: datesWithMaintenanceLogs,
              }}
              modifiersClassNames={{
                hasNotification: "calendar-notification-day",
                hasNotificationAlert: "calendar-notification-alert-day",
                hasNotificationDue: "calendar-notification-due-day",
                hasMaintenanceLog: "calendar-maintenance-day",
              }}
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-muted-foreground">Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-muted-foreground">Alert</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-muted-foreground">Due</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(45 93% 47%)' }}></div>
                <span className="text-muted-foreground">Maintenance</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
            </h3>
            {(notificationsForSelectedDate.length > 0 || maintenanceLogsForSelectedDate.length > 0) ? (
              <div className="space-y-4">
                {notificationsForSelectedDate.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-primary">Notifications</h4>
                    {notificationsForSelectedDate.map((notification) => {
                      const cardStyle = getNotificationCardStyle(notification);
                      return (
                        <div
                          key={notification.id}
                          className={cardStyle.className}
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium">{notification.description}</h4>
                            <div className="flex gap-2">
                              {cardStyle.label !== "Normal" && (
                                <Badge 
                                  variant="outline" 
                                  className={cardStyle.label === "Due/Overdue" 
                                    ? "border-red-500 text-red-600 dark:text-red-400" 
                                    : "border-orange-500 text-orange-600 dark:text-orange-400"
                                  }
                                >
                                  {cardStyle.label}
                                </Badge>
                              )}
                              <Badge variant="outline">{notification.type}</Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Component: {notification.component}</p>
                            <p>Recurrence: {notification.recurrence}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {maintenanceLogsForSelectedDate.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold" style={{ color: "hsl(var(--chart-2))" }}>Maintenance Logs</h4>
                    {maintenanceLogsForSelectedDate.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 border rounded-lg space-y-2"
                        style={{ 
                          borderColor: "hsl(var(--chart-2) / 0.2)",
                          backgroundColor: "hsl(var(--chart-2) / 0.05)"
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium">{log.entry_title}</h4>
                          <Badge variant="secondary">{log.category}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Subcategory: {log.subcategory}</p>
                          <p>Performed by: {log.performed_by_name}</p>
                          {log.next_due_date && selectedDate && isSameDay(new Date(log.next_due_date), selectedDate) && (
                            <p className="font-medium text-orange-600">Next Due Date</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No items scheduled for this date</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarPanel;
