import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationForm from "./NotificationForm";
import NotificationList from "./NotificationList";
import CounterNotificationList from "./CounterNotificationList";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";

interface NotificationsPanelProps {
  userId: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
}

const NotificationsPanel = ({ userId, currentCounters }: NotificationsPanelProps) => {
  console.log("=== NOTIFICATIONS PANEL MOUNTED ===");
  const [showForm, setShowForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any>(null);
  const [dateNotifications, setDateNotifications] = useState<any[]>([]);
  const [counterNotifications, setCounterNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"date" | "counter">("date");

  const fetchNotifications = async () => {
    try {
      // Fetch notifications
      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (notifError) throw notifError;
      
      // Fetch subscriptions to derive recurrence for subscription-linked notifications
      const subscriptionIds = (notifData || [])
        .filter(n => n.subscription_id)
        .map(n => n.subscription_id);
      
      let subscriptionsMap: Record<string, any> = {};
      if (subscriptionIds.length > 0) {
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("id, recurrence")
          .in("id", subscriptionIds);
        
        if (subData) {
          subscriptionsMap = subData.reduce((acc, sub) => {
            acc[sub.id] = sub;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      
      // Enrich notifications with derived recurrence
      const enrichedData = (notifData || []).map(n => ({
        ...n,
        derived_recurrence: n.subscription_id && subscriptionsMap[n.subscription_id]
          ? subscriptionsMap[n.subscription_id].recurrence
          : n.recurrence
      }));
      
      const dateBasedNotifs = enrichedData.filter(n => n.notification_basis === "Date" || !n.notification_basis);
      const counterBasedNotifs = enrichedData.filter(n => n.notification_basis === "Counter");
      
      setDateNotifications(dateBasedNotifs);
      setCounterNotifications(counterBasedNotifs);
    } catch (error: any) {
      toast.error("Failed to load notifications");
    } finally {
    setLoading(false);
    }
  };

  const counterTypeToFieldMap: Record<string, string> = {
    "Hobbs": "hobbs",
    "Tach": "tach",
    "Airframe TT": "airframe_total_time",
    "Engine TT": "engine_total_time",
    "Prop TT": "prop_total_time",
  };

  const hasActiveAlerts = useMemo(() => {
    const activeNotifs = [...dateNotifications, ...counterNotifications].filter(n => !n.is_completed);
    
    return activeNotifs.some(notification => {
      if (notification.notification_basis === "Counter" || notification.counter_type) {
        // Counter-based
        if (!currentCounters || !notification.counter_type) return false;
        const field = counterTypeToFieldMap[notification.counter_type];
        const currentValue = currentCounters[field as keyof typeof currentCounters] || 0;
        const targetValue = notification.initial_counter_value || 0;
        const remaining = targetValue - currentValue;
        const alertHours = notification.alert_hours ?? 10;
        return remaining <= alertHours;
      } else {
        // Date-based
        const dueDate = parseLocalDate(notification.initial_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const alertDays = notification.alert_days ?? 7;
        return diffDays <= alertDays;
      }
    });
  }, [dateNotifications, counterNotifications, currentCounters]);

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const handleNotificationCreated = () => {
    setShowForm(false);
    setEditingNotification(null);
    fetchNotifications();
  };

  const handleEdit = (notification: any) => {
    setEditingNotification(notification);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingNotification(null);
  };

  const handleNewNotification = () => {
    setEditingNotification(null);
    setShowForm(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                Manage Notifications
                {hasActiveAlerts && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </CardTitle>
              <CardDescription>Create and view all your maintenance notifications</CardDescription>
            </div>
          </div>
          <Button onClick={handleNewNotification}>
            <Plus className="h-4 w-4 mr-2" />
            New Notification
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <NotificationForm
            userId={userId}
            onSuccess={handleNotificationCreated}
            onCancel={handleCancelForm}
            editingNotification={editingNotification}
            currentCounters={currentCounters}
            notificationBasis={activeTab === "counter" ? "Counter" : "Date"}
          />
        )}
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "date" | "counter")}>
          <TabsList>
            <TabsTrigger value="date">Date Based ({dateNotifications.length})</TabsTrigger>
            <TabsTrigger value="counter">Counter Based ({counterNotifications.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="date" className="mt-4" forceMount>
            {activeTab === "date" && (
              <NotificationList 
                notifications={dateNotifications} 
                loading={loading} 
                onUpdate={fetchNotifications}
                onEdit={handleEdit}
              />
            )}
          </TabsContent>
          
          <TabsContent value="counter" className="mt-4">
            <CounterNotificationList 
              notifications={counterNotifications} 
              loading={loading} 
              onUpdate={fetchNotifications}
              onEdit={handleEdit}
              currentCounters={currentCounters}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NotificationsPanel;