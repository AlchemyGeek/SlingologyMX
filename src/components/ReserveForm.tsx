import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency";
import { toast } from "sonner";
import { Reserve } from "./ReservesPanel";

const RESERVE_TYPES = ["Engine", "Propeller", "Gearbox", "Parachute", "Battery", "Avionics", "Other"] as const;
const BASIS_TYPES = ["Calendar", "Hours", "Cycles"] as const;
const INTERVAL_UNITS = ["Months", "Years"] as const;
const COUNTER_TYPES = ["Hobbs", "Tach", "Airframe TT", "Engine TT", "Prop TT"] as const;
const ACCRUAL_METHODS = ["Straight-line", "None"] as const;
const STATUS_OPTIONS = ["Active", "Paused", "Retired"] as const;

interface ReserveFormProps {
  userId: string;
  aircraftId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingReserve?: Reserve | null;
  userCurrency?: string;
}

const ReserveForm = ({ userId, aircraftId, onSuccess, onCancel, editingReserve, userCurrency = "USD" }: ReserveFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: editingReserve?.title || "",
    reserve_type: editingReserve?.reserve_type || "Other",
    basis_type: editingReserve?.basis_type || "Hours",
    // Calendar fields
    interval_value: editingReserve?.interval_value?.toString() || "",
    interval_unit: editingReserve?.interval_unit || "Months",
    start_date: editingReserve?.start_date ? parseLocalDate(editingReserve.start_date) : null as Date | null,
    // Hours fields
    limit_hours: editingReserve?.limit_hours?.toString() || "",
    counter_type: editingReserve?.counter_type || "Tach",
    start_counter_value: editingReserve?.start_counter_value?.toString() || "",
    // Cycles fields
    limit_cycles: editingReserve?.limit_cycles?.toString() || "",
    start_cycle_count: editingReserve?.start_cycle_count?.toString() || "",
    // Cost model
    expected_cost: editingReserve?.expected_cost?.toString() || "",
    cost_estimate_date: editingReserve?.cost_estimate_date ? parseLocalDate(editingReserve.cost_estimate_date) : null as Date | null,
    cost_source_notes: editingReserve?.cost_source_notes || "",
    // Accrual
    accrual_method: editingReserve?.accrual_method || "Straight-line",
    include_in_true_cost: editingReserve?.include_in_true_cost ?? false,
    include_in_cost_per_hour: editingReserve?.include_in_cost_per_hour ?? false,
    // Lifecycle
    status: editingReserve?.status || "Active",
    // Notes
    notes: editingReserve?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.title.length > 200) {
      toast.error("Title must be 200 characters or less");
      return;
    }

    // Validate based on basis_type
    if (formData.basis_type === "Calendar") {
      if (!formData.interval_value || !formData.start_date) {
        toast.error("Calendar-based reserves require interval value and start date");
        return;
      }
    } else if (formData.basis_type === "Hours") {
      if (!formData.limit_hours) {
        toast.error("Hours-based reserves require limit hours");
        return;
      }
    } else if (formData.basis_type === "Cycles") {
      if (!formData.limit_cycles) {
        toast.error("Cycles-based reserves require limit cycles");
        return;
      }
    }

    setLoading(true);

    try {
      const reserveData = {
        user_id: userId,
        aircraft_id: aircraftId,
        title: formData.title,
        reserve_type: formData.reserve_type,
        basis_type: formData.basis_type,
        // Calendar fields
        interval_value: formData.basis_type === "Calendar" && formData.interval_value ? parseInt(formData.interval_value) : null,
        interval_unit: formData.basis_type === "Calendar" ? formData.interval_unit : null,
        start_date: formData.basis_type === "Calendar" && formData.start_date ? format(formData.start_date, "yyyy-MM-dd") : null,
        // Hours fields
        limit_hours: formData.basis_type === "Hours" && formData.limit_hours ? parseFloat(formData.limit_hours) : null,
        counter_type: formData.basis_type === "Hours" ? formData.counter_type : null,
        start_counter_value: formData.basis_type === "Hours" && formData.start_counter_value ? parseFloat(formData.start_counter_value) : null,
        // Cycles fields
        limit_cycles: formData.basis_type === "Cycles" && formData.limit_cycles ? parseInt(formData.limit_cycles) : null,
        start_cycle_count: formData.basis_type === "Cycles" && formData.start_cycle_count ? parseInt(formData.start_cycle_count) : null,
        // Cost model
        expected_cost: formData.expected_cost ? parseFloat(formData.expected_cost) : null,
        currency: userCurrency,
        cost_estimate_date: formData.cost_estimate_date ? format(formData.cost_estimate_date, "yyyy-MM-dd") : null,
        cost_source_notes: formData.cost_source_notes || null,
        // Accrual
        accrual_method: formData.accrual_method,
        include_in_true_cost: formData.include_in_true_cost,
        include_in_cost_per_hour: formData.include_in_cost_per_hour,
        // Lifecycle
        status: formData.status,
        // Notes
        notes: formData.notes || null,
      };

      if (editingReserve) {
        const { error } = await supabase
          .from("reserves" as any)
          .update(reserveData)
          .eq("id", editingReserve.id);

        if (error) throw error;
        toast.success("Reserve updated successfully!");
      } else {
        const { error } = await supabase
          .from("reserves" as any)
          .insert([reserveData]);

        if (error) throw error;
        toast.success("Reserve created successfully!");
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity & Scope */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Identity & Scope</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Rotax 916 Engine Overhaul"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{formData.title.length}/200 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reserve_type">Reserve Type <span className="text-destructive">*</span></Label>
              <Select value={formData.reserve_type} onValueChange={(value: typeof RESERVE_TYPES[number]) => setFormData({ ...formData, reserve_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESERVE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Trigger Basis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Trigger Basis</h3>
          <div className="space-y-2">
            <Label htmlFor="basis_type">Basis Type <span className="text-destructive">*</span></Label>
            <Select value={formData.basis_type} onValueChange={(value: typeof BASIS_TYPES[number]) => setFormData({ ...formData, basis_type: value })}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BASIS_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar-based fields */}
          {formData.basis_type === "Calendar" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-background rounded-md border">
              <div className="space-y-2">
                <Label htmlFor="interval_value">Interval Value <span className="text-destructive">*</span></Label>
                <Input
                  id="interval_value"
                  type="number"
                  min="1"
                  value={formData.interval_value}
                  onChange={(e) => setFormData({ ...formData, interval_value: e.target.value })}
                  placeholder="e.g., 72"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval_unit">Interval Unit <span className="text-destructive">*</span></Label>
                <Select value={formData.interval_unit} onValueChange={(value: typeof INTERVAL_UNITS[number]) => setFormData({ ...formData, interval_unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date <span className="text-destructive">*</span></Label>
                <DateInput
                  id="start_date"
                  value={formData.start_date}
                  onChange={(date) => setFormData({ ...formData, start_date: date })}
                />
              </div>
            </div>
          )}

          {/* Hours-based fields */}
          {formData.basis_type === "Hours" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-background rounded-md border">
              <div className="space-y-2">
                <Label htmlFor="limit_hours">Limit Hours <span className="text-destructive">*</span></Label>
                <Input
                  id="limit_hours"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.limit_hours}
                  onChange={(e) => setFormData({ ...formData, limit_hours: e.target.value })}
                  placeholder="e.g., 2000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter_type">Counter Type <span className="text-destructive">*</span></Label>
                <Select value={formData.counter_type} onValueChange={(value) => setFormData({ ...formData, counter_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_counter_value">Start Counter Value</Label>
                <Input
                  id="start_counter_value"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.start_counter_value}
                  onChange={(e) => setFormData({ ...formData, start_counter_value: e.target.value })}
                  placeholder="Counter at last overhaul"
                />
              </div>
            </div>
          )}

          {/* Cycles-based fields */}
          {formData.basis_type === "Cycles" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-background rounded-md border">
              <div className="space-y-2">
                <Label htmlFor="limit_cycles">Limit Cycles <span className="text-destructive">*</span></Label>
                <Input
                  id="limit_cycles"
                  type="number"
                  min="1"
                  value={formData.limit_cycles}
                  onChange={(e) => setFormData({ ...formData, limit_cycles: e.target.value })}
                  placeholder="e.g., 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_cycle_count">Start Cycle Count</Label>
                <Input
                  id="start_cycle_count"
                  type="number"
                  min="0"
                  value={formData.start_cycle_count}
                  onChange={(e) => setFormData({ ...formData, start_cycle_count: e.target.value })}
                  placeholder="Cycles at last service"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Cost Model */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Cost Model</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_cost">Expected Cost ({getCurrencySymbol(userCurrency)})</Label>
              <Input
                id="expected_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.expected_cost}
                onChange={(e) => setFormData({ ...formData, expected_cost: e.target.value })}
                placeholder="e.g., 35000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_estimate_date">Cost Estimate Date</Label>
              <DateInput
                id="cost_estimate_date"
                value={formData.cost_estimate_date}
                onChange={(date) => setFormData({ ...formData, cost_estimate_date: date })}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="cost_source_notes">Cost Source / Notes</Label>
              <Input
                id="cost_source_notes"
                value={formData.cost_source_notes}
                onChange={(e) => setFormData({ ...formData, cost_source_notes: e.target.value })}
                placeholder="e.g., Shop quote, forum data..."
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Accrual Behavior */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Accrual Behavior (Analysis Only)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accrual_method">Accrual Method</Label>
              <Select value={formData.accrual_method} onValueChange={(value: typeof ACCRUAL_METHODS[number]) => setFormData({ ...formData, accrual_method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCRUAL_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="include_in_true_cost"
                checked={formData.include_in_true_cost}
                onCheckedChange={(checked) => setFormData({ ...formData, include_in_true_cost: checked })}
              />
              <Label htmlFor="include_in_true_cost" className="cursor-pointer">Include in True Cost</Label>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="include_in_cost_per_hour"
                checked={formData.include_in_cost_per_hour}
                onCheckedChange={(checked) => setFormData({ ...formData, include_in_cost_per_hour: checked })}
              />
              <Label htmlFor="include_in_cost_per_hour" className="cursor-pointer">Include in Cost-Per-Hour</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Lifecycle & Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Lifecycle & Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: typeof STATUS_OPTIONS[number]) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this reserve..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading
              ? editingReserve
                ? "Updating..."
                : "Creating..."
              : editingReserve
                ? "Update Reserve"
                : "Create Reserve"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ReserveForm;
