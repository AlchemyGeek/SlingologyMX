import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface NotificationFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingNotification?: any;
}

const NotificationForm = ({ userId, onSuccess, onCancel, editingNotification }: NotificationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: editingNotification?.description || "",
    notes: editingNotification?.notes || "",
    type: editingNotification?.type || "Maintenance",
    component: editingNotification?.component || "Airframe",
    initial_date: editingNotification?.initial_date || "",
    recurrence: editingNotification?.recurrence || "Monthly",
  });

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
    
    setLoading(true);

    try {
      const data = {
        user_id: userId,
        description: formData.description,
        notes: formData.notes,
        type: formData.type as "Maintenance" | "Subscription",
        component: formData.component as "Airframe" | "Propeller" | "Avionics" | "Other",
        initial_date: formData.initial_date,
        recurrence: formData.recurrence as "Weekly" | "Bi-Monthly" | "Monthly" | "Quarterly" | "Semi-Annual" | "Yearly",
      };

      let error;
      if (editingNotification) {
        const result = await supabase
          .from("notifications")
          .update(data)
          .eq("id", editingNotification.id);
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
            placeholder="Describe the maintenance task..."
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
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Subscription">Subscription</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="component">Component</Label>
            <Select
              value={formData.component}
              onValueChange={(value) => setFormData({ ...formData, component: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Airframe">Airframe</SelectItem>
                <SelectItem value="Propeller">Propeller</SelectItem>
                <SelectItem value="Avionics">Avionics</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Bi-Monthly">Bi-Monthly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
                <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                <SelectItem value="Yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (editingNotification ? "Updating..." : "Creating...") : (editingNotification ? "Update Notification" : "Create Notification")}
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