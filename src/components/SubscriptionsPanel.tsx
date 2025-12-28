import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SubscriptionForm from "./SubscriptionForm";
import SubscriptionList from "./SubscriptionList";
import SubscriptionDetail from "./SubscriptionDetail";
import { toast } from "sonner";

interface SubscriptionsPanelProps {
  userId: string;
  aircraftId: string;
  onNotificationChanged?: () => void;
  onRecordChanged?: () => void;
}

const SubscriptionsPanel = ({ userId, aircraftId, onNotificationChanged, onRecordChanged }: SubscriptionsPanelProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    if (!aircraftId) return;
    
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [userId, aircraftId]);

  const handleSubscriptionCreated = () => {
    setShowForm(false);
    setEditingSubscription(null);
    fetchSubscriptions();
    onNotificationChanged?.();
    onRecordChanged?.();
  };

  const handleEdit = (subscription: any) => {
    setSelectedSubscription(null);
    setEditingSubscription(subscription);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSubscription(null);
  };

  const handleSelect = (subscription: any) => {
    setSelectedSubscription(subscription);
  };

  const handleCloseDetail = () => {
    setSelectedSubscription(null);
  };

  const handleDelete = async (subscriptionId: string) => {
    try {
      const { error } = await supabase.from("subscriptions").delete().eq("id", subscriptionId);
      if (error) throw error;
      toast.success("Subscription deleted");
      setSelectedSubscription(null);
      fetchSubscriptions();
      onNotificationChanged?.();
      onRecordChanged?.();
    } catch (error: any) {
      toast.error("Failed to delete subscription");
    }
  };

  // Show detail view
  if (selectedSubscription) {
    return (
      <Card>
        <CardContent className="pt-6">
          <SubscriptionDetail
            subscription={selectedSubscription}
            onClose={handleCloseDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Subscriptions</CardTitle>
            <CardDescription>Create and manage your aviation subscriptions</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Subscription
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <SubscriptionForm
            userId={userId}
            aircraftId={aircraftId}
            onSuccess={handleSubscriptionCreated}
            onCancel={handleCancelForm}
            editingSubscription={editingSubscription}
          />
        ) : (
          <SubscriptionList
            subscriptions={subscriptions}
            loading={loading}
            onUpdate={() => {
              fetchSubscriptions();
              onNotificationChanged?.();
              onRecordChanged?.();
            }}
            onEdit={handleEdit}
            onSelect={handleSelect}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionsPanel;