import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { format, addMonths } from "date-fns";
import { X } from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import type { Directive } from "./DirectivesPanel";
import type { Database } from "@/integrations/supabase/types";
import { useAircraftCounters } from "@/hooks/useAircraftCounters";

interface DirectiveFormProps {
  userId: string;
  editingDirective?: Directive | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const DIRECTIVE_TYPES = [
  "FAA Airworthiness Directive",
  "Manufacturer Alert",
  "Manufacturer Mandatory",
  "Service Bulletin",
  "Service Instruction",
  "Information Bulletin",
  "Other",
];

const SEVERITIES = ["Emergency", "Mandatory", "Recommended", "Informational"];
const DIRECTIVE_STATUSES = ["Active", "Superseded", "Cancelled", "Proposed", "Completed"];
const CATEGORIES = ["Airframe", "Engine", "Propeller", "Avionics", "System", "Appliance", "Other"];
const COMPLIANCE_SCOPES = ["One-Time", "Recurring", "Conditional", "Informational Only"];
const APPLICABILITY_STATUSES = ["Applies", "Does Not Apply", "Unsure"];
const INITIAL_DUE_TYPES = [
  "Before Next Flight",
  "By Date",
  "By Total Time (Hours)",
  "By Calendar",
  "At Next Inspection",
  "Other",
];
const ACTION_TYPES = [
  "Inspection",
  "Replacement",
  "Modification",
  "Software Update",
  "Operational Limitation",
  "Documentation Update",
];

const COUNTER_TYPES = [
  { value: "Hobbs", label: "Hobbs", counterKey: "hobbs" },
  { value: "Tach", label: "Tach", counterKey: "tach" },
  { value: "Airframe TT", label: "Airframe TT", counterKey: "airframe_total_time" },
  { value: "Engine TT", label: "Engine TT", counterKey: "engine_total_time" },
  { value: "Prop TT", label: "Prop TT", counterKey: "prop_total_time" },
];

const getCounterKey = (counterType: string): string => {
  const ct = COUNTER_TYPES.find(c => c.value === counterType);
  return ct?.counterKey || "hobbs";
};

const DirectiveForm = ({ userId, editingDirective, onSuccess, onCancel }: DirectiveFormProps) => {
  const { counters } = useAircraftCounters(userId);
  
  const [formData, setFormData] = useState({
    directive_code: "",
    title: "",
    directive_type: "Service Bulletin" as string,
    severity: "Recommended" as string,
    directive_status: "Active" as string,
    category: "Airframe" as string,
    issuing_authority: "",
    issue_date: null as Date | null,
    effective_date: null as Date | null,
    revision: "",
    applicability_category: "",
    applicability_model: "",
    applicable_serial_range: "",
    applicability_status: "Unsure" as string,
    applicability_reason: "",
    applicability_notes: "",
    compliance_scope: "One-Time" as string,
    action_types: [] as string[],
    initial_due_type: "" as string,
    initial_due_hours: "",
    initial_due_months: "",
    initial_due_date: null as Date | null,
    repeat_hours: "",
    repeat_months: "",
    terminating_action_exists: false,
    terminating_action_summary: "",
    requires_log_entry: true,
    source_links: [] as Array<{ description: string; url: string }>,
    // New fields for counter-based compliance
    counter_type: "Hobbs" as string,
    counter_value_mode: "absolute" as "absolute" | "incremental",
    counter_absolute_value: "",
    counter_increment_value: "",
  });

  const [linkDescInput, setLinkDescInput] = useState("");
  const [linkUrlInput, setLinkUrlInput] = useState("");

  useEffect(() => {
    if (editingDirective) {
      setFormData({
        directive_code: editingDirective.directive_code || "",
        title: editingDirective.title || "",
        directive_type: editingDirective.directive_type || "Service Bulletin",
        severity: editingDirective.severity || "Recommended",
        directive_status: editingDirective.directive_status || "Active",
        category: editingDirective.category || "Airframe",
        issuing_authority: editingDirective.issuing_authority || "",
        issue_date: editingDirective.issue_date ? parseLocalDate(editingDirective.issue_date) : null,
        effective_date: editingDirective.effective_date ? parseLocalDate(editingDirective.effective_date) : null,
        revision: editingDirective.revision || "",
        applicability_category: (editingDirective as any).applicability_category || "",
        applicability_model: (editingDirective as any).applicability_model || "",
        applicable_serial_range: editingDirective.applicable_serial_range || "",
        applicability_status: (editingDirective as any).applicability_status || "Unsure",
        applicability_reason: (editingDirective as any).applicability_reason || "",
        applicability_notes: editingDirective.applicability_notes || "",
        compliance_scope: editingDirective.compliance_scope || "One-Time",
        action_types: editingDirective.action_types || [],
        initial_due_type: editingDirective.initial_due_type || "",
        initial_due_hours: editingDirective.initial_due_hours?.toString() || "",
        initial_due_months: editingDirective.initial_due_months?.toString() || "",
        initial_due_date: editingDirective.initial_due_date ? parseLocalDate(editingDirective.initial_due_date) : null,
        repeat_hours: editingDirective.repeat_hours?.toString() || "",
        repeat_months: editingDirective.repeat_months?.toString() || "",
        terminating_action_exists: editingDirective.terminating_action_exists || false,
        terminating_action_summary: editingDirective.terminating_action_summary || "",
        requires_log_entry: editingDirective.requires_log_entry ?? true,
        source_links: editingDirective.source_links || [],
        counter_type: editingDirective.counter_type || "Hobbs",
        counter_value_mode: "absolute",
        counter_absolute_value: editingDirective.initial_due_hours?.toString() || "",
        counter_increment_value: "",
      });
    }
  }, [editingDirective]);

  // Auto-calculate initial_due_date when months change for "By Calendar"
  useEffect(() => {
    if (formData.initial_due_type === "By Calendar" && formData.initial_due_months) {
      const months = parseInt(formData.initial_due_months);
      if (!isNaN(months) && months > 0) {
        const calculatedDate = addMonths(new Date(), months);
        setFormData(prev => ({ ...prev, initial_due_date: calculatedDate }));
      }
    }
  }, [formData.initial_due_months, formData.initial_due_type]);

  const handleAddLink = () => {
    if (linkDescInput.trim() && linkUrlInput.trim()) {
      setFormData({
        ...formData,
        source_links: [...formData.source_links, { description: linkDescInput.trim(), url: linkUrlInput.trim() }],
      });
      setLinkDescInput("");
      setLinkUrlInput("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setFormData({
      ...formData,
      source_links: formData.source_links.filter((_, i) => i !== index),
    });
  };

  const handleActionTypeChange = (actionType: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, action_types: [...formData.action_types, actionType] });
    } else {
      setFormData({ ...formData, action_types: formData.action_types.filter((t) => t !== actionType) });
    }
  };

  const createComplianceNotification = async (directiveId: string, directiveCode: string, directiveTitle: string) => {
    const notificationDescription = `Directive Compliance: ${directiveCode} - ${directiveTitle}`;
    const today = new Date();
    const componentMap = formData.category === "Engine" ? "Propeller" : formData.category === "Propeller" ? "Propeller" : formData.category === "Avionics" ? "Avionics" : "Airframe";
    
    // Determine notification type and values based on initial_due_type
    if (formData.initial_due_type === "Before Next Flight" || formData.initial_due_type === "At Next Inspection") {
      // Create date-based notification with current date
      await supabase.from("notifications").insert({
        user_id: userId,
        description: notificationDescription,
        type: "Directives",
        component: componentMap,
        initial_date: format(today, "yyyy-MM-dd"),
        recurrence: "None",
        notification_basis: "Date",
        notes: `Initial Due: ${formData.initial_due_type}`,
        directive_id: directiveId,
      });
    } else if (formData.initial_due_type === "By Date" && formData.initial_due_date) {
      // Create date-based notification for the specified date
      await supabase.from("notifications").insert({
        user_id: userId,
        description: notificationDescription,
        type: "Directives",
        component: componentMap,
        initial_date: format(formData.initial_due_date, "yyyy-MM-dd"),
        recurrence: "None",
        notification_basis: "Date",
        notes: `Directive compliance due by date`,
        directive_id: directiveId,
      });
    } else if (formData.initial_due_type === "By Calendar" && formData.initial_due_date) {
      // Create date-based notification for the calculated/specified date
      await supabase.from("notifications").insert({
        user_id: userId,
        description: notificationDescription,
        type: "Directives",
        component: componentMap,
        initial_date: format(formData.initial_due_date, "yyyy-MM-dd"),
        recurrence: "None",
        notification_basis: "Date",
        notes: `Directive compliance due in ${formData.initial_due_months} months`,
        directive_id: directiveId,
      });
    } else if (formData.initial_due_type === "By Total Time (Hours)") {
      // Create counter-based notification
      let counterValue: number;
      const counterKey = getCounterKey(formData.counter_type);
      const currentCounterValue = Number(counters[counterKey as keyof typeof counters]) || 0;
      
      if (formData.counter_value_mode === "absolute") {
        counterValue = parseFloat(formData.counter_absolute_value) || currentCounterValue;
      } else {
        const increment = parseFloat(formData.counter_increment_value) || 0;
        counterValue = currentCounterValue + increment;
      }
      
      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        description: notificationDescription,
        type: "Directives",
        component: componentMap,
        initial_date: format(today, "yyyy-MM-dd"),
        recurrence: "None",
        notification_basis: "Counter",
        counter_type: formData.counter_type as any,
        initial_counter_value: counterValue,
        notes: `Directive compliance due at ${counterValue} ${formData.counter_type}`,
        directive_id: directiveId,
      });
      
      if (error) {
        console.error("Error creating counter notification:", error);
      }
    }
    // "Other" - no notification created
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.directive_code.trim()) {
      toast.error("Directive code is required");
      return;
    }

    // Check for duplicate directive code (excluding current directive when editing)
    const { data: existingDirective } = await supabase
      .from("directives")
      .select("id")
      .eq("user_id", userId)
      .eq("directive_code", formData.directive_code.trim())
      .maybeSingle();

    if (existingDirective && (!editingDirective || existingDirective.id !== editingDirective.id)) {
      toast.error("A directive with this code already exists");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    // Only require initial_due_type if applicability_status is "Applies"
    if (formData.applicability_status === "Applies" && !formData.initial_due_type) {
      toast.error("Initial Due Type is required when directive applies to your aircraft");
      return;
    }

    // Validation for By Total Time (Hours)
    if (formData.initial_due_type === "By Total Time (Hours)") {
      const counterKey = getCounterKey(formData.counter_type);
      if (formData.counter_value_mode === "absolute") {
        const absoluteValue = parseFloat(formData.counter_absolute_value);
        const currentCounterValue = Number(counters[counterKey as keyof typeof counters]) || 0;
        if (isNaN(absoluteValue) || absoluteValue < currentCounterValue) {
          toast.error(`Absolute value must be greater than or equal to current ${formData.counter_type} value (${currentCounterValue})`);
          return;
        }
      } else {
        const incrementValue = parseFloat(formData.counter_increment_value);
        if (isNaN(incrementValue) || incrementValue <= 0) {
          toast.error("Increment value must be a positive number");
          return;
        }
      }
    }

    // Compute initial_due_hours for counter-based
    let computedInitialDueHours = formData.initial_due_hours ? parseFloat(formData.initial_due_hours) : null;
    if (formData.initial_due_type === "By Total Time (Hours)") {
      const counterKey = getCounterKey(formData.counter_type);
      const currentCounterValue = Number(counters[counterKey as keyof typeof counters]) || 0;
      if (formData.counter_value_mode === "absolute") {
        computedInitialDueHours = parseFloat(formData.counter_absolute_value) || null;
      } else {
        const increment = parseFloat(formData.counter_increment_value) || 0;
        computedInitialDueHours = currentCounterValue + increment;
      }
    }

    const directiveData = {
      user_id: userId,
      directive_code: formData.directive_code,
      title: formData.title,
      directive_type: formData.directive_type as Database["public"]["Enums"]["directive_type"],
      severity: formData.severity as Database["public"]["Enums"]["directive_severity"],
      directive_status: formData.directive_status as Database["public"]["Enums"]["directive_status"],
      category: formData.category as Database["public"]["Enums"]["directive_category"],
      issuing_authority: formData.issuing_authority || null,
      issue_date: formData.issue_date ? format(formData.issue_date, "yyyy-MM-dd") : null,
      effective_date: formData.effective_date ? format(formData.effective_date, "yyyy-MM-dd") : null,
      revision: formData.revision || null,
      applicability_category: formData.applicability_category || null,
      applicability_model: formData.applicability_model || null,
      applicable_serial_range: formData.applicable_serial_range || null,
      applicability_status: formData.applicability_status || null,
      applicability_reason: formData.applicability_reason || null,
      applicability_notes: formData.applicability_notes || null,
      compliance_scope: formData.compliance_scope as Database["public"]["Enums"]["compliance_scope"],
      action_types: formData.action_types.length > 0 ? formData.action_types : null,
      initial_due_type: (formData.initial_due_type || null) as Database["public"]["Enums"]["initial_due_type"] | null,
      initial_due_hours: computedInitialDueHours,
      initial_due_months: formData.initial_due_months ? parseInt(formData.initial_due_months) : null,
      initial_due_date: formData.initial_due_date ? format(formData.initial_due_date, "yyyy-MM-dd") : null,
      repeat_hours: formData.repeat_hours ? parseFloat(formData.repeat_hours) : null,
      repeat_months: formData.repeat_months ? parseInt(formData.repeat_months) : null,
      terminating_action_exists: formData.terminating_action_exists,
      terminating_action_summary: formData.terminating_action_summary || null,
      requires_log_entry: formData.requires_log_entry,
      source_links: formData.source_links.length > 0 ? formData.source_links : null,
      counter_type: formData.initial_due_type === "By Total Time (Hours)" ? formData.counter_type : null,
    };

    try {
      if (editingDirective) {
        const { error } = await supabase
          .from("directives")
          .update(directiveData)
          .eq("id", editingDirective.id);
        if (error) throw error;
        
        // Handle notification type switching similar to maintenance records
        const notificationDescription = `Directive Compliance: ${formData.directive_code} - ${formData.title}`;
        const componentMap = formData.category === "Engine" ? "Propeller" : formData.category === "Propeller" ? "Propeller" : formData.category === "Avionics" ? "Avionics" : "Airframe";
        const today = new Date();
        
        // Fetch existing linked notifications
        const { data: existingNotifications } = await supabase
          .from("notifications")
          .select("*")
          .eq("directive_id", editingDirective.id)
          .eq("user_modified", false);
        
        const existingDateNotification = existingNotifications?.find(n => n.notification_basis === "Date");
        const existingCounterNotification = existingNotifications?.find(n => n.notification_basis === "Counter");
        
        // Determine if new type is date-based or counter-based
        const isNewDateBased = ["Before Next Flight", "At Next Inspection", "By Date", "By Calendar"].includes(formData.initial_due_type);
        const isNewCounterBased = formData.initial_due_type === "By Total Time (Hours)";
        const isNewOther = formData.initial_due_type === "Other" || !formData.initial_due_type;
        
        // Handle "Other" or empty - delete all non-user-modified notifications
        if (isNewOther) {
          if (existingDateNotification) {
            await supabase.from("notifications").delete().eq("id", existingDateNotification.id);
          }
          if (existingCounterNotification) {
            await supabase.from("notifications").delete().eq("id", existingCounterNotification.id);
          }
        }
        // Handle date-based types
        else if (isNewDateBased) {
          // Delete counter notification if exists
          if (existingCounterNotification) {
            await supabase.from("notifications").delete().eq("id", existingCounterNotification.id);
          }
          
          // Prepare date notification data
          let initialDate = format(today, "yyyy-MM-dd");
          let notes = `Initial Due: ${formData.initial_due_type}`;
          
          if (formData.initial_due_type === "By Date" && formData.initial_due_date) {
            initialDate = format(formData.initial_due_date, "yyyy-MM-dd");
            notes = `Directive compliance due by date`;
          } else if (formData.initial_due_type === "By Calendar" && formData.initial_due_date) {
            initialDate = format(formData.initial_due_date, "yyyy-MM-dd");
            notes = `Directive compliance due in ${formData.initial_due_months} months`;
          }
          
          if (existingDateNotification) {
            // Update existing date notification
            await supabase.from("notifications")
              .update({
                description: notificationDescription,
                component: componentMap,
                initial_date: initialDate,
                notes: notes,
              })
              .eq("id", existingDateNotification.id);
          } else {
            // Create new date notification
            await supabase.from("notifications").insert({
              user_id: userId,
              description: notificationDescription,
              type: "Maintenance",
              component: componentMap,
              initial_date: initialDate,
              recurrence: "None",
              notification_basis: "Date",
              notes: notes,
              directive_id: editingDirective.id,
            });
          }
        }
        // Handle counter-based type
        else if (isNewCounterBased) {
          // Delete date notification if exists
          if (existingDateNotification) {
            await supabase.from("notifications").delete().eq("id", existingDateNotification.id);
          }
          
          const counterKey = getCounterKey(formData.counter_type);
          const currentCounterValue = Number(counters[counterKey as keyof typeof counters]) || 0;
          let counterValue: number;
          if (formData.counter_value_mode === "absolute") {
            counterValue = parseFloat(formData.counter_absolute_value) || currentCounterValue;
          } else {
            counterValue = currentCounterValue + (parseFloat(formData.counter_increment_value) || 0);
          }
          
          if (existingCounterNotification) {
            // Update existing counter notification
            await supabase.from("notifications")
              .update({
                description: notificationDescription,
                component: componentMap,
                counter_type: formData.counter_type as any,
                initial_counter_value: counterValue,
                notes: `Directive compliance due at ${counterValue} ${formData.counter_type}`,
              })
              .eq("id", existingCounterNotification.id);
          } else {
            // Create new counter notification
            await supabase.from("notifications").insert({
              user_id: userId,
              description: notificationDescription,
              type: "Maintenance",
              component: componentMap,
              initial_date: format(today, "yyyy-MM-dd"),
              recurrence: "None",
              notification_basis: "Counter",
              counter_type: formData.counter_type as any,
              initial_counter_value: counterValue,
              notes: `Directive compliance due at ${counterValue} ${formData.counter_type}`,
              directive_id: editingDirective.id,
            });
          }
        }
      } else {
        const { data: newDirective, error } = await supabase
          .from("directives")
          .insert([directiveData])
          .select()
          .single();
        if (error) throw error;
        
        // Log Create action to directive history
        if (newDirective) {
          await supabase.from("directive_history").insert({
            user_id: userId,
            directive_id: newDirective.id,
            directive_code: newDirective.directive_code,
            directive_title: newDirective.title,
            action_type: "Create",
          });

          // Create compliance notification for new directives (not "Other")
          if (formData.initial_due_type && formData.initial_due_type !== "Other") {
            await createComplianceNotification(newDirective.id, newDirective.directive_code, newDirective.title);
          }
        }
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error saving directive:", error);
      toast.error("Failed to save directive");
    }
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              {editingDirective ? "Edit Directive" : "New Directive"}
            </h2>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>

          {/* Core Identification */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Core Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="directive_code">Directive Code *</Label>
                <Input
                  id="directive_code"
                  value={formData.directive_code}
                  onChange={(e) => setFormData({ ...formData, directive_code: e.target.value })}
                  maxLength={40}
                  placeholder="e.g., AD 2024-01-01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Directive Type *</Label>
                <Select value={formData.directive_type} onValueChange={(value) => setFormData({ ...formData, directive_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTIVE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((sev) => (
                      <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Directive Status *</Label>
                <Select value={formData.directive_status} onValueChange={(value) => setFormData({ ...formData, directive_status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTIVE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
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
            </div>
          </div>

          {/* Authority & Dates */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Authority & Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issuing_authority">Issuing Authority</Label>
                <Input
                  id="issuing_authority"
                  value={formData.issuing_authority}
                  onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                  maxLength={100}
                  placeholder="e.g., FAA, Rotax, Sling Aircraft"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revision">Revision</Label>
                <Input
                  id="revision"
                  value={formData.revision}
                  onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                  maxLength={20}
                  placeholder="e.g., Rev 2"
                />
              </div>
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <DateInput
                  value={formData.issue_date}
                  onChange={(date) => setFormData({ ...formData, issue_date: date })}
                  placeholder="Pick a date"
                />
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <DateInput
                  value={formData.effective_date}
                  onChange={(date) => setFormData({ ...formData, effective_date: date })}
                  placeholder="Pick a date"
                />
              </div>
            </div>
          </div>

          {/* Applicability */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Applicability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Applicability Category</Label>
                <Select
                  value={formData.applicability_category}
                  onValueChange={(value) => setFormData({ ...formData, applicability_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicability_model">Model</Label>
                <Input
                  id="applicability_model"
                  value={formData.applicability_model}
                  onChange={(e) => setFormData({ ...formData, applicability_model: e.target.value })}
                  maxLength={200}
                  placeholder="e.g., Rotax 916is"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicable_serial_range">Applicable Serial Range</Label>
                <Input
                  id="applicable_serial_range"
                  value={formData.applicable_serial_range}
                  onChange={(e) => setFormData({ ...formData, applicable_serial_range: e.target.value })}
                  placeholder="e.g., S/N 001-500"
                />
              </div>
              <div></div>
              <div className="space-y-2">
                <Label>Applies to My Aircraft?</Label>
                <Select
                  value={formData.applicability_status}
                  onValueChange={(value) => setFormData({ ...formData, applicability_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICABILITY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicability_reason">Reason / Explanation</Label>
                <Input
                  id="applicability_reason"
                  value={formData.applicability_reason}
                  onChange={(e) => setFormData({ ...formData, applicability_reason: e.target.value })}
                  placeholder="e.g., Serial number not in affected range"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="applicability_notes">Applicability Notes</Label>
                <Textarea
                  id="applicability_notes"
                  value={formData.applicability_notes}
                  onChange={(e) => setFormData({ ...formData, applicability_notes: e.target.value })}
                  placeholder="Additional notes about applicability..."
                />
              </div>
            </div>
          </div>

          {/* Compliance Requirements */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Compliance Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Compliance Scope {formData.applicability_status === "Applies" ? "*" : ""}</Label>
                <Select value={formData.compliance_scope} onValueChange={(value) => setFormData({ ...formData, compliance_scope: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_SCOPES.map((scope) => (
                      <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Initial Due Type {formData.applicability_status === "Applies" ? "*" : ""}</Label>
                <Select 
                  value={formData.initial_due_type} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    initial_due_type: value,
                    // Reset related fields when type changes
                    initial_due_hours: "",
                    initial_due_months: "",
                    initial_due_date: null,
                    counter_absolute_value: "",
                    counter_increment_value: "",
                    // Reset repeat fields when changing due type
                    repeat_hours: "",
                    repeat_months: "",
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INITIAL_DUE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional fields based on Initial Due Type */}
            {formData.initial_due_type === "By Date" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <DateInput
                    value={formData.initial_due_date}
                    onChange={(date) => setFormData({ ...formData, initial_due_date: date })}
                    placeholder="Pick a date"
                  />
                </div>
              </div>
            )}

            {formData.initial_due_type === "By Calendar" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="initial_due_months">Months from Today *</Label>
                  <Input
                    id="initial_due_months"
                    type="number"
                    min="1"
                    value={formData.initial_due_months}
                    onChange={(e) => setFormData({ ...formData, initial_due_months: e.target.value })}
                    placeholder="Enter number of months"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Calculated Due Date</Label>
                  <DateInput
                    value={formData.initial_due_date}
                    onChange={(date) => setFormData({ ...formData, initial_due_date: date })}
                    placeholder="Auto-calculated"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated based on months, but can be adjusted</p>
                </div>
              </div>
            )}

            {formData.initial_due_type === "By Total Time (Hours)" && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Counter Type *</Label>
                    <Select value={formData.counter_type} onValueChange={(value) => setFormData({ ...formData, counter_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTER_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Current value: {Number(counters[getCounterKey(formData.counter_type) as keyof typeof counters]) || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Value Mode *</Label>
                    <RadioGroup
                      value={formData.counter_value_mode}
                      onValueChange={(value) => setFormData({ ...formData, counter_value_mode: value as "absolute" | "incremental" })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="absolute" id="absolute" />
                        <Label htmlFor="absolute" className="font-normal">Absolute Value</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="incremental" id="incremental" />
                        <Label htmlFor="incremental" className="font-normal">Incremental</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {formData.counter_value_mode === "absolute" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="counter_absolute_value">Due at Counter Value *</Label>
                      <Input
                        id="counter_absolute_value"
                        type="number"
                        step="0.1"
                        min={Number(counters[getCounterKey(formData.counter_type) as keyof typeof counters]) || 0}
                        value={formData.counter_absolute_value}
                        onChange={(e) => setFormData({ ...formData, counter_absolute_value: e.target.value })}
                        placeholder={`Must be ≥ ${Number(counters[getCounterKey(formData.counter_type) as keyof typeof counters]) || 0}`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be greater than or equal to current value ({Number(counters[getCounterKey(formData.counter_type) as keyof typeof counters]) || 0})
                      </p>
                    </div>
                  </div>
                )}

                {formData.counter_value_mode === "incremental" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="counter_increment_value">Add Hours to Current *</Label>
                      <Input
                        id="counter_increment_value"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.counter_increment_value}
                        onChange={(e) => setFormData({ ...formData, counter_increment_value: e.target.value })}
                        placeholder="Enter hours to add"
                      />
                      {formData.counter_increment_value && (
                        <p className="text-xs text-muted-foreground">
                          Due at: {(Number(counters[getCounterKey(formData.counter_type) as keyof typeof counters]) || 0) + (parseFloat(formData.counter_increment_value) || 0)} {formData.counter_type}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Repeat fields - shown only for Recurring scope based on Initial Due Type */}
            {formData.compliance_scope === "Recurring" && 
             formData.initial_due_type && 
             formData.initial_due_type !== "Other" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Date-based repeat: show months field */}
                {["Before Next Flight", "At Next Inspection", "By Date", "By Calendar"].includes(formData.initial_due_type) && (
                  <div className="space-y-2">
                    <Label htmlFor="repeat_months">Repeat Every (Months)</Label>
                    <Input
                      id="repeat_months"
                      type="number"
                      min="1"
                      value={formData.repeat_months}
                      onChange={(e) => setFormData({ ...formData, repeat_months: e.target.value })}
                      placeholder="Enter number of months"
                    />
                  </div>
                )}
                {/* Counter-based repeat: show hours field */}
                {formData.initial_due_type === "By Total Time (Hours)" && (
                  <div className="space-y-2">
                    <Label htmlFor="repeat_hours">Repeat Every (Hours)</Label>
                    <Input
                      id="repeat_hours"
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.repeat_hours}
                      onChange={(e) => setFormData({ ...formData, repeat_hours: e.target.value })}
                      placeholder="Enter hours interval"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Label>Action Types</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ACTION_TYPES.map((actionType) => (
                  <div key={actionType} className="flex items-center space-x-2">
                    <Checkbox
                      id={`action-${actionType}`}
                      checked={formData.action_types.includes(actionType)}
                      onCheckedChange={(checked) => handleActionTypeChange(actionType, checked as boolean)}
                    />
                    <Label htmlFor={`action-${actionType}`} className="text-sm font-normal">{actionType}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="terminating_action_exists"
                  checked={formData.terminating_action_exists}
                  onCheckedChange={(checked) => setFormData({ ...formData, terminating_action_exists: checked })}
                />
                <Label htmlFor="terminating_action_exists">Terminating Action Available</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_log_entry"
                  checked={formData.requires_log_entry}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_log_entry: checked })}
                />
                <Label htmlFor="requires_log_entry">Requires Logbook Entry</Label>
              </div>
            </div>

            {formData.terminating_action_exists && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="terminating_action_summary">Terminating Action Summary</Label>
                <Input
                  id="terminating_action_summary"
                  value={formData.terminating_action_summary}
                  onChange={(e) => setFormData({ ...formData, terminating_action_summary: e.target.value })}
                  maxLength={255}
                  placeholder="Describe the terminating action..."
                />
              </div>
            )}
          </div>

          {/* Source Documents */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Source Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="link_desc_input" className="text-sm">Description</Label>
                <Input
                  id="link_desc_input"
                  value={linkDescInput}
                  onChange={(e) => setLinkDescInput(e.target.value)}
                  maxLength={200}
                  placeholder="e.g., Official AD Document"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="link_url_input" className="text-sm">URL</Label>
                <Input
                  id="link_url_input"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  maxLength={500}
                  placeholder="https://..."
                />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>
              Add Link
            </Button>
            {formData.source_links.length > 0 && (
              <div className="space-y-2 mt-2">
                {formData.source_links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline flex-1 truncate"
                    >
                      {link.description || link.url}
                    </a>
                    <X className="h-4 w-4 cursor-pointer flex-shrink-0 hover:text-destructive" onClick={() => handleRemoveLink(index)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDirective ? "Update Directive" : "Create Directive"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DirectiveForm;
