import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationForm from "./NotificationForm";
import NotificationList from "./NotificationList";
import CounterNotificationList from "./CounterNotificationList";
import { toast } from "sonner";

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
  const [showForm, setShowForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any>(null);
  const [dateNotifications, setDateNotifications] = useState<any[]>([]);
  const [counterNotifications, setCounterNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"date" | "counter">("date");

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const dateBasedNotifs = (data || []).filter(n => n.notification_basis === "Date" || !n.notification_basis);
      const counterBasedNotifs = (data || []).filter(n => n.notification_basis === "Counter");
      
      setDateNotifications(dateBasedNotifs);
      setCounterNotifications(counterBasedNotifs);
    } catch (error: any) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

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
          <div>
            <CardTitle>Manage Notifications</CardTitle>
            <CardDescription>Create and view all your maintenance notifications</CardDescription>
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
          
          <TabsContent value="date" className="mt-4">
            <NotificationList 
              notifications={dateNotifications} 
              loading={loading} 
              onUpdate={fetchNotifications}
              onEdit={handleEdit}
            />
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