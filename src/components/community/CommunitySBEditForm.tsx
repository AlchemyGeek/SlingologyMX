import { useState } from "react";
import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CommunitySBWithMaintainer } from "@/types/communitySB";

interface CommunitySBEditFormProps {
  sb: CommunitySBWithMaintainer;
  onClose: () => void;
  onSaved: () => void;
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
const SEVERITIES = ["Emergency", "Mandatory", "Obligatory", "Recommended", "Informational"];
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
const ACTION_TYPE_OPTIONS = [
  "Inspection",
  "Replacement",
  "Modification",
  "Software Update",
  "Operational Limitation",
  "Documentation Update",
];
const COUNTER_TYPES = [
  { value: "Hobbs", label: "Hobbs" },
  { value: "Tach", label: "Tach" },
  { value: "Airframe TT", label: "Airframe TT" },
  { value: "Engine TT", label: "Engine TT" },
  { value: "Prop TT", label: "Prop TT" },
];

const CommunitySBEditForm = ({ sb, onClose, onSaved }: CommunitySBEditFormProps) => {
  const [saving, setSaving] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");
  
  const [formData, setFormData] = useState({
    directive_code: sb.directive_code,
    title: sb.title,
    directive_type: sb.directive_type,
    severity: sb.severity,
    category: sb.category,
    issuing_authority: sb.issuing_authority || "",
    revision: sb.revision || "",
    issue_date: sb.issue_date ? new Date(sb.issue_date + "T00:00:00") : null as Date | null,
    effective_date: sb.effective_date ? new Date(sb.effective_date + "T00:00:00") : null as Date | null,
    compliance_scope: sb.compliance_scope,
    initial_due_type: sb.initial_due_type || "",
    initial_due_hours: sb.initial_due_hours?.toString() || "",
    initial_due_months: sb.initial_due_months?.toString() || "",
    repeat_hours: sb.repeat_hours?.toString() || "",
    repeat_months: sb.repeat_months?.toString() || "",
    counter_type: sb.counter_type || "Hobbs",
    applicable_serial_range: sb.applicable_serial_range || "",
    applicability_notes: sb.applicability_notes || "",
    equipment_model: sb.equipment_model || "",
    software_version: sb.software_version || "",
    database_version: sb.database_version || "",
    action_types: sb.action_types || [] as string[],
    terminating_action_exists: sb.terminating_action_exists,
    terminating_action_summary: sb.terminating_action_summary || "",
    requires_log_entry: sb.requires_log_entry,
    source_links: sb.source_links || [] as Array<{ description: string; url: string }>,
    description: sb.description || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.directive_code.trim() || !formData.title.trim()) {
      toast.error("Code and title are required");
      return;
    }

    setSaving(true);
    try {
      const newVersion = sb.version_number + 1;
      
      const { error } = await supabase
        .from("community_service_bulletins")
        .update({
          directive_code: formData.directive_code.trim(),
          title: formData.title.trim(),
          directive_type: formData.directive_type as any,
          severity: formData.severity as any,
          category: formData.category as any,
          compliance_scope: formData.compliance_scope as any,
          issuing_authority: formData.issuing_authority || null,
          revision: formData.revision || null,
          issue_date: formData.issue_date?.toISOString().split("T")[0] || null,
          effective_date: formData.effective_date?.toISOString().split("T")[0] || null,
          initial_due_type: (formData.initial_due_type || null) as any,
          initial_due_hours: formData.initial_due_hours ? parseFloat(formData.initial_due_hours) : null,
          initial_due_months: formData.initial_due_months ? parseInt(formData.initial_due_months) : null,
          repeat_hours: formData.repeat_hours ? parseFloat(formData.repeat_hours) : null,
          repeat_months: formData.repeat_months ? parseInt(formData.repeat_months) : null,
          counter_type: formData.counter_type || null,
          applicable_serial_range: formData.applicable_serial_range || null,
          applicability_notes: formData.applicability_notes || null,
          equipment_model: formData.equipment_model || null,
          software_version: formData.software_version || null,
          database_version: formData.database_version || null,
          action_types: formData.action_types.length > 0 ? formData.action_types : null,
          terminating_action_exists: formData.terminating_action_exists,
          terminating_action_summary: formData.terminating_action_summary || null,
          requires_log_entry: formData.requires_log_entry,
          source_links: formData.source_links,
          description: formData.description || null,
          version_notes: versionNotes || null,
          version_number: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sb.id);

      if (error) throw error;

      // Create update notifications for users who have used this SB
      const { data: usages } = await supabase
        .from("community_sb_usage")
        .select("user_id, local_directive_id")
        .eq("community_sb_id", sb.id);

      if (usages && usages.length > 0) {
        const notifications = usages.map((usage) => ({
          user_id: usage.user_id,
          community_sb_id: sb.id,
          local_directive_id: usage.local_directive_id,
          old_version_number: sb.version_number,
          new_version_number: newVersion,
          version_notes: versionNotes || null,
        }));

        await supabase.from("community_sb_update_notifications").insert(notifications);
      }

      toast.success(`Updated to version ${newVersion}`);
      onSaved();
    } catch (err: any) {
      console.error("Error updating community SB:", err);
      toast.error("Failed to update community SB");
    } finally {
      setSaving(false);
    }
  };

  const addSourceLink = () => {
    setFormData((prev) => ({
      ...prev,
      source_links: [...prev.source_links, { description: "", url: "" }],
    }));
  };

  const updateSourceLink = (index: number, field: "description" | "url", value: string) => {
    setFormData((prev) => ({
      ...prev,
      source_links: prev.source_links.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  const removeSourceLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      source_links: prev.source_links.filter((_, i) => i !== index),
    }));
  };

  const toggleActionType = (actionType: string) => {
    setFormData((prev) => ({
      ...prev,
      action_types: prev.action_types.includes(actionType)
        ? prev.action_types.filter((t) => t !== actionType)
        : [...prev.action_types, actionType],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Version Notes */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Update to Version {sb.version_number + 1}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="versionNotes">What changed? (optional)</Label>
            <Textarea
              id="versionNotes"
              placeholder="Describe the changes you made..."
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Users who have imported this SB will see this note in their update notification.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Core Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Core Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="directive_code">Code *</Label>
              <Input
                id="directive_code"
                value={formData.directive_code}
                onChange={(e) => setFormData((prev) => ({ ...prev, directive_code: e.target.value }))}
                maxLength={40}
                required
              />
              <p className={cn("text-xs text-right", formData.directive_code.length >= 40 ? "text-destructive" : "text-muted-foreground")}>{formData.directive_code.length}/40</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={500}
                required
              />
              <p className={cn("text-xs text-right", formData.title.length >= 500 ? "text-destructive" : "text-muted-foreground")}>{formData.title.length}/500</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.directive_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, directive_type: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIRECTIVE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, severity: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((sev) => (
                    <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={formData.compliance_scope}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, compliance_scope: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_SCOPES.map((scope) => (
                    <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issuing_authority">Issuing Authority</Label>
              <Input
                id="issuing_authority"
                value={formData.issuing_authority}
                onChange={(e) => setFormData((prev) => ({ ...prev, issuing_authority: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revision">Revision</Label>
              <Input
                id="revision"
                value={formData.revision}
                onChange={(e) => setFormData((prev) => ({ ...prev, revision: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <DateInput
                value={formData.issue_date}
                onChange={(date) => setFormData((prev) => ({ ...prev, issue_date: date }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <DateInput
                value={formData.effective_date}
                onChange={(date) => setFormData((prev) => ({ ...prev, effective_date: date }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Compliance Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Compliance Scope</Label>
              <Select
                value={formData.compliance_scope}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, compliance_scope: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_SCOPES.map((scope) => (
                    <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Due Type</Label>
              <Select
                value={formData.initial_due_type || "none"}
                onValueChange={(value) => setFormData((prev) => ({ 
                  ...prev, 
                  initial_due_type: value === "none" ? "" : value,
                  // Reset related fields when type changes
                  initial_due_hours: "",
                  initial_due_months: "",
                }))}
              >
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {INITIAL_DUE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional fields based on Initial Due Type */}
          {formData.initial_due_type === "By Calendar (Months)" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial_due_months">Months from Effective Date *</Label>
                <Input
                  id="initial_due_months"
                  type="number"
                  min="1"
                  value={formData.initial_due_months}
                  onChange={(e) => setFormData((prev) => ({ ...prev, initial_due_months: e.target.value }))}
                  placeholder="Enter number of months"
                />
              </div>
            </div>
          )}

          {formData.initial_due_type === "By Total Time (Hours)" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Counter Type *</Label>
                <Select 
                  value={formData.counter_type} 
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, counter_type: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTER_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_due_hours">Due at Hours *</Label>
                <Input
                  id="initial_due_hours"
                  type="number"
                  step="0.1"
                  value={formData.initial_due_hours}
                  onChange={(e) => setFormData((prev) => ({ ...prev, initial_due_hours: e.target.value }))}
                  placeholder="Enter counter value"
                />
                <p className="text-xs text-muted-foreground">
                  Users who import this will set their own due value based on their aircraft counters.
                </p>
              </div>
            </div>
          )}

          {/* Repeat fields - shown only for Recurring scope based on Initial Due Type */}
          {formData.compliance_scope === "Recurring" && 
           formData.initial_due_type && 
           formData.initial_due_type !== "Other" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date-based repeat: show months field */}
              {["Before Next Flight", "At Next Inspection", "By Date", "By Calendar (Months)"].includes(formData.initial_due_type) && (
                <div className="space-y-2">
                  <Label htmlFor="repeat_months">Repeat Every (Months)</Label>
                  <Input
                    id="repeat_months"
                    type="number"
                    min="1"
                    value={formData.repeat_months}
                    onChange={(e) => setFormData((prev) => ({ ...prev, repeat_months: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, repeat_hours: e.target.value }))}
                    placeholder="Enter hours interval"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Action Types</Label>
            <div className="flex flex-wrap gap-2">
              {ACTION_TYPE_OPTIONS.map((action) => (
                <Button
                  key={action}
                  type="button"
                  variant={formData.action_types.includes(action) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleActionType(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="terminating_action_exists"
                checked={formData.terminating_action_exists}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, terminating_action_exists: checked }))}
              />
              <Label htmlFor="terminating_action_exists">Terminating action exists</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="requires_log_entry"
                checked={formData.requires_log_entry}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, requires_log_entry: checked }))}
              />
              <Label htmlFor="requires_log_entry">Requires log entry</Label>
            </div>
          </div>

          {formData.terminating_action_exists && (
            <div className="space-y-2">
              <Label htmlFor="terminating_action_summary">Terminating Action Summary</Label>
              <Textarea
                id="terminating_action_summary"
                value={formData.terminating_action_summary}
                onChange={(e) => setFormData((prev) => ({ ...prev, terminating_action_summary: e.target.value }))}
                maxLength={1000}
                placeholder="Describe the terminating action..."
                className="min-h-[80px]"
              />
              <p className={cn("text-xs text-right", (formData.terminating_action_summary?.length || 0) >= 1000 ? "text-destructive" : "text-muted-foreground")}>{formData.terminating_action_summary?.length || 0}/1000</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applicability */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Applicability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="equipment_model">Equipment Model</Label>
            <Input
              id="equipment_model"
              value={formData.equipment_model}
              onChange={(e) => setFormData((prev) => ({ ...prev, equipment_model: e.target.value }))}
              maxLength={200}
              placeholder="e.g., Rotax 916iS, GTN 750Xi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicable_serial_range">Serial Range</Label>
            <Input
              id="applicable_serial_range"
              value={formData.applicable_serial_range}
              onChange={(e) => setFormData((prev) => ({ ...prev, applicable_serial_range: e.target.value }))}
              maxLength={255}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="software_version">Software Version</Label>
              <Input
                id="software_version"
                value={formData.software_version}
                onChange={(e) => setFormData((prev) => ({ ...prev, software_version: e.target.value }))}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="database_version">Database Version</Label>
              <Input
                id="database_version"
                value={formData.database_version}
                onChange={(e) => setFormData((prev) => ({ ...prev, database_version: e.target.value }))}
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicability_notes">Applicability Notes</Label>
            <Textarea
              id="applicability_notes"
              value={formData.applicability_notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, applicability_notes: e.target.value }))}
              maxLength={1000}
            />
            <p className={cn("text-xs text-right", (formData.applicability_notes?.length || 0) >= 1000 ? "text-destructive" : "text-muted-foreground")}>{formData.applicability_notes?.length || 0}/1000</p>
          </div>
        </CardContent>
      </Card>

      {/* Source Links */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Source Links</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addSourceLink}>
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Link</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.source_links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No source links added</p>
          ) : (
            formData.source_links.map((link, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Description"
                    value={link.description}
                    onChange={(e) => updateSourceLink(index, "description", e.target.value)}
                  />
                  <Input
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => updateSourceLink(index, "url", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSourceLink(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Maintainer Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Maintainer's Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any notes about your interpretation..."
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>
    </form>
  );
};

export default CommunitySBEditForm;
