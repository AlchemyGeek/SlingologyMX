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
  
  // Get counter type directly from directive record
  const directiveCounterType = isCounterBased ? directive.counter_type : null;

  const [formData, setFormData] = useState({
    compliance_status: "Not Complied" as string,
    compliance_date: new Date() as Date | null,
    counter_type: directiveCounterType || "Hobbs",
    counter_value: "",
    next_due_basis: "" as string,
    next_due_counter_type: "" as string,
    next_due_date: null as Date | null,
    next_due_tach: "",
    owner_notes: "",
    compliance_links: [] as Array<{ description: string; url: string }>,
  });

  const [linkDescInput, setLinkDescInput] = useState("");
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  // Set default counter value when counters load (for new compliance events)
  useEffect(() => {
    if (!existingStatus && isCounterBased && counters && directiveCounterType) {
      const currentValue = getCounterValue(counters, directiveCounterType);
      setFormData(prev => ({
        ...prev,
        counter_type: directiveCounterType,
        counter_value: currentValue.toString()
      }));
    }
  }, [counters, existingStatus, isCounterBased, directiveCounterType]);

  useEffect(() => {
    if (existingStatus) {
      // Map status values for display
      let mappedStatus = existingStatus.compliance_status;
      if (mappedStatus === "Complied Once" || mappedStatus === "Recurring (Current)") {
        mappedStatus = "Complied";
      } else if (mappedStatus !== "Not Complied" && mappedStatus !== "Complied") {
        mappedStatus = "Not Complied";
      }

      setFormData({
        compliance_status: mappedStatus,
        compliance_date: existingStatus.compliance_date
          ? parseLocalDate(existingStatus.compliance_date)
          : new Date(),
        counter_type: existingStatus.counter_type || directiveCounterType || "Hobbs",
        counter_value: existingStatus.counter_value?.toString() || "",
        next_due_basis: "",
        next_due_counter_type: "",
        next_due_date: null,
        next_due_tach: "",
        owner_notes: existingStatus.owner_notes || "",
        compliance_links: existingStatus.compliance_links || [],
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

  // Helper to update directive status to Completed and delete linked notifications
  const updateDirectiveStatusToCompleted = async () => {
    try {
      // Update directive status
      await supabase
        .from("directives")
        .update({ directive_status: "Completed" })
        .eq("id", directive.id);

      // Delete all linked notifications for this directive
      await supabase
        .from("notifications")
        .delete()
        .eq("directive_id", directive.id);
    } catch (error) {
      console.error("Error updating directive status:", error);
    }
  };

  // Core save logic extracted for reuse
  const performSave = async (markAsCompleted: boolean) => {
    const complianceDate = formData.compliance_date
      ? format(formData.compliance_date, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");

    // Data for maintenance_directive_compliance (individual event)
    const complianceEventData = {
      user_id: userId,
      directive_id: directive.id,
      maintenance_log_id: null, // Standalone compliance event, not linked to maintenance log
      compliance_status: formData.compliance_status,
      compliance_date: complianceDate,
      counter_type: isCounterBased ? formData.counter_type : null,
      counter_value: isCounterBased && formData.counter_value
        ? parseFloat(formData.counter_value)
        : null,
      owner_notes: formData.owner_notes || null,
      compliance_links: formData.compliance_links.length > 0 ? formData.compliance_links : null,
    };

    try {
      // Check if this is an update or insert
      const isNewCompliance = !existingStatus;
      const dateChanged = existingStatus && 
        (existingStatus.compliance_date !== complianceDate);
      
      // Only log compliance if status is "Complied"
      const isComplianceLoggableStatus = formData.compliance_status === "Complied";
      
      if (existingStatus) {
        // Update existing compliance event in maintenance_directive_compliance
        const { error } = await supabase
          .from("maintenance_directive_compliance")
          .update(complianceEventData)
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
            compliance_status: "Complied Once",
            first_compliance_date: complianceDate,
            last_compliance_date: null,
          });
        }
        toast.success("Compliance event updated");
      } else {
        // Insert new compliance event
        const { error } = await supabase
          .from("maintenance_directive_compliance")
          .insert([complianceEventData]);
        if (error) throw error;
        
        // Log Compliance action if status is compliant
        if (isComplianceLoggableStatus) {
          await supabase.from("directive_history").insert({
            user_id: userId,
            directive_id: directive.id,
            directive_code: directive.directive_code,
            directive_title: directive.title,
            action_type: "Compliance",
            compliance_status: "Complied Once",
            first_compliance_date: complianceDate,
            last_compliance_date: null,
          });
        }
        toast.success("Compliance event created");
      }

      // Update aircraft_directive_status summary
      if (formData.compliance_status === "Complied") {
        await updateDirectiveStatusSummary(complianceDate);
      }

      // Handle notification completion and recurrence when status is "Complied"
      if (formData.compliance_status === "Complied") {
        await handleNotificationCompletionAndRecurrence();
      }

      // Update directive status to Completed if requested
      if (markAsCompleted) {
        await updateDirectiveStatusToCompleted();
        toast.info("Directive has been marked as Completed");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving compliance event:", error);
      toast.error("Failed to save compliance event");
    }
  };

  // Update aircraft_directive_status summary from all compliance events
  const updateDirectiveStatusSummary = async (newComplianceDate: string) => {
    try {
      // Fetch all compliance events for this directive
      const { data: allEvents } = await supabase
        .from("maintenance_directive_compliance")
        .select("*")
        .eq("directive_id", directive.id)
        .eq("user_id", userId)
        .eq("compliance_status", "Complied")
        .order("compliance_date", { ascending: true });

      if (!allEvents || allEvents.length === 0) return;

      const firstEvent = allEvents[0];
      const lastEvent = allEvents[allEvents.length - 1];

      // Check if aircraft_directive_status exists
      const { data: existingDirectiveStatus } = await supabase
        .from("aircraft_directive_status")
        .select("id")
        .eq("directive_id", directive.id)
        .eq("user_id", userId)
        .maybeSingle();

      const summaryData = {
        user_id: userId,
        directive_id: directive.id,
        applicability_status: "Applies" as Database["public"]["Enums"]["applicability_status"],
        compliance_status: directive.compliance_scope === "Recurring" 
          ? "Recurring (Current)" as Database["public"]["Enums"]["db_compliance_status"]
          : "Complied Once" as Database["public"]["Enums"]["db_compliance_status"],
        first_compliance_date: firstEvent.compliance_date,
        first_compliance_tach: firstEvent.counter_value,
        last_compliance_date: lastEvent.compliance_date,
        last_compliance_tach: lastEvent.counter_value,
      };

      if (existingDirectiveStatus) {
        await supabase
          .from("aircraft_directive_status")
          .update(summaryData)
          .eq("id", existingDirectiveStatus.id);
      } else {
        await supabase
          .from("aircraft_directive_status")
          .insert([summaryData]);
      }
    } catch (error) {
      console.error("Error updating directive status summary:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only apply directive completion logic if directive status is NOT already "Completed"
    const shouldCheckCompletion = directive.directive_status !== "Completed" && formData.compliance_status === "Complied";

    if (shouldCheckCompletion) {
      if (directive.compliance_scope === "One-Time") {
        // Auto-mark as completed for One-Time directives
        await performSave(true);
      } else if (directive.compliance_scope === "Recurring" || directive.compliance_scope === "Conditional") {
        // Show dialog for Recurring/Conditional directives
        setShowCompletionDialog(true);
      } else {
        // Other compliance scopes - just save
        await performSave(false);
      }
    } else {
      // Either already completed or not complied - just save
      await performSave(false);
    }
  };

  const handleDialogResponse = async (markAsCompleted: boolean) => {
    setShowCompletionDialog(false);
    await performSave(markAsCompleted);
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
              {isCounterBased && !directiveCounterType && (
                <div className="col-span-2 text-sm text-muted-foreground">
                  No counter type configured for this directive.
                </div>
              )}
            </div>

          </div>

          {/* Notes */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Notes</h3>
            <Textarea
              id="owner_notes"
              value={formData.owner_notes}
              onChange={(e) => setFormData({ ...formData, owner_notes: e.target.value })}
              placeholder="Any additional notes about compliance..."
            />
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

      {/* Dialog for Recurring/Conditional completion confirmation */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Directive as Completed?</AlertDialogTitle>
            <AlertDialogDescription>
              This is a {directive.compliance_scope.toLowerCase()} directive. Would you like to mark this directive as completed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleDialogResponse(true)}>
              Yes, Mark Completed
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDialogResponse(false)}>
              No, Keep Active
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DirectiveComplianceForm;
