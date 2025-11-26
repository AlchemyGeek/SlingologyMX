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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_completed", false);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast.error("Failed to load notifications");
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

  const notificationsForSelectedDate = selectedDate
    ? getNotificationsForDate(selectedDate)
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

  const datesWithNotifications = getDatesWithNotifications();

  if (loading) {
    return <p className="text-muted-foreground">Loading calendar...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar View</CardTitle>
        <CardDescription>View your scheduled maintenance notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasNotification: datesWithNotifications,
              }}
              modifiersStyles={{
                hasNotification: {
                  fontWeight: "bold",
                  textDecoration: "underline",
                },
              }}
            />
          </div>

          <div>
            <h3 className="font-semibold mb-4">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
            </h3>
            {notificationsForSelectedDate.length > 0 ? (
              <div className="space-y-3">
                {notificationsForSelectedDate.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 border rounded-lg space-y-2"
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
            ) : (
              <p className="text-muted-foreground">No notifications scheduled for this date</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarPanel;
