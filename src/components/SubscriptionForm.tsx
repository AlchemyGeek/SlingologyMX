import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { format, addWeeks, addMonths, subMonths, isSameDay } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency";
import { toast } from "sonner";
import BackfillTransactionsDialog, { calculateMissedOccurrences } from "./BackfillTransactionsDialog";

// Calculate the next occurrence date based on initial_date and recurrence
// Returns null if the next occurrence is past the final_date
const getNextOccurrence = (initialDate: Date, recurrence: string, finalDate?: Date | null): Date | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let current = new Date(initialDate);
  current.setHours(0, 0, 0, 0);
  
  // If initial date is in the future, check against final date
  if (current >= today) {
    if (finalDate) {
      const final = new Date(finalDate);
      final.setHours(0, 0, 0, 0);
      return current <= final ? current : null;
    }
    return current;
  }
  
  // Otherwise, calculate the next occurrence
  while (current < today) {
    switch (recurrence) {
      case "Weekly":
        current = addWeeks(current, 1);
        break;
      case "Bi-Monthly":
        current = addWeeks(current, 2);
        break;
      case "Monthly":
        current = addMonths(current, 1);
        break;
      case "Quarterly":
        current = addMonths(current, 3);
        break;
      case "Semi-Annual":
        current = addMonths(current, 6);
        break;
      case "Yearly":
        current = addMonths(current, 12);
        break;
      default:
        return current;
    }
  }
  
  // Check if the calculated next occurrence is past the final date
  if (finalDate) {
    const final = new Date(finalDate);
    final.setHours(0, 0, 0, 0);
    return current <= final ? current : null;
  }
  
  return current;
};

interface SubscriptionFormProps {
  userId: string;
  aircraftId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingSubscription?: any;
  userCurrency?: string;
}

const SUBSCRIPTION_TYPES = [
  "Facilities & Storage",
  "Insurance",
  "Avionics Data & Services",
  "Navigation, Charts & Flight Planning",
  "Weather Services",
  "Maintenance, Compliance & Records",
  "Hardware Services & Fees",
  "Training & Proficiency",
  "Memberships & Associations",
  "Publications & Media",
  "Operations & Administration",
  "Other",
] as const;

const SubscriptionForm = ({ userId, aircraftId, onSuccess, onCancel, editingSubscription, userCurrency = "USD" }: SubscriptionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showBackfillDialog, setShowBackfillDialog] = useState(false);
  const [missedDates, setMissedDates] = useState<Date[]>([]);
  const [pendingSubscriptionData, setPendingSubscriptionData] = useState<any>(null);
  const [formData, setFormData] = useState({
    subscription_name: editingSubscription?.subscription_name || "",
    notes: editingSubscription?.notes || "",
    type: editingSubscription?.type || "Other",
    cost: editingSubscription?.cost?.toString() || "",
    initial_date: editingSubscription?.initial_date ? parseLocalDate(editingSubscription.initial_date) : null as Date | null,
    final_date: editingSubscription?.final_date ? parseLocalDate(editingSubscription.final_date) : null as Date | null,
    recurrence: editingSubscription?.recurrence || "Yearly",
  });

  // Helper to create a single transaction
  const createTransaction = async (
    subscriptionId: string,
    transactionDate: Date,
    subscriptionData: any
  ) => {
    const { error } = await supabase.from("transactions").insert([{
      user_id: userId,
      aircraft_id: aircraftId,
      title: subscriptionData.subscription_name,
      transaction_date: format(transactionDate, "yyyy-MM-dd"),
      amount: subscriptionData.cost || 0,
      currency: userCurrency,
      direction: "Debit" as const,
      intent: "Operation" as const,
      category: subscriptionData.type === "Insurance" ? "Insurance" :
               subscriptionData.type === "Facilities & Storage" ? "Hangar / Tie-Down" :
               "Other" as const,
      status: "Pending" as const,
      source: "Commitment" as const,
      reference_id: subscriptionId,
      reference_type: "Commitment" as const,
      generated_for_period: format(transactionDate, "yyyy-MM"),
    }]);
    
    if (error) throw error;
  };

  // Handle backfill confirmation
  const handleBackfillConfirm = async (count: number) => {
    if (!pendingSubscriptionData) return;
    
    setLoading(true);
    try {
      // Create the subscription first
      const { data: newSubscription, error: subError } = await supabase
        .from("subscriptions")
        .insert([pendingSubscriptionData])
        .select()
        .single();

      if (subError) throw subError;

      // Create transactions for selected dates
      if (count > 0) {
        const datesToCreate = missedDates.slice(-count);
        for (const date of datesToCreate) {
          await createTransaction(newSubscription.id, date, pendingSubscriptionData);
        }

        // Update last_transaction_date to the most recent created transaction
        const mostRecentDate = datesToCreate[datesToCreate.length - 1];
        await supabase
          .from("subscriptions")
          .update({ last_transaction_date: format(mostRecentDate, "yyyy-MM-dd") })
          .eq("id", newSubscription.id);

        toast.success(`Commitment created! ${count} pending transaction${count !== 1 ? 's' : ''} created for review.`);
      } else {
        toast.success("Commitment created successfully!");
      }

      // Handle notification creation for recurring subscriptions
      await handleNotificationCreation(newSubscription.id, pendingSubscriptionData);

      setPendingSubscriptionData(null);
      setMissedDates([]);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle notification creation (extracted for reuse)
  const handleNotificationCreation = async (subscriptionId: string, subscriptionData: any) => {
    const isRecurring = subscriptionData.recurrence !== "None";
    if (!isRecurring || !subscriptionData.initial_date) return;

    const initialDate = typeof subscriptionData.initial_date === 'string' 
      ? parseLocalDate(subscriptionData.initial_date) 
      : subscriptionData.initial_date;
    
    const finalDate = subscriptionData.final_date 
      ? (typeof subscriptionData.final_date === 'string' 
        ? parseLocalDate(subscriptionData.final_date) 
        : subscriptionData.final_date)
      : null;

    const nextOccurrence = getNextOccurrence(initialDate, subscriptionData.recurrence, finalDate);
    
    if (nextOccurrence) {
      const nextOccurrenceStr = format(nextOccurrence, "yyyy-MM-dd");
      
      await supabase.from("notifications").insert([{
        user_id: userId,
        aircraft_id: aircraftId,
        description: subscriptionData.subscription_name,
        notes: subscriptionData.notes || null,
        type: "Subscription" as const,
        initial_date: nextOccurrenceStr,
        recurrence: "None" as const,
        subscription_id: subscriptionId,
      }]);
    }
  };

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

    // Validate initial date is not more than 12 months in the past
    if (formData.initial_date) {
      const twelveMonthsAgo = subMonths(new Date(), 12);
      twelveMonthsAgo.setHours(0, 0, 0, 0);
      
      if (formData.initial_date < twelveMonthsAgo) {
        toast.error("Initial date cannot be more than 12 months in the past");
        return;
      }
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

        if (isRecurring && formData.initial_date) {
          // Calculate the next occurrence date for notifications (respecting final_date)
          const nextOccurrence = getNextOccurrence(formData.initial_date, formData.recurrence, formData.final_date);
          
          if (nextOccurrence) {
            const nextOccurrenceStr = format(nextOccurrence, "yyyy-MM-dd");
            
            if (existingNotif) {
              // Update existing notification (might fail if user deleted it, that's ok)
              await supabase
                .from("notifications")
                .update({
                  description: formData.subscription_name,
                  notes: formData.notes || null,
                  type: "Subscription" as const,
                  initial_date: nextOccurrenceStr,
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
                initial_date: nextOccurrenceStr,
                recurrence: "None" as const,
                subscription_id: editingSubscription.id,
              }]);

              if (notifError) throw notifError;
              toast.info("A renewal reminder notification has been created for this commitment.");
            }
          } else if (existingNotif) {
            // Next occurrence is past final date, delete existing notification
            await supabase
              .from("notifications")
              .delete()
              .eq("subscription_id", editingSubscription.id);
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
        // NEW: Check for missed occurrences before creating subscription
        if (formData.initial_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const initialDate = new Date(formData.initial_date);
          initialDate.setHours(0, 0, 0, 0);

          // Calculate missed occurrences
          const missed = calculateMissedOccurrences(
            formData.initial_date,
            formData.recurrence,
            formData.final_date
          );

          if (missed.length > 1) {
            // Multiple missed occurrences - show dialog
            setMissedDates(missed);
            setPendingSubscriptionData(subscriptionData);
            setShowBackfillDialog(true);
            setLoading(false);
            return; // Exit early, dialog will handle creation
          } else if (missed.length === 1) {
            // Single occurrence (today or one past date) - create silently
            const { data: newSubscription, error: subError } = await supabase
              .from("subscriptions")
              .insert([subscriptionData])
              .select()
              .single();

            if (subError) throw subError;

            // Create the single transaction
            await createTransaction(newSubscription.id, missed[0], subscriptionData);

            // Update last_transaction_date
            await supabase
              .from("subscriptions")
              .update({ last_transaction_date: format(missed[0], "yyyy-MM-dd") })
              .eq("id", newSubscription.id);

            // Handle notification
            await handleNotificationCreation(newSubscription.id, subscriptionData);

            toast.success("Commitment created! 1 pending transaction created for review.");
            onSuccess();
            return;
          }
        }

        // Future date or no missed occurrences - standard creation
        const { data: newSubscription, error: subError } = await supabase
          .from("subscriptions")
          .insert([subscriptionData])
          .select()
          .single();

        if (subError) throw subError;

        // Only create notification for recurring subscriptions
        if (isRecurring && formData.initial_date) {
          // Calculate the next occurrence date for notifications (respecting final_date)
          const nextOccurrence = getNextOccurrence(formData.initial_date, formData.recurrence, formData.final_date);
          
          if (nextOccurrence) {
            const nextOccurrenceStr = format(nextOccurrence, "yyyy-MM-dd");
            
            const notificationData = {
              user_id: userId,
              aircraft_id: aircraftId,
              description: formData.subscription_name,
              notes: formData.notes || null,
              type: "Subscription" as const,
              initial_date: nextOccurrenceStr,
              recurrence: "None" as const,
              subscription_id: newSubscription.id,
            };

            const { error: notifError } = await supabase.from("notifications").insert([notificationData]);

            if (notifError) throw notifError;

            toast.success("Commitment created! A renewal reminder notification has been added.");
          } else {
            toast.success("Commitment created! No notification added as the next occurrence is past the final date.");
          }
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
          <Label htmlFor="subscription_name">Commitment Name <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="cost">Cost ({getCurrencySymbol(userCurrency)})</Label>
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
            <Label htmlFor="initial_date">Initial Date <span className="text-destructive">*</span></Label>
            <DateInput
              id="initial_date"
              value={formData.initial_date}
              onChange={(date) => setFormData({ ...formData, initial_date: date })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="final_date">Final Date</Label>
            <DateInput
              id="final_date"
              value={formData.final_date}
              onChange={(date) => setFormData({ ...formData, final_date: date })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence <span className="text-destructive">*</span></Label>
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

      <BackfillTransactionsDialog
        open={showBackfillDialog}
        onOpenChange={setShowBackfillDialog}
        onConfirm={handleBackfillConfirm}
        missedDates={missedDates}
        subscriptionName={formData.subscription_name}
      />
    </Card>
  );
};

export default SubscriptionForm;