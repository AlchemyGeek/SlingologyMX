import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

interface DefaultCounters {
  hobbs: number;
  tach: number;
  airframe_total_time: number;
  engine_total_time: number;
  prop_total_time: number;
}

interface CounterUpdates {
  hobbs?: number;
  tach?: number;
  airframe_total_time?: number;
  engine_total_time?: number;
  prop_total_time?: number;
}

interface MaintenanceLogFormProps {
  userId: string;
  editingLog?: any;
  defaultCounters?: DefaultCounters;
  onSuccess: () => void;
  onCancel: () => void;
  onUpdateGlobalCounters?: (updates: CounterUpdates) => Promise<void>;
}

const MaintenanceLogForm = ({ userId, editingLog, defaultCounters, onSuccess, onCancel, onUpdateGlobalCounters }: MaintenanceLogFormProps) => {
  const [formData, setFormData] = useState({
    entry_title: "",
    category: "Airframe" as Database["public"]["Enums"]["maintenance_category"],
    subcategory: "Inspection" as Database["public"]["Enums"]["maintenance_subcategory"],
    tags: [] as string[],
    date_performed: new Date(),
    hobbs_at_event: defaultCounters?.hobbs?.toString() || "",
    tach_at_event: defaultCounters?.tach?.toString() || "",
    airframe_total_time: defaultCounters?.airframe_total_time?.toString() || "",
    engine_total_time: defaultCounters?.engine_total_time?.toString() || "",
    prop_total_time: defaultCounters?.prop_total_time?.toString() || "",
    has_compliance_item: false,
    compliance_type: "None" as Database["public"]["Enums"]["compliance_type"],
    compliance_reference: "",
    recurring_compliance: false,
    is_recurring_task: false,
    interval_type: "None" as Database["public"]["Enums"]["interval_type"],
    interval_hours: "",
    interval_months: "",
    next_due_hours: "",
    next_due_date: null as Date | null,
    performed_by_type: "Owner" as Database["public"]["Enums"]["performed_by_type"],
    performed_by_name: "",
    organization: "",
    parts_cost: "",
    labor_cost: "",
    other_cost: "",
    total_cost: "",
    vendor_name: "",
    invoice_number: "",
    attachment_urls: [] as Array<{ url: string; description?: string }>,
    internal_notes: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlDescInput, setUrlDescInput] = useState("");
  const [showCounterUpdateDialog, setShowCounterUpdateDialog] = useState(false);
  const [pendingCounterUpdates, setPendingCounterUpdates] = useState<CounterUpdates>({});
  const [isUpdatingCounters, setIsUpdatingCounters] = useState(false);

  useEffect(() => {
    if (editingLog) {
      setFormData({
        entry_title: editingLog.entry_title || "",
        category: editingLog.category || "Airframe",
        subcategory: editingLog.subcategory || "Inspection",
        tags: editingLog.tags || [],
        date_performed: new Date(editingLog.date_performed),
        hobbs_at_event: editingLog.hobbs_at_event?.toString() || "",
        tach_at_event: editingLog.tach_at_event?.toString() || "",
        airframe_total_time: editingLog.airframe_total_time?.toString() || "",
        engine_total_time: editingLog.engine_total_time?.toString() || "",
        prop_total_time: editingLog.prop_total_time?.toString() || "",
        has_compliance_item: editingLog.has_compliance_item || false,
        compliance_type: editingLog.compliance_type || "None",
        compliance_reference: editingLog.compliance_reference || "",
        recurring_compliance: editingLog.recurring_compliance || false,
        is_recurring_task: editingLog.is_recurring_task || false,
        interval_type: editingLog.interval_type || "None",
        interval_hours: editingLog.interval_hours?.toString() || "",
        interval_months: editingLog.interval_months?.toString() || "",
        next_due_hours: editingLog.next_due_hours?.toString() || "",
        next_due_date: editingLog.next_due_date ? new Date(editingLog.next_due_date) : null,
        performed_by_type: editingLog.performed_by_type || "Owner",
        performed_by_name: editingLog.performed_by_name || "",
        organization: editingLog.organization || "",
        parts_cost: editingLog.parts_cost?.toString() || "",
        labor_cost: editingLog.labor_cost?.toString() || "",
        other_cost: editingLog.other_cost?.toString() || "",
        total_cost: editingLog.total_cost?.toString() || "",
        vendor_name: editingLog.vendor_name || "",
        invoice_number: editingLog.invoice_number || "",
        attachment_urls: editingLog.attachment_urls || [],
        internal_notes: editingLog.internal_notes || "",
      });
    }
  }, [editingLog]);

  const handleAddTag = () => {
    if (tagInput.trim() && tagInput.length <= 30) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== index) });
  };

  const handleAddUrl = () => {
    if (urlInput.trim() && urlInput.length <= 255) {
      const newAttachment = {
        url: urlInput.trim(),
        ...(urlDescInput.trim() && { description: urlDescInput.trim() })
      };
      setFormData({ ...formData, attachment_urls: [...formData.attachment_urls, newAttachment] });
      setUrlInput("");
      setUrlDescInput("");
    }
  };

  const handleRemoveUrl = (index: number) => {
    setFormData({ ...formData, attachment_urls: formData.attachment_urls.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.entry_title.length > 120) {
      toast.error("Entry title must be 120 characters or less");
      return;
    }

    // Validate Time & Usage fields are filled
    if (!formData.hobbs_at_event || !formData.tach_at_event || !formData.airframe_total_time || !formData.engine_total_time || !formData.prop_total_time) {
      toast.error("All Time & Usage fields are required");
      return;
    }

    if (formData.internal_notes.length > 2000) {
      toast.error("Internal notes must be 2000 characters or less");
      return;
    }

    const logData = {
      user_id: userId,
      entry_title: formData.entry_title,
      category: formData.category,
      subcategory: formData.subcategory,
      tags: formData.tags,
      date_performed: format(formData.date_performed, "yyyy-MM-dd"),
      hobbs_at_event: formData.hobbs_at_event ? parseFloat(formData.hobbs_at_event) : null,
      tach_at_event: formData.tach_at_event ? parseFloat(formData.tach_at_event) : null,
      airframe_total_time: formData.airframe_total_time ? parseFloat(formData.airframe_total_time) : null,
      engine_total_time: formData.engine_total_time ? parseFloat(formData.engine_total_time) : null,
      prop_total_time: formData.prop_total_time ? parseFloat(formData.prop_total_time) : null,
      has_compliance_item: formData.has_compliance_item,
      compliance_type: formData.compliance_type,
      compliance_reference: formData.compliance_reference || null,
      recurring_compliance: formData.recurring_compliance,
      is_recurring_task: formData.is_recurring_task,
      interval_type: formData.interval_type,
      interval_hours: formData.interval_hours ? parseInt(formData.interval_hours) : null,
      interval_months: formData.interval_months ? parseInt(formData.interval_months) : null,
      next_due_hours: formData.next_due_hours ? parseFloat(formData.next_due_hours) : null,
      next_due_date: formData.next_due_date ? format(formData.next_due_date, "yyyy-MM-dd") : null,
      performed_by_type: formData.performed_by_type,
      performed_by_name: formData.performed_by_name,
      organization: formData.organization || null,
      parts_cost: formData.parts_cost ? parseFloat(formData.parts_cost) : null,
      labor_cost: formData.labor_cost ? parseFloat(formData.labor_cost) : null,
      other_cost: formData.other_cost ? parseFloat(formData.other_cost) : null,
      total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
      vendor_name: formData.vendor_name || null,
      invoice_number: formData.invoice_number || null,
      attachment_urls: formData.attachment_urls,
      internal_notes: formData.internal_notes || null,
    };

    try {
      if (editingLog) {
        const { error } = await supabase
          .from("maintenance_logs")
          .update(logData)
          .eq("id", editingLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("maintenance_logs")
          .insert([logData]);
        if (error) throw error;
      }
      
      // Check if any counter values are higher than global counters
      if (defaultCounters && onUpdateGlobalCounters) {
        const updates: CounterUpdates = {};
        
        const hobbs = formData.hobbs_at_event ? parseFloat(formData.hobbs_at_event) : null;
        const tach = formData.tach_at_event ? parseFloat(formData.tach_at_event) : null;
        const airframe = formData.airframe_total_time ? parseFloat(formData.airframe_total_time) : null;
        const engine = formData.engine_total_time ? parseFloat(formData.engine_total_time) : null;
        const prop = formData.prop_total_time ? parseFloat(formData.prop_total_time) : null;
        
        if (hobbs !== null && hobbs > defaultCounters.hobbs) updates.hobbs = hobbs;
        if (tach !== null && tach > defaultCounters.tach) updates.tach = tach;
        if (airframe !== null && airframe > defaultCounters.airframe_total_time) updates.airframe_total_time = airframe;
        if (engine !== null && engine > defaultCounters.engine_total_time) updates.engine_total_time = engine;
        if (prop !== null && prop > defaultCounters.prop_total_time) updates.prop_total_time = prop;
        
        if (Object.keys(updates).length > 0) {
          setPendingCounterUpdates(updates);
          setShowCounterUpdateDialog(true);
          return; // Don't call onSuccess yet, wait for dialog
        }
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error saving maintenance log:", error);
      toast.error("Failed to save maintenance log");
    }
  };

  const handleConfirmCounterUpdate = async () => {
    if (!onUpdateGlobalCounters) return;
    
    setIsUpdatingCounters(true);
    try {
      await onUpdateGlobalCounters(pendingCounterUpdates);
      toast.success("Global counters updated");
    } catch (error) {
      console.error("Error updating global counters:", error);
      toast.error("Failed to update global counters");
    }
    setIsUpdatingCounters(false);
    setShowCounterUpdateDialog(false);
    onSuccess();
  };

  const handleSkipCounterUpdate = () => {
    setShowCounterUpdateDialog(false);
    onSuccess();
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">
          {editingLog ? "Edit Maintenance Log" : "New Maintenance Log"}
        </h2>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Identity & Classification */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="text-lg font-medium">Identity & Classification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entry_title">Entry Title *</Label>
            <Input
              id="entry_title"
              value={formData.entry_title}
              onChange={(e) => setFormData({ ...formData, entry_title: e.target.value })}
              maxLength={120}
              required
            />
            <p className="text-xs text-muted-foreground">{formData.entry_title.length}/120</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as Database["public"]["Enums"]["maintenance_category"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Airframe">Airframe</SelectItem>
                <SelectItem value="Engine">Engine</SelectItem>
                <SelectItem value="Propeller">Propeller</SelectItem>
                <SelectItem value="Avionics">Avionics</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Interior">Interior</SelectItem>
                <SelectItem value="Exterior">Exterior</SelectItem>
                <SelectItem value="Accessories">Accessories</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subcategory">Subcategory *</Label>
            <Select value={formData.subcategory} onValueChange={(value) => setFormData({ ...formData, subcategory: value as Database["public"]["Enums"]["maintenance_subcategory"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inspection">Inspection</SelectItem>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Replacement">Replacement</SelectItem>
                <SelectItem value="Modification">Modification</SelectItem>
                <SelectItem value="Software Update">Software Update</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Troubleshooting">Troubleshooting</SelectItem>
                <SelectItem value="Scheduled Maintenance">Scheduled Maintenance</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                maxLength={30}
                placeholder="Add tag..."
              />
              <Button type="button" onClick={handleAddTag} size="sm">
                Add
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {formData.tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(index)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time & Usage */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="text-lg font-medium">Time & Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date Performed *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.date_performed && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date_performed ? format(formData.date_performed, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={formData.date_performed} onSelect={(date) => date && setFormData({ ...formData, date_performed: date })} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hobbs_at_event">Hobbs at Event *</Label>
            <Input
              id="hobbs_at_event"
              type="number"
              step="0.1"
              max="9999.9"
              value={formData.hobbs_at_event}
              onChange={(e) => setFormData({ ...formData, hobbs_at_event: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tach_at_event">Tach at Event *</Label>
            <Input
              id="tach_at_event"
              type="number"
              step="0.1"
              max="9999.9"
              value={formData.tach_at_event}
              onChange={(e) => setFormData({ ...formData, tach_at_event: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="airframe_total_time">Airframe Total Time *</Label>
            <Input
              id="airframe_total_time"
              type="number"
              step="0.1"
              max="19999.9"
              required
              value={formData.airframe_total_time}
              onChange={(e) => setFormData({ ...formData, airframe_total_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="engine_total_time">Engine Total Time *</Label>
            <Input
              id="engine_total_time"
              type="number"
              step="0.1"
              max="19999.9"
              value={formData.engine_total_time}
              onChange={(e) => setFormData({ ...formData, engine_total_time: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop_total_time">Prop Total Time *</Label>
            <Input
              id="prop_total_time"
              type="number"
              step="0.1"
              max="19999.9"
              required
              value={formData.prop_total_time}
              onChange={(e) => setFormData({ ...formData, prop_total_time: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Compliance Metadata */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="text-lg font-medium">Compliance Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="has_compliance_item"
              checked={formData.has_compliance_item}
              onCheckedChange={(checked) => setFormData({ ...formData, has_compliance_item: checked })}
            />
            <Label htmlFor="has_compliance_item">Has Compliance Item</Label>
          </div>
          {formData.has_compliance_item && (
            <>
              <div className="space-y-2">
                <Label htmlFor="compliance_type">Compliance Type</Label>
                <Select value={formData.compliance_type} onValueChange={(value) => setFormData({ ...formData, compliance_type: value as Database["public"]["Enums"]["compliance_type"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="AD">AD</SelectItem>
                    <SelectItem value="SB">SB</SelectItem>
                    <SelectItem value="SL">SL</SelectItem>
                    <SelectItem value="KAS">KAS</SelectItem>
                    <SelectItem value="ASB">ASB</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compliance_reference">Compliance Reference</Label>
                <Input
                  id="compliance_reference"
                  value={formData.compliance_reference}
                  onChange={(e) => setFormData({ ...formData, compliance_reference: e.target.value })}
                  maxLength={40}
                  placeholder="e.g., ASB-915i-006"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring_compliance"
                  checked={formData.recurring_compliance}
                  onCheckedChange={(checked) => setFormData({ ...formData, recurring_compliance: checked })}
                />
                <Label htmlFor="recurring_compliance">Recurring Compliance</Label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Next-Due Tracking */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="text-lg font-medium">Next-Due Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_recurring_task"
              checked={formData.is_recurring_task}
              onCheckedChange={(checked) => setFormData({ ...formData, is_recurring_task: checked })}
            />
            <Label htmlFor="is_recurring_task">Is Recurring Task</Label>
          </div>
          {formData.is_recurring_task && (
            <>
              <div className="space-y-2">
                <Label htmlFor="interval_type">Interval Type</Label>
                <Select value={formData.interval_type} onValueChange={(value) => setFormData({ ...formData, interval_type: value as Database["public"]["Enums"]["interval_type"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Hours">Hours</SelectItem>
                    <SelectItem value="Calendar">Calendar</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formData.interval_type === "Hours" || formData.interval_type === "Mixed") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="interval_hours">Interval Hours</Label>
                    <Input
                      id="interval_hours"
                      type="number"
                      max="2000"
                      value={formData.interval_hours}
                      onChange={(e) => setFormData({ ...formData, interval_hours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next_due_hours">Next Due Hours</Label>
                    <Input
                      id="next_due_hours"
                      type="number"
                      step="0.1"
                      max="19999.9"
                      value={formData.next_due_hours}
                      onChange={(e) => setFormData({ ...formData, next_due_hours: e.target.value })}
                    />
                  </div>
                </>
              )}
              {(formData.interval_type === "Calendar" || formData.interval_type === "Mixed") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="interval_months">Interval Months</Label>
                    <Input
                      id="interval_months"
                      type="number"
                      max="240"
                      value={formData.interval_months}
                      onChange={(e) => setFormData({ ...formData, interval_months: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.next_due_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.next_due_date ? format(formData.next_due_date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formData.next_due_date || undefined} onSelect={(date) => setFormData({ ...formData, next_due_date: date || null })} initialFocus className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Performed By */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="text-lg font-medium">Performed By</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="performed_by_type">Performed By Type *</Label>
            <Select value={formData.performed_by_type} onValueChange={(value) => setFormData({ ...formData, performed_by_type: value as Database["public"]["Enums"]["performed_by_type"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Owner">Owner</SelectItem>
                <SelectItem value="A&P">A&P</SelectItem>
                <SelectItem value="LSRM">LSRM</SelectItem>
                <SelectItem value="Repairman">Repairman</SelectItem>
                <SelectItem value="Shop">Shop</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="performed_by_name">Performed By Name *</Label>
            <Input
              id="performed_by_name"
              value={formData.performed_by_name}
              onChange={(e) => setFormData({ ...formData, performed_by_name: e.target.value })}
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              maxLength={80}
            />
          </div>
        </div>
      </div>

      {/* Cost Metadata */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="text-lg font-medium">Cost Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="parts_cost">Parts Cost ($)</Label>
            <Input
              id="parts_cost"
              type="number"
              step="0.01"
              max="999999.99"
              value={formData.parts_cost}
              onChange={(e) => setFormData({ ...formData, parts_cost: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labor_cost">Labor Cost ($)</Label>
            <Input
              id="labor_cost"
              type="number"
              step="0.01"
              max="999999.99"
              value={formData.labor_cost}
              onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="other_cost">Other Cost ($)</Label>
            <Input
              id="other_cost"
              type="number"
              step="0.01"
              max="999999.99"
              value={formData.other_cost}
              onChange={(e) => setFormData({ ...formData, other_cost: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_cost">Total Cost ($)</Label>
            <Input
              id="total_cost"
              type="number"
              step="0.01"
              max="999999.99"
              value={formData.total_cost}
              onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor_name">Vendor Name</Label>
            <Input
              id="vendor_name"
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input
              id="invoice_number"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              maxLength={40}
            />
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="space-y-4 border-b pb-4">
        <h3 className="text-lg font-medium">Attachments</h3>
        <div className="space-y-2">
          <Label>Attachment URLs</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="url_desc_input" className="text-sm">Description (optional)</Label>
              <Input
                id="url_desc_input"
                value={urlDescInput}
                onChange={(e) => setUrlDescInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddUrl())}
                maxLength={100}
                placeholder="Invoice, receipt, photo, etc."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="url_input" className="text-sm">URL Link</Label>
              <Input
                id="url_input"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddUrl())}
                maxLength={255}
                placeholder="https://example.com/invoice.pdf"
              />
            </div>
          </div>
          <Button type="button" onClick={handleAddUrl} size="sm" className="mt-2">
            Add Attachment
          </Button>
          <div className="space-y-1 mt-2">
            {formData.attachment_urls.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded">
                <div className="flex-1 min-w-0">
                  <a 
                    href={attachment.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm font-medium hover:underline block truncate"
                  >
                    {attachment.description || attachment.url}
                  </a>
                </div>
                <X className="h-4 w-4 cursor-pointer flex-shrink-0 hover:text-destructive" onClick={() => handleRemoveUrl(index)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Internal Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Internal Notes</h3>
        <div className="space-y-2">
          <Label htmlFor="internal_notes">Internal Notes (Dashboard only)</Label>
          <Textarea
            id="internal_notes"
            value={formData.internal_notes}
            onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
            maxLength={2000}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">{formData.internal_notes.length}/2000</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          {editingLog ? "Update Log Entry" : "Create Log Entry"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>

    <AlertDialog open={showCounterUpdateDialog} onOpenChange={setShowCounterUpdateDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Global Counters?</AlertDialogTitle>
          <AlertDialogDescription>
            Some counter values in this maintenance record are higher than your current global counters. Would you like to update the global counters to match?
            <div className="mt-3 space-y-1 text-sm">
              {pendingCounterUpdates.hobbs !== undefined && (
                <div>Hobbs: {defaultCounters?.hobbs.toFixed(1)} → {pendingCounterUpdates.hobbs.toFixed(1)}</div>
              )}
              {pendingCounterUpdates.tach !== undefined && (
                <div>Tach: {defaultCounters?.tach.toFixed(1)} → {pendingCounterUpdates.tach.toFixed(1)}</div>
              )}
              {pendingCounterUpdates.airframe_total_time !== undefined && (
                <div>Airframe TT: {defaultCounters?.airframe_total_time.toFixed(1)} → {pendingCounterUpdates.airframe_total_time.toFixed(1)}</div>
              )}
              {pendingCounterUpdates.engine_total_time !== undefined && (
                <div>Engine TT: {defaultCounters?.engine_total_time.toFixed(1)} → {pendingCounterUpdates.engine_total_time.toFixed(1)}</div>
              )}
              {pendingCounterUpdates.prop_total_time !== undefined && (
                <div>Prop TT: {defaultCounters?.prop_total_time.toFixed(1)} → {pendingCounterUpdates.prop_total_time.toFixed(1)}</div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkipCounterUpdate} disabled={isUpdatingCounters}>
            No, Keep Current
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmCounterUpdate} disabled={isUpdatingCounters}>
            {isUpdatingCounters ? "Updating..." : "Yes, Update Counters"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default MaintenanceLogForm;
