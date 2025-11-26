import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NotificationForm from "./NotificationForm";
import NotificationList from "./NotificationList";
import { toast } from "sonner";

interface NotificationsPanelProps {
  userId: string;
}

const NotificationsPanel = ({ userId }: NotificationsPanelProps) => {
  const [showForm, setShowForm] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
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
    fetchNotifications();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Notifications</CardTitle>
            <CardDescription>Create and view all your maintenance notifications</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
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
            onCancel={() => setShowForm(false)}
          />
        )}
        <NotificationList notifications={notifications} loading={loading} onUpdate={fetchNotifications} />
      </CardContent>
    </Card>
  );
};

export default NotificationsPanel;