import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SubscriptionForm from "./SubscriptionForm";
import SubscriptionList from "./SubscriptionList";
import { toast } from "sonner";

interface SubscriptionsPanelProps {
  userId: string;
}

const SubscriptionsPanel = ({ userId }: SubscriptionsPanelProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
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
  }, [userId]);

  const handleSubscriptionCreated = () => {
    setShowForm(false);
    setEditingSubscription(null);
    fetchSubscriptions();
  };

  const handleEdit = (subscription: any) => {
    setEditingSubscription(subscription);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSubscription(null);
  };

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
        {showForm && (
          <SubscriptionForm
            userId={userId}
            onSuccess={handleSubscriptionCreated}
            onCancel={handleCancelForm}
            editingSubscription={editingSubscription}
          />
        )}
        <SubscriptionList
          subscriptions={subscriptions}
          loading={loading}
          onUpdate={fetchSubscriptions}
          onEdit={handleEdit}
        />
      </CardContent>
    </Card>
  );
};

export default SubscriptionsPanel;