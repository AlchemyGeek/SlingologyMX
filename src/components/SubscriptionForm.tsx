import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";

interface SubscriptionFormProps {
  userId: string;
  aircraftId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingSubscription?: any;
}

const SUBSCRIPTION_TYPES = [
  "Facilities & Storage",
  "Insurance",
  "Navigation, Charts & Flight Planning",
  "Avionics Data & Services",
  "Maintenance, Compliance & Records",
  "Training, Proficiency & Safety",
  "Memberships & Associations",
  "Publications & Media",
  "Operations & Administration",
  "Hardware-Related Services",
  "Other",
] as const;

const SubscriptionForm = ({ userId, aircraftId, onSuccess, onCancel, editingSubscription }: SubscriptionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subscription_name: editingSubscription?.subscription_name || "",
    notes: editingSubscription?.notes || "",
    type: editingSubscription?.type || "Other",
    cost: editingSubscription?.cost?.toString() || "",
    initial_date: editingSubscription?.initial_date ? parseLocalDate(editingSubscription.initial_date) : null as Date | null,
    final_date: editingSubscription?.final_date ? parseLocalDate(editingSubscription.final_date) : null as Date | null,
    recurrence: editingSubscription?.recurrence || "Yearly",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.subscription_name.length > 200) {
      toast.error("Commitment name must be 200 characters or less");
      return;
    }

    if (formData.notes.length > 500) {
      toast.error("Notes must be 500 characters or less");
      return;
    }

    const costValue = formData.cost ? parseInt(formData.cost) : null;
    if (costValue !== null && (isNaN(costValue) || costValue < 0)) {
      toast.error("Cost must be a positive number");
      return;
    }

    setLoading(true);

    try {
      const initialDateStr = formData.initial_date ? format(formData.initial_date, "yyyy-MM-dd") : "";
      const finalDateStr = formData.final_date ? format(formData.final_date, "yyyy-MM-dd") : null;
      
      const subscriptionData = {
        user_id: userId,
        aircraft_id: aircraftId,
        subscription_name: formData.subscription_name,
        notes: formData.notes || null,
        type: formData.type as typeof SUBSCRIPTION_TYPES[number],
        cost: costValue,
        initial_date: initialDateStr,
        final_date: finalDateStr,
        recurrence: formData.recurrence as "None" | "Weekly" | "Bi-Monthly" | "Monthly" | "Semi-Annual" | "Yearly",
      };

      const isRecurring = formData.recurrence !== "None";

      if (editingSubscription) {
        // Update subscription
        const { error: subError } = await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", editingSubscription.id);

        if (subError) throw subError;

        // Check if there's an existing linked notification
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("subscription_id", editingSubscription.id)
          .maybeSingle();

        if (isRecurring) {
          if (existingNotif) {
            // Update existing notification (might fail if user deleted it, that's ok)
            await supabase
              .from("notifications")
              .update({
                description: formData.subscription_name,
                notes: formData.notes || null,
                type: "Subscription" as const,
                initial_date: initialDateStr,
                recurrence: "None" as const,
              })
              .eq("subscription_id", editingSubscription.id);
          } else {
            // Create new notification (subscription changed from non-recurring to recurring)
            const { error: notifError } = await supabase.from("notifications").insert([{
              user_id: userId,
              aircraft_id: aircraftId,
              description: formData.subscription_name,
              notes: formData.notes || null,
              type: "Subscription" as const,
              initial_date: initialDateStr,
              recurrence: "None" as const,
              subscription_id: editingSubscription.id,
            }]);

            if (notifError) throw notifError;
            toast.info("A renewal reminder notification has been created for this commitment.");
          }
        } else if (existingNotif) {
          // Delete notification if subscription changed to non-recurring
          // Notification might already be deleted by user, so ignore errors
          await supabase
            .from("notifications")
            .delete()
            .eq("subscription_id", editingSubscription.id);
        }

        toast.success("Commitment updated successfully!");
      } else {
        // Create subscription
        const { data: newSubscription, error: subError } = await supabase
          .from("subscriptions")
          .insert([subscriptionData])
          .select()
          .single();

        if (subError) throw subError;

        // Only create notification for recurring subscriptions
        if (isRecurring) {
          const notificationData = {
            user_id: userId,
            aircraft_id: aircraftId,
            description: formData.subscription_name,
            notes: formData.notes || null,
            type: "Subscription" as const,
            initial_date: initialDateStr,
            recurrence: "None" as const,
            subscription_id: newSubscription.id,
          };

          const { error: notifError } = await supabase.from("notifications").insert([notificationData]);

          if (notifError) throw notifError;

          toast.success("Commitment created! A renewal reminder notification has been added.");
        } else {
          toast.success("Commitment created successfully!");
        }
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
          <Label htmlFor="subscription_name">Commitment Name</Label>
          <Input
            id="subscription_name"
            value={formData.subscription_name}
            onChange={(e) => setFormData({ ...formData, subscription_name: e.target.value })}
            required
            placeholder="Enter commitment name..."
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
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="Enter cost (optional)..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial_date">Initial Date</Label>
            <DateInput
              id="initial_date"
              value={formData.initial_date}
              onChange={(date) => setFormData({ ...formData, initial_date: date })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="final_date">Final Date (optional)</Label>
            <DateInput
              id="final_date"
              value={formData.final_date}
              onChange={(date) => setFormData({ ...formData, final_date: date })}
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
                ? "Update Commitment"
                : "Create Commitment"}
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