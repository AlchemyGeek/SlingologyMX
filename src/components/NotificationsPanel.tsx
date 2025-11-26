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
  const [editingNotification, setEditingNotification] = useState<any>(null);
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
            onCancel={handleCancelForm}
            editingNotification={editingNotification}
          />
        )}
        <NotificationList 
          notifications={notifications} 
          loading={loading} 
          onUpdate={fetchNotifications}
          onEdit={handleEdit}
        />
      </CardContent>
    </Card>
  );
};

export default NotificationsPanel;