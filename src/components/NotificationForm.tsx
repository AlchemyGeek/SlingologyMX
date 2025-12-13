import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateInput } from "@/components/ui/date-input";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";

interface NotificationFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingNotification?: any;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
  notificationBasis?: "Date" | "Counter";
}

const counterTypeToFieldMap: Record<string, string> = {
  "Hobbs": "hobbs",
  "Tach": "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

const NotificationForm = ({ userId, onSuccess, onCancel, editingNotification, currentCounters, notificationBasis = "Date" }: NotificationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: editingNotification?.description || "",
    notes: editingNotification?.notes || "",
    type: editingNotification?.type || "Maintenance",
    initial_date: editingNotification?.initial_date ? parseLocalDate(editingNotification.initial_date) : null as Date | null,
    recurrence: editingNotification?.recurrence || "None",
    notification_basis: editingNotification?.notification_basis || notificationBasis,
    counter_type: editingNotification?.counter_type || "Hobbs",
    initial_counter_value: editingNotification?.initial_counter_value?.toString() || "",
    counter_step: editingNotification?.counter_step?.toString() || "",
    is_counter_recurring: editingNotification?.counter_step ? "Yes" : "No",
    alert_days: editingNotification?.alert_days?.toString() || "7",
    alert_hours: editingNotification?.alert_hours?.toString() || "10",
  });

  // Update initial counter value when counter type changes (for new notifications)
  useEffect(() => {
    if (!editingNotification && formData.notification_basis === "Counter" && currentCounters) {
      const field = counterTypeToFieldMap[formData.counter_type];
      const currentValue = currentCounters[field as keyof typeof currentCounters] || 0;
      setFormData(prev => ({ ...prev, initial_counter_value: currentValue.toString() }));
    }
  }, [formData.counter_type, formData.notification_basis, currentCounters, editingNotification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.description.length > 200) {
      toast.error("Notification must be 200 characters or less");
      return;
    }

    if (formData.notes.length > 1000) {
      toast.error("Notes must be 1000 characters or less");
      return;
    }

    // Validate counter-based notification fields
    if (formData.notification_basis === "Counter") {
      if (!formData.initial_counter_value) {
        toast.error("Initial counter value is required");
        return;
      }

      const initialValue = parseFloat(formData.initial_counter_value);
      if (currentCounters) {
        const field = counterTypeToFieldMap[formData.counter_type];
        const currentValue = currentCounters[field as keyof typeof currentCounters] || 0;
        if (initialValue < currentValue) {
          toast.error(`Initial value must be ${currentValue} or higher (current ${formData.counter_type} value)`);
          return;
        }
      }

      if (formData.is_counter_recurring === "Yes" && !formData.counter_step) {
        toast.error("Counter step is required for recurring counter notifications");
        return;
      }

      if (formData.is_counter_recurring === "Yes" && parseInt(formData.counter_step) <= 0) {
        toast.error("Counter step must be a positive integer");
        return;
      }
    }

    setLoading(true);

    try {
      const isCounterBased = formData.notification_basis === "Counter";
      
      const data: any = {
        user_id: userId,
        description: formData.description,
        notes: formData.notes,
        type: formData.type as "Maintenance" | "Subscription",
        notification_basis: formData.notification_basis,
        // For date-based
        initial_date: isCounterBased ? new Date().toISOString().split('T')[0] : (formData.initial_date ? format(formData.initial_date, "yyyy-MM-dd") : ""),
        recurrence: isCounterBased ? "None" : formData.recurrence,
        // For counter-based
        counter_type: isCounterBased ? formData.counter_type : null,
        initial_counter_value: isCounterBased ? parseFloat(formData.initial_counter_value) : null,
        counter_step: isCounterBased && formData.is_counter_recurring === "Yes" ? parseInt(formData.counter_step) : null,
        // Alert thresholds
        alert_days: isCounterBased ? null : parseInt(formData.alert_days) || 7,
        alert_hours: isCounterBased ? parseInt(formData.alert_hours) || 10 : null,
      };

      let error;
      if (editingNotification) {
        // Mark as user_modified when editing a record-linked notification
        const updateData = {
          ...data,
          user_modified: editingNotification.maintenance_log_id || editingNotification.directive_id || editingNotification.subscription_id ? true : data.user_modified
        };
        const result = await supabase.from("notifications").update(updateData).eq("id", editingNotification.id);
        error = result.error;
      } else {
        const result = await supabase.from("notifications").insert([data]);
        error = result.error;
      }

      if (error) throw error;
      toast.success(editingNotification ? "Notification updated successfully!" : "Notification created successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isCounterBased = formData.notification_basis === "Counter";

  return (
    <Card className="p-4 bg-muted/50">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Notification</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            placeholder="Describe the notification name..."
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{formData.description.length}/200 characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            maxLength={1000}
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">{formData.notes.length}/1000 characters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Subscription">Subscription</SelectItem>
                <SelectItem value="Directives">Directives</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Date-based fields */}
        {!isCounterBased && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert_days">Alert Days Before Due</Label>
              <Input
                id="alert_days"
                type="number"
                min="0"
                value={formData.alert_days}
                onChange={(e) => setFormData({ ...formData, alert_days: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Days before due date to show alert (default: 7)</p>
            </div>
          </div>
        )}

        {/* Counter-based fields */}
        {isCounterBased && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="counter_type">Counter Type</Label>
                <Select
                  value={formData.counter_type}
                  onValueChange={(value) => setFormData({ ...formData, counter_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hobbs">Hobbs</SelectItem>
                    <SelectItem value="Tach">Tach</SelectItem>
                    <SelectItem value="Airframe TT">Airframe TT</SelectItem>
                    <SelectItem value="Engine TT">Engine TT</SelectItem>
                    <SelectItem value="Prop TT">Prop TT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_counter_value">Initial Counter Value</Label>
                <Input
                  id="initial_counter_value"
                  type="number"
                  step="0.1"
                  min={currentCounters ? currentCounters[counterTypeToFieldMap[formData.counter_type] as keyof typeof currentCounters] : 0}
                  value={formData.initial_counter_value}
                  onChange={(e) => setFormData({ ...formData, initial_counter_value: e.target.value })}
                  required
                />
                {currentCounters && (
                  <p className="text-xs text-muted-foreground">
                    Current {formData.counter_type}: {currentCounters[counterTypeToFieldMap[formData.counter_type] as keyof typeof currentCounters] || 0}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recurring?</Label>
              <RadioGroup
                value={formData.is_counter_recurring}
                onValueChange={(value) => setFormData({ ...formData, is_counter_recurring: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="counter_recurring_no" />
                  <Label htmlFor="counter_recurring_no" className="font-normal">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="counter_recurring_yes" />
                  <Label htmlFor="counter_recurring_yes" className="font-normal">Yes</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.is_counter_recurring === "Yes" && (
              <div className="space-y-2">
                <Label htmlFor="counter_step">Counter Step (hours)</Label>
                <Input
                  id="counter_step"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.counter_step}
                  onChange={(e) => setFormData({ ...formData, counter_step: e.target.value })}
                  placeholder="e.g., 100 for every 100 hours"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="alert_hours">Alert Hours Before Due</Label>
              <Input
                id="alert_hours"
                type="number"
                min="0"
                step="1"
                value={formData.alert_hours}
                onChange={(e) => setFormData({ ...formData, alert_hours: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Hours before due counter value to show alert (default: 10)</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading
              ? editingNotification
                ? "Updating..."
                : "Creating..."
              : editingNotification
                ? "Update Notification"
                : "Create Notification"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default NotificationForm;