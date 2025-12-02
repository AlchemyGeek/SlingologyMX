import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface SubscriptionFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingSubscription?: any;
}

const SUBSCRIPTION_TYPES = [
  "EFB & Flight Planning",
  "Avionics Subscriptions",
  "Aircraft Maintenance, Tracking, & Record Services",
  "Proficiency & Safety Tools",
  "Aviation Community Memberships",
  "Weather Tools",
  "Magazine Subscription",
  "Aircraft Operations & Financial Tools",
  "Hardware-Related Annual Fees",
  "Insurance Related Add-Ons",
  "Other",
] as const;

const SubscriptionForm = ({ userId, onSuccess, onCancel, editingSubscription }: SubscriptionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subscription_name: editingSubscription?.subscription_name || "",
    notes: editingSubscription?.notes || "",
    type: editingSubscription?.type || "Other",
    cost: editingSubscription?.cost?.toString() || "",
    initial_date: editingSubscription?.initial_date || "",
    recurrence: editingSubscription?.recurrence || "Yearly",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.subscription_name.length > 200) {
      toast.error("Subscription name must be 200 characters or less");
      return;
    }

    if (formData.notes.length > 500) {
      toast.error("Notes must be 500 characters or less");
      return;
    }

    const costValue = parseInt(formData.cost);
    if (isNaN(costValue) || costValue <= 0) {
      toast.error("Cost must be a positive number");
      return;
    }

    setLoading(true);

    try {
      const subscriptionData = {
        user_id: userId,
        subscription_name: formData.subscription_name,
        notes: formData.notes || null,
        type: formData.type as typeof SUBSCRIPTION_TYPES[number],
        cost: costValue,
        initial_date: formData.initial_date,
        recurrence: formData.recurrence as "None" | "Weekly" | "Bi-Monthly" | "Monthly" | "Semi-Annual" | "Yearly",
      };

      if (editingSubscription) {
        // Update subscription
        const { error: subError } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", editingSubscription.id);

        if (subError) throw subError;

        // Update linked notification
        const notificationData = {
          description: formData.subscription_name,
          notes: formData.notes || null,
          type: "Subscription" as const,
          component: "Other" as const,
          initial_date: formData.initial_date,
          recurrence: formData.recurrence,
        };

        const { error: notifError } = await supabase
          .from("notifications")
          .update(notificationData)
          .eq("subscription_id", editingSubscription.id);

        if (notifError) throw notifError;

        toast.success("Subscription updated successfully!");
      } else {
        // Create subscription
        const { data: newSubscription, error: subError } = await supabase
          .from("subscriptions")
          .insert([subscriptionData])
          .select()
          .single();

        if (subError) throw subError;

        // Create linked notification
        const notificationData = {
          user_id: userId,
          description: formData.subscription_name,
          notes: formData.notes || null,
          type: "Subscription" as const,
          component: "Other" as const,
          initial_date: formData.initial_date,
          recurrence: formData.recurrence,
          subscription_id: newSubscription.id,
        };

        const { error: notifError } = await supabase.from("notifications").insert([notificationData]);

        if (notifError) throw notifError;

        toast.success("Subscription created successfully!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-muted/50">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subscription_name">Subscription Name</Label>
          <Input
            id="subscription_name"
            value={formData.subscription_name}
            onChange={(e) => setFormData({ ...formData, subscription_name: e.target.value })}
            required
            placeholder="Enter subscription name..."
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{formData.subscription_name.length}/200 characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            maxLength={500}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">{formData.notes.length}/500 characters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              min="1"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
              placeholder="Enter cost..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial_date">Initial Date</Label>
            <Input
              id="initial_date"
              type="date"
              value={formData.initial_date}
              onChange={(e) => setFormData({ ...formData, initial_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence</Label>
            <Select
              value={formData.recurrence}
              onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Bi-Monthly">Bi-Monthly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                <SelectItem value="Yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading
              ? editingSubscription
                ? "Updating..."
                : "Creating..."
              : editingSubscription
                ? "Update Subscription"
                : "Create Subscription"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default SubscriptionForm;