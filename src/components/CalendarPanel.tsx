import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, isSameDay, addDays, addWeeks, addMonths } from "date-fns";

interface CalendarPanelProps {
  userId: string;
}

const CalendarPanel = ({ userId }: CalendarPanelProps) => {
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

  const getNotificationsForDate = (date: Date) => {
    return notifications.filter((notification) => {
      const initialDate = new Date(notification.initial_date);
      
      // Check if the initial date matches
      if (isSameDay(initialDate, date)) {
        return true;
      }

      // Check recurring dates (up to 10 occurrences in the future)
      for (let i = 1; i <= 10; i++) {
        const nextDate = getNextOccurrenceDate(initialDate, notification.recurrence, i);
        if (isSameDay(nextDate, date)) {
          return true;
        }
        // Stop checking if we've gone past the selected date
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
      
      // Check next due date if it exists
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

  const getDatesWithNotifications = () => {
    const dates: Date[] = [];
    notifications.forEach((notification) => {
      const initialDate = new Date(notification.initial_date);
      dates.push(initialDate);

      // Add recurring dates for the current month and next 3 months
      for (let i = 1; i <= 10; i++) {
        const nextDate = getNextOccurrenceDate(initialDate, notification.recurrence, i);
        dates.push(nextDate);
      }
    });
    return dates;
  };

  const getDatesWithMaintenanceLogs = () => {
    const dates: Date[] = [];
    maintenanceLogs.forEach((log) => {
      dates.push(new Date(log.date_performed));
      if (log.next_due_date) {
        dates.push(new Date(log.next_due_date));
      }
    });
    return dates;
  };

  const datesWithNotifications = getDatesWithNotifications();
  const datesWithMaintenanceLogs = getDatesWithMaintenanceLogs();

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
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                hasNotification: datesWithNotifications,
                hasMaintenanceLog: datesWithMaintenanceLogs,
              }}
              modifiersStyles={{
                hasNotification: {
                  fontWeight: "bold",
                  color: "hsl(var(--primary))",
                },
                hasMaintenanceLog: {
                  fontWeight: "bold",
                  color: "hsl(var(--chart-2))",
                },
              }}
            />
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-muted-foreground">Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-2"></div>
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
                    {notificationsForSelectedDate.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 border border-primary/20 bg-primary/5 rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium">{notification.description}</h4>
                          <Badge variant="outline">{notification.type}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Component: {notification.component}</p>
                          <p>Recurrence: {notification.recurrence}</p>
                        </div>
                      </div>
                    ))}
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
                          {log.next_due_date && isSameDay(new Date(log.next_due_date), selectedDate) && (
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
