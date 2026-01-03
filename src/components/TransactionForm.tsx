import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DateInput } from "@/components/ui/date-input";
import { TagInput } from "@/components/ui/tag-input";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

interface TransactionFormProps {
  userId: string;
  aircraftId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingTransaction?: any;
}

const INTENTS = Constants.public.Enums.transaction_intent;
const CATEGORIES = Constants.public.Enums.transaction_category;
const STATUSES = Constants.public.Enums.transaction_status;
const SOURCES = Constants.public.Enums.transaction_source;
const ALLOCATION_METHODS = Constants.public.Enums.allocation_method;
const ALLOCATION_UNITS = Constants.public.Enums.allocation_period_unit;

const TransactionForm = ({ userId, aircraftId, onSuccess, onCancel, editingTransaction }: TransactionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: editingTransaction?.title || "",
    transaction_date: editingTransaction?.transaction_date ? parseLocalDate(editingTransaction.transaction_date) : new Date(),
    amount: editingTransaction?.amount?.toString() || "",
    currency: editingTransaction?.currency?.trim() || "USD",
    intent: editingTransaction?.intent || "Operation",
    category: editingTransaction?.category || "Other",
    tags: editingTransaction?.tags || [],
    status: editingTransaction?.status || "Pending",
    source: editingTransaction?.source || "Manual",
    notes: editingTransaction?.notes || "",
    include_in_cash_flow: editingTransaction?.include_in_cash_flow ?? true,
    include_in_ownership_total: editingTransaction?.include_in_ownership_total ?? true,
    include_in_cost_per_hour: editingTransaction?.include_in_cost_per_hour ?? false,
    allocate_over_time: editingTransaction?.allocate_over_time ?? false,
    allocation_method: editingTransaction?.allocation_method || null,
    allocation_period_value: editingTransaction?.allocation_period_value?.toString() || "",
    allocation_period_unit: editingTransaction?.allocation_period_unit || null,
    allocation_start_date: editingTransaction?.allocation_start_date ? parseLocalDate(editingTransaction.allocation_start_date) : null,
    hobbs_hours: editingTransaction?.hobbs_hours?.toString() || "",
    tach_hours: editingTransaction?.tach_hours?.toString() || "",
    flight_time_hours: editingTransaction?.flight_time_hours?.toString() || "",
    block_time_hours: editingTransaction?.block_time_hours?.toString() || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.title.length > 200) {
      toast.error("Title must be 200 characters or less");
      return;
    }

    const amountValue = parseFloat(formData.amount);
    if (isNaN(amountValue) || amountValue < 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    if (formData.allocate_over_time && !formData.allocation_method) {
      toast.error("Please select an allocation method");
      return;
    }

    setLoading(true);

    try {
      const transactionDateStr = formData.transaction_date ? format(formData.transaction_date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      const allocationStartDateStr = formData.allocation_start_date ? format(formData.allocation_start_date, "yyyy-MM-dd") : null;
      
      // Calculate allocation end date if applicable
      let allocationEndDateStr = null;
      if (formData.allocate_over_time && formData.allocation_method === "Straight-line" && formData.allocation_period_value && formData.allocation_period_unit) {
        const startDate = formData.allocation_start_date || formData.transaction_date || new Date();
        const periodValue = parseInt(formData.allocation_period_value);
        const endDate = new Date(startDate);
        if (formData.allocation_period_unit === "Days") {
          endDate.setDate(endDate.getDate() + periodValue);
        } else if (formData.allocation_period_unit === "Months") {
          endDate.setMonth(endDate.getMonth() + periodValue);
        }
        allocationEndDateStr = format(endDate, "yyyy-MM-dd");
      }

      const transactionData = {
        user_id: userId,
        aircraft_id: aircraftId,
        title: formData.title,
        transaction_date: transactionDateStr,
        amount: amountValue,
        currency: formData.currency,
        direction: "Debit" as const,
        intent: formData.intent as typeof INTENTS[number],
        category: formData.category as typeof CATEGORIES[number],
        tags: formData.tags,
        status: formData.status as typeof STATUSES[number],
        source: formData.source as typeof SOURCES[number],
        notes: formData.notes || null,
        include_in_cash_flow: formData.include_in_cash_flow,
        include_in_ownership_total: formData.include_in_ownership_total,
        include_in_cost_per_hour: formData.include_in_cost_per_hour,
        allocate_over_time: formData.allocate_over_time,
        allocation_method: formData.allocate_over_time ? formData.allocation_method as typeof ALLOCATION_METHODS[number] : null,
        allocation_period_value: formData.allocate_over_time && formData.allocation_period_value ? parseInt(formData.allocation_period_value) : null,
        allocation_period_unit: formData.allocate_over_time ? formData.allocation_period_unit as typeof ALLOCATION_UNITS[number] : null,
        allocation_start_date: formData.allocate_over_time ? (allocationStartDateStr || transactionDateStr) : null,
        allocation_end_date: allocationEndDateStr,
        hobbs_hours: formData.hobbs_hours ? parseFloat(formData.hobbs_hours) : null,
        tach_hours: formData.tach_hours ? parseFloat(formData.tach_hours) : null,
        flight_time_hours: formData.flight_time_hours ? parseFloat(formData.flight_time_hours) : null,
        block_time_hours: formData.block_time_hours ? parseFloat(formData.block_time_hours) : null,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", editingTransaction.id);

        if (error) throw error;
        toast.success("Transaction updated successfully!");
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert([transactionData]);

        if (error) throw error;
        toast.success("Transaction created successfully!");
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
        {/* Core Identification */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Core Details</h3>
          
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Hangar Rent – KPAE"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{formData.title.length}/200 characters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date <span className="text-destructive">*</span></Label>
              <DateInput
                id="transaction_date"
                value={formData.transaction_date}
                onChange={(date) => setFormData({ ...formData, transaction_date: date })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount <span className="text-destructive">*</span></Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Classification */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Classification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intent">Intent <span className="text-destructive">*</span></Label>
              <Select value={formData.intent} onValueChange={(value) => setFormData({ ...formData, intent: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTENTS.map((intent) => (
                    <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                userId={userId}
                tags={formData.tags}
                onTagsChange={(tags) => setFormData({ ...formData, tags })}
                source="maintenance_logs"
                placeholder="Add tags..."
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Status & Source */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status & Source</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source <span className="text-destructive">*</span></Label>
              <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            className="min-h-[80px]"
          />
        </div>

        <Separator />

        {/* Analysis Participation */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Analysis Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Switch
                id="include_in_cash_flow"
                checked={formData.include_in_cash_flow}
                onCheckedChange={(checked) => setFormData({ ...formData, include_in_cash_flow: checked })}
              />
              <Label htmlFor="include_in_cash_flow" className="cursor-pointer">Include in Cash Flow</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="include_in_ownership_total"
                checked={formData.include_in_ownership_total}
                onCheckedChange={(checked) => setFormData({ ...formData, include_in_ownership_total: checked })}
              />
              <Label htmlFor="include_in_ownership_total" className="cursor-pointer">Include in Ownership Total</Label>
            </div>

            <div className="flex items-center gap-3">
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

        {/* Cost Allocation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cost Allocation</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="allocate_over_time" className="cursor-pointer text-sm">Allocate over time</Label>
              <Switch
                id="allocate_over_time"
                checked={formData.allocate_over_time}
                onCheckedChange={(checked) => setFormData({ ...formData, allocate_over_time: checked })}
              />
            </div>
          </div>

          {formData.allocate_over_time && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-background rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="allocation_method">Method <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.allocation_method || ""} 
                  onValueChange={(value) => setFormData({ ...formData, allocation_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOCATION_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.allocation_method === "Straight-line" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="allocation_period_value">Period Value</Label>
                    <Input
                      id="allocation_period_value"
                      type="number"
                      min="1"
                      value={formData.allocation_period_value}
                      onChange={(e) => setFormData({ ...formData, allocation_period_value: e.target.value })}
                      placeholder="e.g., 12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allocation_period_unit">Period Unit</Label>
                    <Select 
                      value={formData.allocation_period_unit || ""} 
                      onValueChange={(value) => setFormData({ ...formData, allocation_period_unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALLOCATION_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="allocation_start_date">Start Date</Label>
                <DateInput
                  id="allocation_start_date"
                  value={formData.allocation_start_date}
                  onChange={(date) => setFormData({ ...formData, allocation_start_date: date })}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Counter Snapshots */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Counter Snapshots</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hobbs_hours">Hobbs</Label>
              <Input
                id="hobbs_hours"
                type="number"
                step="0.1"
                value={formData.hobbs_hours}
                onChange={(e) => setFormData({ ...formData, hobbs_hours: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tach_hours">Tach</Label>
              <Input
                id="tach_hours"
                type="number"
                step="0.1"
                value={formData.tach_hours}
                onChange={(e) => setFormData({ ...formData, tach_hours: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flight_time_hours">Flight Time</Label>
              <Input
                id="flight_time_hours"
                type="number"
                step="0.1"
                value={formData.flight_time_hours}
                onChange={(e) => setFormData({ ...formData, flight_time_hours: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block_time_hours">Block Time</Label>
              <Input
                id="block_time_hours"
                type="number"
                step="0.1"
                value={formData.block_time_hours}
                onChange={(e) => setFormData({ ...formData, block_time_hours: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading
              ? editingTransaction
                ? "Updating..."
                : "Creating..."
              : editingTransaction
                ? "Update Transaction"
                : "Create Transaction"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TransactionForm;
