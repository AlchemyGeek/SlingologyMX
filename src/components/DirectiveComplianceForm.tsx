import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Directive } from "./DirectivesPanel";
import type { Database } from "@/integrations/supabase/types";

import { useAircraftCounters, AircraftCounters } from "@/hooks/useAircraftCounters";

interface DirectiveComplianceFormProps {
  directive: Directive;
  userId: string;
  existingStatus: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const COMPLIANCE_STATUSES = ["Not Complied", "Complied"];
const PERFORMED_BY_ROLES = [
  "Owner/Builder",
  "Owner/Pilot",
  "A&P",
  "IA",
  "Rotax IRMT",
  "Maintenance Shop",
  "Other",
];



const isCounterBasedDirective = (directive: Directive): boolean => {
  return directive.initial_due_type === "By Total Time (Hours)";
};

const getCounterValue = (counters: AircraftCounters, counterType: string): number => {
  switch (counterType) {
    case "Hobbs": return counters.hobbs;
    case "Tach": return counters.tach;
    case "Airframe TT": return counters.airframe_total_time;
    case "Engine TT": return counters.engine_total_time;
    case "Prop TT": return counters.prop_total_time;
    default: return 0;
  }
};

const getCounterKey = (counterType: string): string => {
  switch (counterType) {
    case "Hobbs": return "hobbs";
    case "Tach": return "tach";
    case "Airframe TT": return "airframe_total_time";
    case "Engine TT": return "engine_total_time";
    case "Prop TT": return "prop_total_time";
    default: return "hobbs";
  }
};

const DirectiveComplianceForm = ({
  directive,
  userId,
  existingStatus,
  onSuccess,
  onCancel,
}: DirectiveComplianceFormProps) => {
  const { counters } = useAircraftCounters(userId);
  const isCounterBased = isCounterBasedDirective(directive);
  
  const [directiveCounterType, setDirectiveCounterType] = useState<string | null>(null);
  const [isLoadingCounterType, setIsLoadingCounterType] = useState(isCounterBased);

  const [formData, setFormData] = useState({
    compliance_status: "Not Complied" as string,
    compliance_date: new Date() as Date | null,
    counter_type: "Hobbs",
    counter_value: "",
    next_due_basis: "" as string,
    next_due_counter_type: "" as string,
    next_due_date: null as Date | null,
    next_due_tach: "",
    performed_by_name: "",
    performed_by_role: "" as string,
    owner_notes: "",
    compliance_links: [] as Array<{ description: string; url: string }>,
    labor_hours_actual: "",
    labor_rate: "",
    parts_cost: "",
    total_cost: "",
    maintenance_provider_name: "",
  });

  const [linkDescInput, setLinkDescInput] = useState("");
  const [linkUrlInput, setLinkUrlInput] = useState("");

  // Fetch the counter type from the linked notification
  useEffect(() => {
    const fetchDirectiveCounterType = async () => {
      if (!isCounterBased) return;
      
      setIsLoadingCounterType(true);
      try {
        const { data } = await supabase
          .from("notifications")
          .select("counter_type")
          .eq("directive_id", directive.id)
          .eq("notification_basis", "Counter")
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (data && data.length > 0 && data[0].counter_type) {
          const counterType = data[0].counter_type;
          setDirectiveCounterType(counterType);
          const currentValue = getCounterValue(counters, counterType);
          setFormData(prev => ({
            ...prev,
            counter_type: counterType,
            counter_value: currentValue.toString()
          }));
        }
      } catch (error) {
        console.error("Error fetching directive counter type:", error);
      } finally {
        setIsLoadingCounterType(false);
      }
    };

    fetchDirectiveCounterType();
  }, [directive.id, isCounterBased, counters]);

  // Update counter value when counters load (for new compliance events)
  useEffect(() => {
    if (!existingStatus && isCounterBased && counters && directiveCounterType) {
      const currentValue = getCounterValue(counters, directiveCounterType);
      setFormData(prev => ({
        ...prev,
        counter_value: currentValue.toString()
      }));
    }
  }, [counters, existingStatus, isCounterBased, directiveCounterType]);

  useEffect(() => {
    if (existingStatus) {
      // Map old status values to new simplified ones
      let mappedStatus = existingStatus.compliance_status;
      if (mappedStatus === "Complied Once" || mappedStatus === "Recurring (Current)") {
        mappedStatus = "Complied";
      } else if (mappedStatus !== "Not Complied" && mappedStatus !== "Complied") {
        mappedStatus = "Not Complied";
      }

      setFormData({
        compliance_status: mappedStatus,
        compliance_date: existingStatus.first_compliance_date
          ? parseLocalDate(existingStatus.first_compliance_date)
          : new Date(),
        counter_type: existingStatus.next_due_counter_type || directiveCounterType || "Hobbs",
        counter_value: existingStatus.first_compliance_tach?.toString() || "",
        next_due_basis: existingStatus.next_due_basis || "",
        next_due_counter_type: existingStatus.next_due_counter_type || "",
        next_due_date: existingStatus.next_due_date ? parseLocalDate(existingStatus.next_due_date) : null,
        next_due_tach: existingStatus.next_due_tach?.toString() || "",
        performed_by_name: existingStatus.performed_by_name || "",
        performed_by_role: existingStatus.performed_by_role || "",
        owner_notes: existingStatus.owner_notes || "",
        compliance_links: existingStatus.compliance_links || [],
        labor_hours_actual: existingStatus.labor_hours_actual?.toString() || "",
        labor_rate: existingStatus.labor_rate?.toString() || "",
        parts_cost: existingStatus.parts_cost?.toString() || "",
        total_cost: existingStatus.total_cost?.toString() || "",
        maintenance_provider_name: existingStatus.maintenance_provider_name || "",
      });
    }
  }, [existingStatus, directiveCounterType]);

  const handleAddLink = () => {
    if (linkDescInput.trim() && linkUrlInput.trim()) {
      setFormData({
        ...formData,
        compliance_links: [
          ...formData.compliance_links,
          { description: linkDescInput.trim(), url: linkUrlInput.trim() },
        ],
      });
      setLinkDescInput("");
      setLinkUrlInput("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setFormData({
      ...formData,
      compliance_links: formData.compliance_links.filter((_, i) => i !== index),
    });
  };

  // Handle notification completion and create new recurring notification if applicable
  const handleNotificationCompletionAndRecurrence = async () => {
    try {
      // Find linked notification that hasn't been modified by user
      const { data: linkedNotifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("directive_id", directive.id)
        .eq("user_modified", false)
        .eq("is_completed", false);

      if (!linkedNotifications || linkedNotifications.length === 0) {
        return; // No unmodified linked notifications to process
      }

      const notificationToComplete = linkedNotifications[0];

      // Mark the notification as completed
      await supabase
        .from("notifications")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", notificationToComplete.id);

      // Check if directive is recurring and create new notification
      if (directive.compliance_scope === "Recurring") {
        const today = new Date();
        const componentMap = directive.category === "Engine" ? "Propeller" : directive.category === "Propeller" ? "Propeller" : directive.category === "Avionics" ? "Avionics" : "Airframe";
        const notificationDescription = `Directive Compliance: ${directive.directive_code} - ${directive.title}`;

        // Determine if date-based or counter-based recurrence
        const isCounterBasedRecurrence = directive.repeat_hours && directive.repeat_hours > 0;
        const isDateBasedRecurrence = directive.repeat_months && directive.repeat_months > 0;

        if (isCounterBasedRecurrence && isCounterBased) {
          // Counter-based recurring notification
          const counterKey = getCounterKey(formData.counter_type);
          const currentCounterValue = formData.counter_value 
            ? parseFloat(formData.counter_value) 
            : getCounterValue(counters, formData.counter_type);
          const nextDueValue = currentCounterValue + (directive.repeat_hours || 0);

          await supabase.from("notifications").insert({
            user_id: userId,
            description: notificationDescription,
            type: "Directives",
            component: componentMap,
            initial_date: format(today, "yyyy-MM-dd"),
            recurrence: "None",
            notification_basis: "Counter",
            counter_type: formData.counter_type as any,
            initial_counter_value: nextDueValue,
            notes: `Recurring directive compliance due at ${nextDueValue} ${formData.counter_type}`,
            directive_id: directive.id,
            user_modified: false,
          });
        } else if (isDateBasedRecurrence) {
          // Date-based recurring notification
          const complianceDate = formData.compliance_date || today;
          const nextDueDate = addMonths(complianceDate, directive.repeat_months || 0);

          await supabase.from("notifications").insert({
            user_id: userId,
            description: notificationDescription,
            type: "Directives",
            component: componentMap,
            initial_date: format(nextDueDate, "yyyy-MM-dd"),
            recurrence: "None",
            notification_basis: "Date",
            notes: `Recurring directive compliance due every ${directive.repeat_months} months`,
            directive_id: directive.id,
            user_modified: false,
          });
        }
      }
    } catch (error) {
      console.error("Error handling notification completion/recurrence:", error);
      // Don't fail the whole operation if notification handling fails
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Map simplified status to database enum
    const dbComplianceStatus = formData.compliance_status === "Complied" 
      ? "Complied Once" as Database["public"]["Enums"]["db_compliance_status"]
      : "Not Complied" as Database["public"]["Enums"]["db_compliance_status"];

    const statusData = {
      user_id: userId,
      directive_id: directive.id,
      applicability_status: "Applies" as Database["public"]["Enums"]["applicability_status"],
      applicability_reason: null,
      compliance_status: dbComplianceStatus,
      first_compliance_date: formData.compliance_date
        ? format(formData.compliance_date, "yyyy-MM-dd")
        : null,
      first_compliance_tach: isCounterBased && formData.counter_value
        ? parseFloat(formData.counter_value)
        : null,
      last_compliance_date: null,
      last_compliance_tach: null,
      next_due_basis: formData.next_due_basis || null,
      next_due_counter_type: isCounterBased ? formData.counter_type : (formData.next_due_counter_type || null),
      next_due_date: formData.next_due_basis === "Date" && formData.next_due_date 
        ? format(formData.next_due_date, "yyyy-MM-dd") 
        : null,
      next_due_tach: formData.next_due_basis === "Counter" && formData.next_due_tach 
        ? parseFloat(formData.next_due_tach) 
        : null,
      performed_by_name: formData.performed_by_name || null,
      performed_by_role: (formData.performed_by_role || null) as Database["public"]["Enums"]["directive_performed_by_role"] | null,
      owner_notes: formData.owner_notes || null,
      compliance_links: formData.compliance_links.length > 0 ? formData.compliance_links : null,
      labor_hours_actual: formData.labor_hours_actual
        ? parseFloat(formData.labor_hours_actual)
        : null,
      labor_rate: formData.labor_rate ? parseFloat(formData.labor_rate) : null,
      parts_cost: formData.parts_cost ? parseFloat(formData.parts_cost) : null,
      total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
      maintenance_provider_name: formData.maintenance_provider_name || null,
    };

    try {
      // Check if compliance date changed
      const dateChanged = existingStatus && 
        (existingStatus.first_compliance_date !== statusData.first_compliance_date);
      const isNewCompliance = !existingStatus && statusData.first_compliance_date;
      
      // Only log compliance if status is "Complied Once" (which maps from "Complied")
      const isComplianceLoggableStatus = statusData.compliance_status === "Complied Once";
      
      if (existingStatus) {
        const { error } = await supabase
          .from("aircraft_directive_status")
          .update(statusData)
          .eq("id", existingStatus.id);
        if (error) throw error;
        
        // Log Compliance action if date changed AND status is compliant
        if (dateChanged && isComplianceLoggableStatus) {
          await supabase.from("directive_history").insert({
            user_id: userId,
            directive_id: directive.id,
            directive_code: directive.directive_code,
            directive_title: directive.title,
            action_type: "Compliance",
            compliance_status: statusData.compliance_status,
            first_compliance_date: statusData.first_compliance_date,
            last_compliance_date: null,
          });
        }
        toast.success("Compliance status updated");
      } else {
        const { error } = await supabase.from("aircraft_directive_status").insert([statusData]);
        if (error) throw error;
        
        // Log Compliance action if date is set on new record AND status is compliant
        if (isNewCompliance && isComplianceLoggableStatus) {
          await supabase.from("directive_history").insert({
            user_id: userId,
            directive_id: directive.id,
            directive_code: directive.directive_code,
            directive_title: directive.title,
            action_type: "Compliance",
            compliance_status: statusData.compliance_status,
            first_compliance_date: statusData.first_compliance_date,
            last_compliance_date: null,
          });
        }
        toast.success("Compliance status created");
      }

      // Handle notification completion and recurrence when status is "Complied"
      if (formData.compliance_status === "Complied") {
        await handleNotificationCompletionAndRecurrence();
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving compliance status:", error);
      toast.error("Failed to save compliance status");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {existingStatus ? "Edit" : "Add"} Compliance Event for {directive.directive_code}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Compliance Status */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Compliance Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={formData.compliance_status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, compliance_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <DateInput
                  value={formData.compliance_date}
                  onChange={(date) =>
                    setFormData({ ...formData, compliance_date: date })
                  }
                />
              </div>
              {isCounterBased && directiveCounterType && (
                <>
                  <div className="space-y-2">
                    <Label>Counter Type</Label>
                    <Input
                      value={directiveCounterType}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Counter type defined in the directive record
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="counter_value">Counter Value</Label>
                    <Input
                      id="counter_value"
                      type="number"
                      step="0.1"
                      value={formData.counter_value}
                      onChange={(e) =>
                        setFormData({ ...formData, counter_value: e.target.value })
                      }
                      placeholder={`Current: ${getCounterValue(counters, directiveCounterType)}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Current {directiveCounterType}: {getCounterValue(counters, directiveCounterType)}
                    </p>
                  </div>
                </>
              )}
              {isCounterBased && isLoadingCounterType && (
                <div className="col-span-2 text-sm text-muted-foreground">
                  Loading counter information...
                </div>
              )}
            </div>

          </div>

          {/* Performer Info */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Performer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="performed_by_name">Performed By</Label>
                <Input
                  id="performed_by_name"
                  value={formData.performed_by_name}
                  onChange={(e) =>
                    setFormData({ ...formData, performed_by_name: e.target.value })
                  }
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.performed_by_role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, performed_by_role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PERFORMED_BY_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="maintenance_provider_name">Maintenance Provider</Label>
                <Input
                  id="maintenance_provider_name"
                  value={formData.maintenance_provider_name}
                  onChange={(e) =>
                    setFormData({ ...formData, maintenance_provider_name: e.target.value })
                  }
                  maxLength={120}
                />
              </div>
            </div>
          </div>

          {/* Costs */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Costs</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labor_hours_actual">Labor Hours</Label>
                <Input
                  id="labor_hours_actual"
                  type="number"
                  step="0.1"
                  value={formData.labor_hours_actual}
                  onChange={(e) =>
                    setFormData({ ...formData, labor_hours_actual: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labor_rate">Labor Rate</Label>
                <Input
                  id="labor_rate"
                  type="number"
                  step="0.01"
                  value={formData.labor_rate}
                  onChange={(e) => setFormData({ ...formData, labor_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parts_cost">Parts Cost</Label>
                <Input
                  id="parts_cost"
                  type="number"
                  step="0.01"
                  value={formData.parts_cost}
                  onChange={(e) => setFormData({ ...formData, parts_cost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_cost">Total Cost</Label>
                <Input
                  id="total_cost"
                  type="number"
                  step="0.01"
                  value={formData.total_cost}
                  onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Notes</h3>
            <div className="space-y-2">
              <Label htmlFor="owner_notes">Notes</Label>
              <Textarea
                id="owner_notes"
                value={formData.owner_notes}
                onChange={(e) => setFormData({ ...formData, owner_notes: e.target.value })}
                placeholder="Any additional notes about compliance..."
              />
            </div>
          </div>

          {/* Evidence Links */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Compliance Evidence</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="link_desc_input" className="text-sm">
                  Description
                </Label>
                <Input
                  id="link_desc_input"
                  value={linkDescInput}
                  onChange={(e) => setLinkDescInput(e.target.value)}
                  maxLength={200}
                  placeholder="e.g., Work order, photos"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="link_url_input" className="text-sm">
                  URL
                </Label>
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
            {formData.compliance_links.length > 0 && (
              <div className="space-y-2 mt-2">
                {formData.compliance_links.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline flex-1 truncate"
                    >
                      {link.description || link.url}
                    </a>
                    <X
                      className="h-4 w-4 cursor-pointer flex-shrink-0 hover:text-destructive"
                      onClick={() => handleRemoveLink(index)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{existingStatus ? "Update Status" : "Save Status"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DirectiveComplianceForm;
