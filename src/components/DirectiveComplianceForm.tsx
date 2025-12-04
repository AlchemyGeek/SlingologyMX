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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Directive } from "./DirectivesPanel";
import type { Database } from "@/integrations/supabase/types";

interface DirectiveComplianceFormProps {
  directive: Directive;
  userId: string;
  existingStatus: any | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const APPLICABILITY_STATUSES = ["Applies", "Does Not Apply", "Unsure"];
const COMPLIANCE_STATUSES = [
  "Not Reviewed",
  "Not Complied",
  "Complied Once",
  "Recurring (Current)",
  "Overdue",
  "Not Applicable",
];
const PERFORMED_BY_ROLES = [
  "Owner/Builder",
  "Owner/Pilot",
  "A&P",
  "IA",
  "Rotax IRMT",
  "Maintenance Shop",
  "Other",
];

const DirectiveComplianceForm = ({
  directive,
  userId,
  existingStatus,
  onSuccess,
  onCancel,
}: DirectiveComplianceFormProps) => {
  const [formData, setFormData] = useState({
    applicability_status: "Unsure" as string,
    applicability_reason: "",
    compliance_status: "Not Reviewed" as string,
    first_compliance_date: null as Date | null,
    first_compliance_tach: "",
    last_compliance_date: null as Date | null,
    last_compliance_tach: "",
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

  const COUNTER_TYPES = ["Hobbs", "Tach", "Airframe TT", "Engine TT", "Prop TT"];

  const [linkDescInput, setLinkDescInput] = useState("");
  const [linkUrlInput, setLinkUrlInput] = useState("");

  useEffect(() => {
    if (existingStatus) {
      setFormData({
        applicability_status: existingStatus.applicability_status || "Unsure",
        applicability_reason: existingStatus.applicability_reason || "",
        compliance_status: existingStatus.compliance_status || "Not Reviewed",
        first_compliance_date: existingStatus.first_compliance_date
          ? new Date(existingStatus.first_compliance_date)
          : null,
        first_compliance_tach: existingStatus.first_compliance_tach?.toString() || "",
        last_compliance_date: existingStatus.last_compliance_date
          ? new Date(existingStatus.last_compliance_date)
          : null,
        last_compliance_tach: existingStatus.last_compliance_tach?.toString() || "",
        next_due_basis: existingStatus.next_due_basis || "",
        next_due_counter_type: existingStatus.next_due_counter_type || "",
        next_due_date: existingStatus.next_due_date ? new Date(existingStatus.next_due_date) : null,
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
  }, [existingStatus]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const statusData = {
      user_id: userId,
      directive_id: directive.id,
      applicability_status: formData.applicability_status as Database["public"]["Enums"]["applicability_status"],
      applicability_reason: formData.applicability_reason || null,
      compliance_status: formData.compliance_status as Database["public"]["Enums"]["db_compliance_status"],
      first_compliance_date: formData.first_compliance_date
        ? format(formData.first_compliance_date, "yyyy-MM-dd")
        : null,
      first_compliance_tach: formData.first_compliance_tach
        ? parseFloat(formData.first_compliance_tach)
        : null,
      last_compliance_date: formData.last_compliance_date
        ? format(formData.last_compliance_date, "yyyy-MM-dd")
        : null,
      last_compliance_tach: formData.last_compliance_tach
        ? parseFloat(formData.last_compliance_tach)
        : null,
      next_due_basis: formData.next_due_basis || null,
      next_due_counter_type: formData.next_due_counter_type || null,
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
      // Check if first or last compliance date changed
      const firstDateChanged = existingStatus && 
        (existingStatus.first_compliance_date !== statusData.first_compliance_date);
      const lastDateChanged = existingStatus && 
        (existingStatus.last_compliance_date !== statusData.last_compliance_date);
      const isNewCompliance = !existingStatus && 
        (statusData.first_compliance_date || statusData.last_compliance_date);
      
      // Only log compliance if status is "Complied Once" or "Recurring (Current)"
      const isComplianceLoggableStatus = 
        statusData.compliance_status === "Complied Once" || 
        statusData.compliance_status === "Recurring (Current)";
      
      if (existingStatus) {
        const { error } = await supabase
          .from("aircraft_directive_status")
          .update(statusData)
          .eq("id", existingStatus.id);
        if (error) throw error;
        
        // Log Compliance action if dates changed AND status is compliant
        if ((firstDateChanged || lastDateChanged) && isComplianceLoggableStatus) {
          await supabase.from("directive_history").insert({
            user_id: userId,
            directive_id: directive.id,
            directive_code: directive.directive_code,
            directive_title: directive.title,
            action_type: "Compliance",
            compliance_status: statusData.compliance_status,
            first_compliance_date: statusData.first_compliance_date,
            last_compliance_date: statusData.last_compliance_date,
          });
        }
        toast.success("Compliance status updated");
      } else {
        const { error } = await supabase.from("aircraft_directive_status").insert([statusData]);
        if (error) throw error;
        
        // Log Compliance action if dates are set on new record AND status is compliant
        if (isNewCompliance && isComplianceLoggableStatus) {
          await supabase.from("directive_history").insert({
            user_id: userId,
            directive_id: directive.id,
            directive_code: directive.directive_code,
            directive_title: directive.title,
            action_type: "Compliance",
            compliance_status: statusData.compliance_status,
            first_compliance_date: statusData.first_compliance_date,
            last_compliance_date: statusData.last_compliance_date,
          });
        }
        toast.success("Compliance status created");
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
          {existingStatus ? "Update" : "Set"} Compliance Status for {directive.directive_code}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Applicability */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Applicability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Applies to My Aircraft? *</Label>
                <Select
                  value={formData.applicability_status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, applicability_status: value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, applicability_reason: e.target.value })
                  }
                  placeholder="e.g., Serial number not in affected range"
                />
              </div>
            </div>
          </div>

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
                <Label>First Compliance Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.first_compliance_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.first_compliance_date
                        ? format(formData.first_compliance_date, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.first_compliance_date || undefined}
                      onSelect={(date) =>
                        setFormData({ ...formData, first_compliance_date: date || null })
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_compliance_tach">First Compliance Tach/Hobbs</Label>
                <Input
                  id="first_compliance_tach"
                  type="number"
                  step="0.1"
                  value={formData.first_compliance_tach}
                  onChange={(e) =>
                    setFormData({ ...formData, first_compliance_tach: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Compliance Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.last_compliance_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.last_compliance_date
                        ? format(formData.last_compliance_date, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.last_compliance_date || undefined}
                      onSelect={(date) =>
                        setFormData({ ...formData, last_compliance_date: date || null })
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_compliance_tach">Last Compliance Tach/Hobbs</Label>
                <Input
                  id="last_compliance_tach"
                  type="number"
                  step="0.1"
                  value={formData.last_compliance_tach}
                  onChange={(e) =>
                    setFormData({ ...formData, last_compliance_tach: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Next Due Section - Only for Recurring (Current) */}
            {formData.compliance_status === "Recurring (Current)" && (
              <div className="space-y-4 mt-4 p-4 border rounded-md bg-muted/30">
                <h4 className="font-medium">Next Due Compliance</h4>
                <div className="space-y-2">
                  <Label>Next Due Basis *</Label>
                  <Select
                    value={formData.next_due_basis}
                    onValueChange={(value) =>
                      setFormData({ 
                        ...formData, 
                        next_due_basis: value,
                        // Clear the other field when switching
                        next_due_date: value === "Counter" ? null : formData.next_due_date,
                        next_due_tach: value === "Date" ? "" : formData.next_due_tach,
                        next_due_counter_type: value === "Date" ? "" : formData.next_due_counter_type,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select basis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Date">Date Based</SelectItem>
                      <SelectItem value="Counter">Counter Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.next_due_basis === "Date" && (
                  <div className="space-y-2">
                    <Label>Next Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.next_due_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.next_due_date
                            ? format(formData.next_due_date, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.next_due_date || undefined}
                          onSelect={(date) =>
                            setFormData({ ...formData, next_due_date: date || null })
                          }
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {formData.next_due_basis === "Counter" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Counter Type *</Label>
                      <Select
                        value={formData.next_due_counter_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, next_due_counter_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select counter" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTER_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="next_due_tach">Next Due Value</Label>
                      <Input
                        id="next_due_tach"
                        type="number"
                        step="0.1"
                        value={formData.next_due_tach}
                        onChange={(e) => setFormData({ ...formData, next_due_tach: e.target.value })}
                        placeholder="Enter counter value"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
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
