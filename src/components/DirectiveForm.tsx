import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Card, CardContent } from "@/components/ui/card";
import type { Directive } from "./DirectivesPanel";
import type { Database } from "@/integrations/supabase/types";

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
const DIRECTIVE_STATUSES = ["Active", "Superseded", "Cancelled", "Proposed"];
const CATEGORIES = ["Airframe", "Engine", "Propeller", "Avionics", "System", "Appliance", "Other"];
const COMPLIANCE_SCOPES = ["One-Time", "Recurring", "Conditional", "Informational Only"];
const INITIAL_DUE_TYPES = [
  "Before Next Flight",
  "By Date",
  "By Total Time (Hours)",
  "By Calendar (Months)",
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

const DirectiveForm = ({ userId, editingDirective, onSuccess, onCancel }: DirectiveFormProps) => {
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
    aircraft_make_model_filter: "",
    engine_model_filter: "",
    prop_model_filter: "",
    applicable_serial_range: "",
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
        issue_date: editingDirective.issue_date ? new Date(editingDirective.issue_date) : null,
        effective_date: editingDirective.effective_date ? new Date(editingDirective.effective_date) : null,
        revision: editingDirective.revision || "",
        aircraft_make_model_filter: editingDirective.aircraft_make_model_filter || "",
        engine_model_filter: editingDirective.engine_model_filter || "",
        prop_model_filter: editingDirective.prop_model_filter || "",
        applicable_serial_range: editingDirective.applicable_serial_range || "",
        applicability_notes: editingDirective.applicability_notes || "",
        compliance_scope: editingDirective.compliance_scope || "One-Time",
        action_types: editingDirective.action_types || [],
        initial_due_type: editingDirective.initial_due_type || "",
        initial_due_hours: editingDirective.initial_due_hours?.toString() || "",
        initial_due_months: editingDirective.initial_due_months?.toString() || "",
        initial_due_date: editingDirective.initial_due_date ? new Date(editingDirective.initial_due_date) : null,
        repeat_hours: editingDirective.repeat_hours?.toString() || "",
        repeat_months: editingDirective.repeat_months?.toString() || "",
        terminating_action_exists: editingDirective.terminating_action_exists || false,
        terminating_action_summary: editingDirective.terminating_action_summary || "",
        requires_log_entry: editingDirective.requires_log_entry ?? true,
        source_links: editingDirective.source_links || [],
      });
    }
  }, [editingDirective]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.directive_code.trim()) {
      toast.error("Directive code is required");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
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
      aircraft_make_model_filter: formData.aircraft_make_model_filter || null,
      engine_model_filter: formData.engine_model_filter || null,
      prop_model_filter: formData.prop_model_filter || null,
      applicable_serial_range: formData.applicable_serial_range || null,
      applicability_notes: formData.applicability_notes || null,
      compliance_scope: formData.compliance_scope as Database["public"]["Enums"]["compliance_scope"],
      action_types: formData.action_types.length > 0 ? formData.action_types : null,
      initial_due_type: (formData.initial_due_type || null) as Database["public"]["Enums"]["initial_due_type"] | null,
      initial_due_hours: formData.initial_due_hours ? parseFloat(formData.initial_due_hours) : null,
      initial_due_months: formData.initial_due_months ? parseInt(formData.initial_due_months) : null,
      initial_due_date: formData.initial_due_date ? format(formData.initial_due_date, "yyyy-MM-dd") : null,
      repeat_hours: formData.repeat_hours ? parseFloat(formData.repeat_hours) : null,
      repeat_months: formData.repeat_months ? parseInt(formData.repeat_months) : null,
      terminating_action_exists: formData.terminating_action_exists,
      terminating_action_summary: formData.terminating_action_summary || null,
      requires_log_entry: formData.requires_log_entry,
      source_links: formData.source_links.length > 0 ? formData.source_links : null,
    };

    try {
      if (editingDirective) {
        const { error } = await supabase
          .from("directives")
          .update(directiveData)
          .eq("id", editingDirective.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("directives")
          .insert([directiveData]);
        if (error) throw error;
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.issue_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.issue_date ? format(formData.issue_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.issue_date || undefined} onSelect={(date) => setFormData({ ...formData, issue_date: date || null })} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.effective_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.effective_date ? format(formData.effective_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.effective_date || undefined} onSelect={(date) => setFormData({ ...formData, effective_date: date || null })} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Applicability */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-medium">Applicability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aircraft_make_model_filter">Aircraft Models</Label>
                <Input
                  id="aircraft_make_model_filter"
                  value={formData.aircraft_make_model_filter}
                  onChange={(e) => setFormData({ ...formData, aircraft_make_model_filter: e.target.value })}
                  maxLength={200}
                  placeholder="e.g., Sling TSi, Sling 4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="engine_model_filter">Engine Models</Label>
                <Input
                  id="engine_model_filter"
                  value={formData.engine_model_filter}
                  onChange={(e) => setFormData({ ...formData, engine_model_filter: e.target.value })}
                  maxLength={200}
                  placeholder="e.g., Rotax 915iS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop_model_filter">Propeller Models</Label>
                <Input
                  id="prop_model_filter"
                  value={formData.prop_model_filter}
                  onChange={(e) => setFormData({ ...formData, prop_model_filter: e.target.value })}
                  maxLength={200}
                  placeholder="e.g., Airmaster AP332"
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
                <Label>Compliance Scope *</Label>
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
                <Label>Initial Due Type</Label>
                <Select value={formData.initial_due_type} onValueChange={(value) => setFormData({ ...formData, initial_due_type: value })}>
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
              <div className="space-y-2">
                <Label htmlFor="initial_due_hours">Initial Due Hours</Label>
                <Input
                  id="initial_due_hours"
                  type="number"
                  step="0.1"
                  value={formData.initial_due_hours}
                  onChange={(e) => setFormData({ ...formData, initial_due_hours: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_due_months">Initial Due Months</Label>
                <Input
                  id="initial_due_months"
                  type="number"
                  value={formData.initial_due_months}
                  onChange={(e) => setFormData({ ...formData, initial_due_months: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Initial Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.initial_due_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.initial_due_date ? format(formData.initial_due_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.initial_due_date || undefined} onSelect={(date) => setFormData({ ...formData, initial_due_date: date || null })} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {formData.compliance_scope === "Recurring" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="repeat_hours">Repeat Every (Hours)</Label>
                  <Input
                    id="repeat_hours"
                    type="number"
                    step="0.1"
                    value={formData.repeat_hours}
                    onChange={(e) => setFormData({ ...formData, repeat_hours: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repeat_months">Repeat Every (Months)</Label>
                  <Input
                    id="repeat_months"
                    type="number"
                    value={formData.repeat_months}
                    onChange={(e) => setFormData({ ...formData, repeat_months: e.target.value })}
                  />
                </div>
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
