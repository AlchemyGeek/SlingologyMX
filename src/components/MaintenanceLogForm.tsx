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
import { DateInput } from "@/components/ui/date-input";
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
import { format, addMonths } from "date-fns";
import { X } from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import MaintenanceDirectiveCompliance from "./MaintenanceDirectiveCompliance";

interface DirectiveComplianceLink {
  id?: string;
  directive_id: string;
  directive?: any;
  compliance_status: string;
  compliance_date: Date | null;
  counter_type: string;
  counter_value: string;
  owner_notes: string;
  compliance_links: Array<{ description: string; url: string }>;
  isExpanded: boolean;
}

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
    category: "Airplane" as Database["public"]["Enums"]["maintenance_category"],
    subcategory: "Inspection" as Database["public"]["Enums"]["maintenance_subcategory"],
    tags: [] as string[],
    date_performed: new Date(),
    hobbs_at_event: defaultCounters?.hobbs?.toString() || "",
    tach_at_event: defaultCounters?.tach?.toString() || "",
    airframe_total_time: defaultCounters?.airframe_total_time?.toString() || "",
    engine_total_time: defaultCounters?.engine_total_time?.toString() || "",
    prop_total_time: defaultCounters?.prop_total_time?.toString() || "",
    is_recurring_task: false,
    interval_type: "None" as Database["public"]["Enums"]["interval_type"],
    interval_months: "",
    next_due_date: null as Date | null,
    recurrence_counter_type: "" as string,
    recurrence_counter_increment: "",
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
  
  const [directiveComplianceLinks, setDirectiveComplianceLinks] = useState<DirectiveComplianceLink[]>([]);

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
        date_performed: parseLocalDate(editingLog.date_performed),
        hobbs_at_event: editingLog.hobbs_at_event?.toString() || "",
        tach_at_event: editingLog.tach_at_event?.toString() || "",
        airframe_total_time: editingLog.airframe_total_time?.toString() || "",
        engine_total_time: editingLog.engine_total_time?.toString() || "",
        prop_total_time: editingLog.prop_total_time?.toString() || "",
        is_recurring_task: editingLog.is_recurring_task || false,
        interval_type: editingLog.interval_type || "None",
        interval_months: editingLog.interval_months?.toString() || "",
        next_due_date: editingLog.next_due_date ? parseLocalDate(editingLog.next_due_date) : null,
        recurrence_counter_type: editingLog.recurrence_counter_type || "",
        recurrence_counter_increment: editingLog.recurrence_counter_increment?.toString() || "",
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
      
      // Fetch existing directive compliance links
      const fetchComplianceLinks = async () => {
        const { data, error } = await supabase
          .from("maintenance_directive_compliance")
          .select("*, directives(id, directive_code, title, directive_status, compliance_scope, initial_due_type, counter_type, repeat_hours, repeat_months, category)")
          .eq("maintenance_log_id", editingLog.id);
        
        if (!error && data) {
          setDirectiveComplianceLinks(data.map((link: any) => ({
            id: link.id,
            directive_id: link.directive_id,
            directive: link.directives,
            compliance_status: link.compliance_status || "Complied",
            compliance_date: link.compliance_date ? parseLocalDate(link.compliance_date) : new Date(),
            counter_type: link.counter_type || "Hobbs",
            counter_value: link.counter_value?.toString() || "",
            owner_notes: link.owner_notes || "",
            compliance_links: link.compliance_links || [],
            isExpanded: false,
          })));
        }
      };
      fetchComplianceLinks();
    }
  }, [editingLog]);

  // Auto-calculate next_due_date when date_performed or interval_months changes
  useEffect(() => {
    if (formData.is_recurring_task && 
        (formData.interval_type === "Calendar" || formData.interval_type === "Mixed") && 
        formData.interval_months && 
        formData.date_performed) {
      const months = parseInt(formData.interval_months);
      if (months > 0) {
        const calculatedDate = addMonths(formData.date_performed, months);
        setFormData(prev => ({ ...prev, next_due_date: calculatedDate }));
      }
    }
  }, [formData.date_performed, formData.interval_months, formData.is_recurring_task, formData.interval_type]);

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

  // Handle notification completion and create new recurring notification if applicable (mirrors DirectiveComplianceForm logic)
  const handleDirectiveNotificationCompletionAndRecurrence = async (directive: any, link: DirectiveComplianceLink) => {
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
        const componentMap: Record<string, Database["public"]["Enums"]["component_type"]> = {
          "Airframe": "Airframe", "Engine": "Propeller", "Propeller": "Propeller", 
          "Avionics": "Avionics", "System": "Other", "Appliance": "Other", "Other": "Other"
        };
        const component = componentMap[directive.category] || "Airframe";
        const notificationDescription = `Directive Compliance: ${directive.directive_code} - ${directive.title}`;

        // Determine if date-based or counter-based recurrence
        const isCounterBasedRecurrence = directive.repeat_hours && directive.repeat_hours > 0;
        const isDateBasedRecurrence = directive.repeat_months && directive.repeat_months > 0;
        const isCounterBased = directive.initial_due_type === "By Total Time (Hours)";

        if (isCounterBasedRecurrence && isCounterBased) {
          // Counter-based recurring notification
          const currentCounterValue = link.counter_value 
            ? parseFloat(link.counter_value) 
            : 0;
          const nextDueValue = currentCounterValue + (directive.repeat_hours || 0);

          await supabase.from("notifications").insert({
            user_id: userId,
            description: notificationDescription,
            type: "Directives",
            initial_date: format(today, "yyyy-MM-dd"),
            recurrence: "None",
            notification_basis: "Counter",
            counter_type: link.counter_type as any,
            initial_counter_value: nextDueValue,
            notes: `Recurring directive compliance due at ${nextDueValue} ${link.counter_type}`,
            directive_id: directive.id,
            user_modified: false,
          });
        } else if (isDateBasedRecurrence) {
          // Date-based recurring notification
          const complianceDate = link.compliance_date || today;
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
      console.error("Error handling directive notification completion/recurrence:", error);
      // Don't fail the whole operation if notification handling fails
    }
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
      is_recurring_task: formData.is_recurring_task,
      interval_type: formData.interval_type,
      interval_months: formData.interval_months ? parseInt(formData.interval_months) : null,
      next_due_date: formData.next_due_date ? format(formData.next_due_date, "yyyy-MM-dd") : null,
      recurrence_counter_type: formData.recurrence_counter_type || null,
      recurrence_counter_increment: formData.recurrence_counter_increment ? parseInt(formData.recurrence_counter_increment) : null,
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
      let logId = editingLog?.id;
      
      if (editingLog) {
        const { error } = await supabase
          .from("maintenance_logs")
          .update(logData)
          .eq("id", editingLog.id);
        if (error) throw error;
        
        // Handle notifications for interval type changes
        const notificationDescription = `Recurring: ${formData.entry_title}`;
        const categoryToComponent: Record<string, Database["public"]["Enums"]["component_type"]> = {
          "Airplane": "Airframe", "Airframe": "Airframe", "Propeller": "Propeller",
          "Avionics": "Avionics", "Engine": "Other", "Electrical": "Other",
          "Interior": "Other", "Exterior": "Other", "Accessories": "Other", "Other": "Other"
        };
        const component = categoryToComponent[formData.category] || "Other";
        
        // Calculate next_due_date if not set (in case useEffect hasn't run yet)
        let calculatedNextDueDate = formData.next_due_date;
        if (!calculatedNextDueDate && formData.is_recurring_task && 
            (formData.interval_type === "Calendar" || formData.interval_type === "Mixed") &&
            formData.interval_months && formData.date_performed) {
          const months = parseInt(formData.interval_months);
          if (months > 0) {
            calculatedNextDueDate = addMonths(formData.date_performed, months);
          }
        }
        
        const needsDateNotification = formData.is_recurring_task && 
          (formData.interval_type === "Calendar" || formData.interval_type === "Mixed") && 
          calculatedNextDueDate;
        const needsCounterNotification = formData.is_recurring_task && 
          (formData.interval_type === "Hours" || formData.interval_type === "Mixed") && 
          formData.recurrence_counter_type && formData.recurrence_counter_increment;
        
        // Check for existing linked notifications
        const { data: existingNotifs } = await supabase.from("notifications")
          .select("id, notification_basis, user_modified")
          .eq("maintenance_log_id", editingLog.id);
        
        const existingDateNotif = existingNotifs?.find(n => n.notification_basis === "Date");
        const existingCounterNotif = existingNotifs?.find(n => n.notification_basis === "Counter");
        
        // Handle date-based notification
        if (needsDateNotification) {
          if (existingDateNotif && !existingDateNotif.user_modified) {
            // Update existing
            await supabase.from("notifications")
              .update({
                description: notificationDescription,
                initial_date: format(calculatedNextDueDate!, "yyyy-MM-dd"),
                notes: `Auto-created from maintenance record: ${formData.entry_title}`,
              })
              .eq("id", existingDateNotif.id);
          } else if (!existingDateNotif) {
            // Create new
            await supabase.from("notifications").insert([{
              user_id: userId,
              description: notificationDescription,
              type: "Maintenance" as Database["public"]["Enums"]["notification_type"],
              initial_date: format(calculatedNextDueDate!, "yyyy-MM-dd"),
              recurrence: "None" as Database["public"]["Enums"]["recurrence_type"],
              notification_basis: "Date" as Database["public"]["Enums"]["notification_basis"],
              notes: `Auto-created from maintenance record: ${formData.entry_title}`,
              alert_days: 7,
              maintenance_log_id: editingLog.id,
            }]);
          }
        } else if (existingDateNotif && !existingDateNotif.user_modified) {
          // Delete date notification if no longer needed
          await supabase.from("notifications").delete().eq("id", existingDateNotif.id);
        }
        
        // Handle counter-based notification
        if (needsCounterNotification) {
          const counterTypeMap: Record<string, Database["public"]["Enums"]["counter_type"]> = {
            "Hobbs": "Hobbs", "Tach": "Tach", "Airframe TT": "Airframe TT",
            "Engine TT": "Engine TT", "Prop TT": "Prop TT"
          };
          const currentCounterValues: Record<string, number> = {
            "Hobbs": parseFloat(formData.hobbs_at_event) || 0, "Tach": parseFloat(formData.tach_at_event) || 0,
            "Airframe TT": parseFloat(formData.airframe_total_time) || 0,
            "Engine TT": parseFloat(formData.engine_total_time) || 0, "Prop TT": parseFloat(formData.prop_total_time) || 0
          };
          const currentValue = currentCounterValues[formData.recurrence_counter_type] || 0;
          const increment = parseInt(formData.recurrence_counter_increment) || 0;
          const nextDueValue = currentValue + increment;
          
          if (existingCounterNotif && !existingCounterNotif.user_modified) {
            // Update existing
            await supabase.from("notifications")
              .update({
                description: notificationDescription,
                counter_type: counterTypeMap[formData.recurrence_counter_type],
                initial_counter_value: nextDueValue,
                counter_step: increment,
                notes: `Auto-created from maintenance record: ${formData.entry_title}`,
              })
              .eq("id", existingCounterNotif.id);
          } else if (!existingCounterNotif) {
            // Create new
            await supabase.from("notifications").insert([{
              user_id: userId,
              description: notificationDescription,
              type: "Maintenance" as Database["public"]["Enums"]["notification_type"],
              initial_date: format(new Date(), "yyyy-MM-dd"),
              recurrence: "None" as Database["public"]["Enums"]["recurrence_type"],
              notification_basis: "Counter" as Database["public"]["Enums"]["notification_basis"],
              counter_type: counterTypeMap[formData.recurrence_counter_type],
              initial_counter_value: nextDueValue,
              counter_step: increment,
              notes: `Auto-created from maintenance record: ${formData.entry_title}`,
              alert_hours: 10,
              maintenance_log_id: editingLog.id,
            }]);
          }
        } else if (existingCounterNotif && !existingCounterNotif.user_modified) {
          // Delete counter notification if no longer needed
          await supabase.from("notifications").delete().eq("id", existingCounterNotif.id);
        }
        
        // If recurring is turned off entirely, delete all non-user-modified notifications
        if (!formData.is_recurring_task || formData.interval_type === "None") {
          await supabase.from("notifications")
            .delete()
            .eq("maintenance_log_id", editingLog.id)
            .eq("user_modified", false);
        }
      } else {
        const { data: newLog, error } = await supabase
          .from("maintenance_logs")
          .insert([logData])
          .select()
          .single();
        if (error) throw error;
        logId = newLog?.id;
      }

      // Create notifications for recurring tasks (only for new logs)
      if (!editingLog && logId && formData.is_recurring_task && formData.interval_type !== "None") {
        const notificationDescription = `Recurring: ${formData.entry_title}`;
        
        // Create date-based notification for Calendar or Mixed type
        if (formData.interval_type === "Calendar" || formData.interval_type === "Mixed") {
          // Calculate next_due_date directly if not already set (in case useEffect hasn't run yet)
          let nextDueDate = formData.next_due_date;
          if (!nextDueDate && formData.interval_months && formData.date_performed) {
            const months = parseInt(formData.interval_months);
            if (months > 0) {
              nextDueDate = addMonths(formData.date_performed, months);
            }
          }
          
          if (nextDueDate) {
            const { error: dateNotifError } = await supabase
              .from("notifications")
              .insert([{
                user_id: userId,
                description: notificationDescription,
                type: "Maintenance" as Database["public"]["Enums"]["notification_type"],
                initial_date: format(nextDueDate, "yyyy-MM-dd"),
                recurrence: "None" as Database["public"]["Enums"]["recurrence_type"],
                notification_basis: "Date" as Database["public"]["Enums"]["notification_basis"],
                notes: `Auto-created from maintenance record: ${formData.entry_title}`,
                alert_days: 7,
                maintenance_log_id: logId,
              }]);
            
            if (dateNotifError) {
              console.error("Error creating date-based notification:", dateNotifError);
            } else {
              toast.success("Date-based notification created");
            }
          }
        }
        
        // Create counter-based notification for Hours or Mixed type
        if ((formData.interval_type === "Hours" || formData.interval_type === "Mixed") && 
            formData.recurrence_counter_type && formData.recurrence_counter_increment) {
          
          const counterTypeMap: Record<string, Database["public"]["Enums"]["counter_type"]> = {
            "Hobbs": "Hobbs", "Tach": "Tach", "Airframe TT": "Airframe TT",
            "Engine TT": "Engine TT", "Prop TT": "Prop TT"
          };
          
          const currentCounterValues: Record<string, number> = {
            "Hobbs": parseFloat(formData.hobbs_at_event) || 0, "Tach": parseFloat(formData.tach_at_event) || 0,
            "Airframe TT": parseFloat(formData.airframe_total_time) || 0,
            "Engine TT": parseFloat(formData.engine_total_time) || 0, "Prop TT": parseFloat(formData.prop_total_time) || 0
          };
          
          const currentValue = currentCounterValues[formData.recurrence_counter_type] || 0;
          const increment = parseInt(formData.recurrence_counter_increment) || 0;
          const nextDueValue = currentValue + increment;
          
          const { error: counterNotifError } = await supabase
            .from("notifications")
            .insert([{
              user_id: userId,
              description: notificationDescription,
              type: "Maintenance" as Database["public"]["Enums"]["notification_type"],
              initial_date: format(new Date(), "yyyy-MM-dd"),
              recurrence: "None" as Database["public"]["Enums"]["recurrence_type"],
              notification_basis: "Counter" as Database["public"]["Enums"]["notification_basis"],
              counter_type: counterTypeMap[formData.recurrence_counter_type],
              initial_counter_value: nextDueValue,
              counter_step: increment,
              notes: `Auto-created from maintenance record: ${formData.entry_title}`,
              alert_hours: 10,
              maintenance_log_id: logId,
            }]);
          
          if (counterNotifError) {
            console.error("Error creating counter-based notification:", counterNotifError);
          } else {
            toast.success("Counter-based notification created");
          }
        }
      }
      
      // Save directive compliance links
      if (logId && directiveComplianceLinks.length > 0) {
        // For editing, delete existing links that are no longer present
        if (editingLog) {
          // First, get the links that will be deleted to clean up their directive status
          const currentLinkIds = directiveComplianceLinks.filter(l => l.id).map(l => l.id);
          
          // Fetch existing compliance links to identify deleted ones
          const { data: existingComplianceLinks } = await supabase
            .from("maintenance_directive_compliance")
            .select("id, directive_id, compliance_status")
            .eq("maintenance_log_id", logId);
          
          // Find links that are being deleted
          const deletedLinks = existingComplianceLinks?.filter(
            existing => !currentLinkIds.includes(existing.id)
          ) || [];
          
          // For each deleted compliance link, recalculate the directive status from remaining events
          for (const deletedLink of deletedLinks) {
            // Check if there are any other compliance records for this directive (excluding the ones being deleted)
            const { data: otherCompliance } = await supabase
              .from("maintenance_directive_compliance")
              .select("*")
              .eq("directive_id", deletedLink.directive_id)
              .eq("user_id", userId)
              .neq("id", deletedLink.id)
              .order("compliance_date", { ascending: false });
            
            // If no other compliance records exist and this was a "Complied" record, 
            // reset the directive status
            if (!otherCompliance || otherCompliance.length === 0) {
              if (deletedLink.compliance_status === "Complied") {
                await supabase
                  .from("aircraft_directive_status")
                  .update({
                    compliance_status: "Not Complied",
                    first_compliance_date: null,
                    first_compliance_tach: null,
                    last_compliance_date: null,
                    last_compliance_tach: null,
                  })
                  .eq("directive_id", deletedLink.directive_id)
                  .eq("user_id", userId);
              }
            } else {
              // Recalculate from remaining compliance events
              const compliedEvents = otherCompliance.filter(c => c.compliance_status === "Complied");
              if (compliedEvents.length > 0) {
                // Sort by date to get first and last
                const sortedByDate = [...compliedEvents].sort((a, b) => 
                  new Date(a.compliance_date).getTime() - new Date(b.compliance_date).getTime()
                );
                const firstEvent = sortedByDate[0];
                const lastEvent = sortedByDate[sortedByDate.length - 1];
                
                await supabase
                  .from("aircraft_directive_status")
                  .update({
                    first_compliance_date: firstEvent.compliance_date,
                    first_compliance_tach: firstEvent.counter_value,
                    last_compliance_date: lastEvent.compliance_date,
                    last_compliance_tach: lastEvent.counter_value,
                  })
                  .eq("directive_id", deletedLink.directive_id)
                  .eq("user_id", userId);
              } else {
                // No complied events remain
                await supabase
                  .from("aircraft_directive_status")
                  .update({
                    compliance_status: "Not Complied",
                    first_compliance_date: null,
                    first_compliance_tach: null,
                    last_compliance_date: null,
                    last_compliance_tach: null,
                  })
                  .eq("directive_id", deletedLink.directive_id)
                  .eq("user_id", userId);
              }
            }
          }
          
          // Now delete the compliance links that were removed
          if (deletedLinks.length > 0) {
            const deletedIds = deletedLinks.map(l => l.id);
            console.log("Deleting compliance links:", deletedIds);
            const { error: deleteError } = await supabase
              .from("maintenance_directive_compliance")
              .delete()
              .in("id", deletedIds);
            
            if (deleteError) {
              console.error("Error deleting compliance links:", deleteError);
            }
          }
        }
        
        for (const link of directiveComplianceLinks) {
          if (!link.directive_id) continue;
          
          const complianceData = {
            maintenance_log_id: logId,
            directive_id: link.directive_id,
            user_id: userId,
            compliance_status: link.compliance_status,
            compliance_date: link.compliance_date ? format(link.compliance_date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
            counter_type: link.counter_type || null,
            counter_value: link.counter_value ? parseFloat(link.counter_value) : null,
            owner_notes: link.owner_notes || null,
            compliance_links: link.compliance_links.length > 0 ? link.compliance_links : null,
          };
          
          if (link.id) {
            // Update existing
            await supabase
              .from("maintenance_directive_compliance")
              .update(complianceData)
              .eq("id", link.id);
          } else {
            // Insert new
            await supabase
              .from("maintenance_directive_compliance")
              .insert([complianceData]);
          }
          
          // Also create/update the aircraft_directive_status for this directive
          if (link.compliance_status === "Complied") {
            const directive = link.directive;
            
            // Check if status already exists
            const { data: existingStatus } = await supabase
              .from("aircraft_directive_status")
              .select("id")
              .eq("directive_id", link.directive_id)
              .eq("user_id", userId)
              .maybeSingle();
            
            const statusData = {
              user_id: userId,
              directive_id: link.directive_id,
              compliance_status: "Complied Once" as const,
              first_compliance_date: link.compliance_date ? format(link.compliance_date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
              first_compliance_tach: link.counter_value ? parseFloat(link.counter_value) : null,
              owner_notes: link.owner_notes || null,
              compliance_links: link.compliance_links.length > 0 ? link.compliance_links : null,
            };
            
            if (existingStatus) {
              await supabase
                .from("aircraft_directive_status")
                .update(statusData)
                .eq("id", existingStatus.id);
            } else {
              await supabase
                .from("aircraft_directive_status")
                .insert([statusData]);
            }
            
            // Log compliance history
            if (directive) {
              await supabase.from("directive_history").insert({
                user_id: userId,
                directive_id: link.directive_id,
                directive_code: directive.directive_code,
                directive_title: directive.title,
                action_type: "Compliance",
                compliance_status: "Complied Once",
                first_compliance_date: link.compliance_date ? format(link.compliance_date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
              });
              
              // Handle notification completion and recurrence (same as standalone compliance form)
              await handleDirectiveNotificationCompletionAndRecurrence(directive, link);
            }
          }
        }
      } else if (editingLog && directiveComplianceLinks.length === 0) {
        // All links removed during edit - first clean up directive statuses
        const { data: existingComplianceLinks } = await supabase
          .from("maintenance_directive_compliance")
          .select("id, directive_id, compliance_status")
          .eq("maintenance_log_id", editingLog.id);
        
        for (const deletedLink of existingComplianceLinks || []) {
          // Check if there are any other compliance records for this directive (from other maintenance logs)
          const { data: otherCompliance } = await supabase
            .from("maintenance_directive_compliance")
            .select("*")
            .eq("directive_id", deletedLink.directive_id)
            .eq("user_id", userId)
            .neq("maintenance_log_id", editingLog.id)
            .order("compliance_date", { ascending: false });
          
          if (!otherCompliance || otherCompliance.length === 0) {
            if (deletedLink.compliance_status === "Complied") {
              await supabase
                .from("aircraft_directive_status")
                .update({
                  compliance_status: "Not Complied",
                  first_compliance_date: null,
                  first_compliance_tach: null,
                  last_compliance_date: null,
                  last_compliance_tach: null,
                })
                .eq("directive_id", deletedLink.directive_id)
                .eq("user_id", userId);
            }
          } else {
            // Recalculate from remaining compliance events
            const compliedEvents = otherCompliance.filter(c => c.compliance_status === "Complied");
            if (compliedEvents.length > 0) {
              const sortedByDate = [...compliedEvents].sort((a, b) => 
                new Date(a.compliance_date).getTime() - new Date(b.compliance_date).getTime()
              );
              const firstEvent = sortedByDate[0];
              const lastEvent = sortedByDate[sortedByDate.length - 1];
              
              await supabase
                .from("aircraft_directive_status")
                .update({
                  first_compliance_date: firstEvent.compliance_date,
                  first_compliance_tach: firstEvent.counter_value,
                  last_compliance_date: lastEvent.compliance_date,
                  last_compliance_tach: lastEvent.counter_value,
                })
                .eq("directive_id", deletedLink.directive_id)
                .eq("user_id", userId);
            } else {
              await supabase
                .from("aircraft_directive_status")
                .update({
                  compliance_status: "Not Complied",
                  first_compliance_date: null,
                  first_compliance_tach: null,
                  last_compliance_date: null,
                  last_compliance_tach: null,
                })
                .eq("directive_id", deletedLink.directive_id)
                .eq("user_id", userId);
            }
          }
        }
        
        // Now delete all compliance links
        await supabase
          .from("maintenance_directive_compliance")
          .delete()
          .eq("maintenance_log_id", editingLog.id);
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
                <SelectItem value="Airplane">Airplane</SelectItem>
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
            <DateInput
              value={formData.date_performed}
              onChange={(date) => date && setFormData({ ...formData, date_performed: date })}
              required
            />
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

      {/* Directive Compliance */}
      <div className="space-y-4 border-b pb-4">
        <MaintenanceDirectiveCompliance
          userId={userId}
          maintenanceLogId={editingLog?.id}
          complianceLinks={directiveComplianceLinks}
          onComplianceLinksChange={setDirectiveComplianceLinks}
          defaultCounters={defaultCounters || { hobbs: 0, tach: 0, airframe_total_time: 0, engine_total_time: 0, prop_total_time: 0 }}
          datePerformed={formData.date_performed}
          performedByName={formData.performed_by_name}
          performedByType={formData.performed_by_type}
        />
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
                <Label htmlFor="interval_type">Recurrence Type</Label>
                <Select value={formData.interval_type} onValueChange={(value) => setFormData({ ...formData, interval_type: value as Database["public"]["Enums"]["interval_type"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Calendar">Interval (Date-Based)</SelectItem>
                    <SelectItem value="Hours">Counter (Usage-Based)</SelectItem>
                    <SelectItem value="Mixed">Mixed (Whichever First)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Interval (Date-Based) Options */}
              {(formData.interval_type === "Calendar" || formData.interval_type === "Mixed") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="interval_months">Interval Period</Label>
                    <Select 
                      value={formData.interval_months} 
                      onValueChange={(value) => setFormData({ ...formData, interval_months: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Monthly</SelectItem>
                        <SelectItem value="6">Semi-Annual</SelectItem>
                        <SelectItem value="12">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Next Due Date</Label>
                    <DateInput
                      value={formData.next_due_date}
                      onChange={(date) => setFormData({ ...formData, next_due_date: date })}
                    />
                    <p className="text-xs text-muted-foreground">Auto-calculated from Date Performed + Interval. You can modify if needed.</p>
                  </div>
                </>
              )}
              
              {/* Counter (Usage-Based) Options */}
              {(formData.interval_type === "Hours" || formData.interval_type === "Mixed") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_counter_type">Counter Type</Label>
                    <Select 
                      value={formData.recurrence_counter_type} 
                      onValueChange={(value) => setFormData({ ...formData, recurrence_counter_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select counter" />
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
                    <Label htmlFor="recurrence_counter_increment">Counter Increment</Label>
                    <Input
                      id="recurrence_counter_increment"
                      type="number"
                      step="1"
                      min="1"
                      max="2000"
                      placeholder="e.g., 100 hours"
                      value={formData.recurrence_counter_increment}
                      onChange={(e) => setFormData({ ...formData, recurrence_counter_increment: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Hours until next recurrence</p>
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
