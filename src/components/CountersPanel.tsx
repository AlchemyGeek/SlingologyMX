import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "lucide-react";

interface CountersPanelProps {
  userId: string;
  aircraftId: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
}

interface CounterNotification {
  id: string;
  description: string;
  counter_type: string;
  initial_counter_value: number;
  type: string;
  alert_hours: number | null;
  notes: string | null;
}

const counterTypeToFieldMap: Record<string, keyof CountersPanelProps["currentCounters"] & string> = {
  Hobbs: "hobbs",
  Tach: "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

const CountersPanel = ({ userId, aircraftId, currentCounters }: CountersPanelProps) => {
  const [notifications, setNotifications] = useState<CounterNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounterNotifications = async () => {
      if (!aircraftId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, description, counter_type, initial_counter_value, type, alert_hours, notes")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .eq("is_completed", false)
        .eq("notification_basis", "Counter")
        .not("counter_type", "is", null);

      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    };

    fetchCounterNotifications();
  }, [userId, aircraftId]);

  // Group notifications by counter type and calculate remaining hours
  const groupedNotifications = useMemo(() => {
    if (!currentCounters) return {};

    const groups: Record<string, Array<CounterNotification & { remaining: number }>> = {};

    notifications.forEach((notification) => {
      const counterType = notification.counter_type;
      const field = counterTypeToFieldMap[counterType];
      if (!field) return;

      const currentValue = currentCounters[field] || 0;
      const targetValue = notification.initial_counter_value || 0;
      const remaining = targetValue - currentValue;

      if (!groups[counterType]) {
        groups[counterType] = [];
      }

      groups[counterType].push({ ...notification, remaining });
    });

    // Sort each group by remaining (low to high)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.remaining - b.remaining);
    });

    return groups;
  }, [notifications, currentCounters]);

  const counterTypes = Object.keys(groupedNotifications);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading counter notifications...</p>
      </div>
    );
  }

  if (counterTypes.length === 0) {
    return (
      <div className="text-center py-8">
        <Gauge className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Counter Notifications</h3>
        <p className="text-muted-foreground">
          Create counter-based notifications to track maintenance by usage hours.
        </p>
      </div>
    );
  }

  const getRemainingColor = (remaining: number) => {
    if (remaining < 0) return "bg-destructive text-destructive-foreground";
    if (remaining === 0) return "bg-orange-500 text-white";
    return "bg-primary text-primary-foreground";
  };

  const getRemainingBorderColor = (remaining: number) => {
    if (remaining < 0) return "border-l-destructive";
    if (remaining === 0) return "border-l-orange-500";
    return "border-l-primary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Counter-Based Notifications</h2>
      </div>

      {counterTypes.map((counterType) => {
        const items = groupedNotifications[counterType];
        const field = counterTypeToFieldMap[counterType];
        const currentValue = currentCounters ? currentCounters[field] : 0;

        return (
          <Card key={counterType} className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  {counterType}
                </CardTitle>
                <Badge variant="secondary" className="text-sm">
                  Current: {currentValue.toFixed(1)} hrs
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {items.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-center gap-4 p-4 border-l-4 ${getRemainingBorderColor(notification.remaining)}`}
                  >
                    <div
                      className={`flex-shrink-0 min-w-[80px] px-3 py-2 rounded-md text-center font-bold text-lg ${getRemainingColor(notification.remaining)}`}
                    >
                      {notification.remaining >= 0 ? "+" : ""}
                      {notification.remaining.toFixed(1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {notification.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>Due at: {notification.initial_counter_value} hrs</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{notification.type}</span>
                        {notification.alert_hours && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span>Alert at {notification.alert_hours} hrs</span>
                          </>
                        )}
                      </div>
                      {notification.notes && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {notification.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive" />
          <span>Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span>Due Now</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  );
};

export default CountersPanel;
