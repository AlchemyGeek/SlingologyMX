import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ExternalLink, Pencil } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BugReport = Database["public"]["Tables"]["bug_reports"]["Row"];
type BugStatus = Database["public"]["Enums"]["bug_status"];
type BugPriority = Database["public"]["Enums"]["bug_priority"];
type BugCategory = Database["public"]["Enums"]["bug_category"];
type BugSeverity = Database["public"]["Enums"]["bug_severity"];
type DeviceType = Database["public"]["Enums"]["device_type"];

interface BugReportDetailProps {
  bug: BugReport;
  isAdmin: boolean;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const BugReportDetail = ({
  bug,
  isAdmin,
  userId,
  isOpen,
  onClose,
  onUpdate,
}: BugReportDetailProps) => {
  const isOwner = bug.user_id === userId;
  const canEditUserFields = isOwner;
  const canEditAdminFields = isAdmin;

  // User fields state
  const [isEditingUserFields, setIsEditingUserFields] = useState(false);
  const [title, setTitle] = useState(bug.title);
  const [description, setDescription] = useState(bug.description);
  const [stepsToReproduce, setStepsToReproduce] = useState(bug.steps_to_reproduce || "");
  const [expectedResult, setExpectedResult] = useState(bug.expected_result || "");
  const [actualResult, setActualResult] = useState(bug.actual_result);
  const [category, setCategory] = useState<BugCategory>(bug.category);
  const [severity, setSeverity] = useState<BugSeverity>(bug.severity);
  const [browser, setBrowser] = useState(bug.browser || "");
  const [operatingSystem, setOperatingSystem] = useState(bug.operating_system || "");
  const [deviceType, setDeviceType] = useState<DeviceType | "">(bug.device_type || "");
  const [attachmentUrl, setAttachmentUrl] = useState(bug.attachment_url || "");

  // Admin fields state
  const [status, setStatus] = useState<BugStatus>(bug.status);
  const [priority, setPriority] = useState<BugPriority>(bug.priority);
  const [assignedTo, setAssignedTo] = useState(bug.assigned_to || "");
  const [rootCause, setRootCause] = useState(bug.root_cause || "");
  const [resolutionSummary, setResolutionSummary] = useState(bug.resolution_summary || "");
  const [internalNotes, setInternalNotes] = useState(bug.internal_notes || "");

  const [isUpdating, setIsUpdating] = useState(false);

  const categories: BugCategory[] = [
    "Dashboard",
    "Maintenance Logs",
    "AD / Service Bulletins",
    "Profile / Account",
    "Data Export",
    "Notifications",
    "Other",
  ];

  const severities: BugSeverity[] = ["Minor", "Moderate", "Major", "Critical"];

  const deviceTypes: DeviceType[] = ["Desktop", "Laptop", "Tablet", "Phone", "Other"];

  const statuses: BugStatus[] = [
    "New",
    "In Progress",
    "Waiting for User",
    "Resolved",
    "Closed (Won't Fix)",
    "Closed (Duplicate)",
  ];

  const priorities: BugPriority[] = ["Low", "Medium", "High", "Urgent"];

  const handleUpdateUserFields = async () => {
    try {
      setIsUpdating(true);

      const { error } = await supabase
        .from("bug_reports")
        .update({
          title,
          description,
          steps_to_reproduce: stepsToReproduce || null,
          expected_result: expectedResult || null,
          actual_result: actualResult,
          category,
          severity,
          browser: browser || null,
          operating_system: operatingSystem || null,
          device_type: deviceType || null,
          attachment_url: attachmentUrl || null,
        })
        .eq("id", bug.id);

      if (error) throw error;

      toast.success("Bug report updated");
      setIsEditingUserFields(false);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update bug report");
      console.error("Error updating bug:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateAdminFields = async () => {
    try {
      setIsUpdating(true);

      const updates: Partial<BugReport> = {
        status,
        priority,
        assigned_to: assignedTo || null,
        root_cause: rootCause || null,
        resolution_summary: resolutionSummary || null,
        internal_notes: internalNotes || null,
      };

      // Set resolved_at if status is changing to a resolved state
      if (
        ["Resolved", "Closed (Won't Fix)", "Closed (Duplicate)"].includes(status) &&
        !["Resolved", "Closed (Won't Fix)", "Closed (Duplicate)"].includes(bug.status)
      ) {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("bug_reports")
        .update(updates)
        .eq("id", bug.id);

      if (error) throw error;

      toast.success("Bug report updated");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error("Failed to update bug report");
      console.error("Error updating bug:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderUserFieldsView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Bug Details</h3>
        {canEditUserFields && !isEditingUserFields && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingUserFields(true)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      <div>
        <Label className="text-muted-foreground">Description</Label>
        <p className="mt-1 whitespace-pre-wrap">{bug.description}</p>
      </div>

      {bug.steps_to_reproduce && (
        <div>
          <Label className="text-muted-foreground">Steps to Reproduce</Label>
          <p className="mt-1 whitespace-pre-wrap">{bug.steps_to_reproduce}</p>
        </div>
      )}

      {bug.expected_result && (
        <div>
          <Label className="text-muted-foreground">Expected Result</Label>
          <p className="mt-1 whitespace-pre-wrap">{bug.expected_result}</p>
        </div>
      )}

      <div>
        <Label className="text-muted-foreground">Actual Result</Label>
        <p className="mt-1 whitespace-pre-wrap">{bug.actual_result}</p>
      </div>

      {(bug.browser || bug.operating_system || bug.device_type) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {bug.browser && (
            <div>
              <span className="text-muted-foreground">Browser:</span> {bug.browser}
            </div>
          )}
          {bug.operating_system && (
            <div>
              <span className="text-muted-foreground">OS:</span> {bug.operating_system}
            </div>
          )}
          {bug.device_type && (
            <div>
              <span className="text-muted-foreground">Device:</span> {bug.device_type}
            </div>
          )}
        </div>
      )}

      {bug.attachment_url && (
        <div>
          <Label className="text-muted-foreground">Attachment</Label>
          <Button
            variant="link"
            className="p-0 h-auto"
            onClick={() => window.open(bug.attachment_url!, "_blank")}
          >
            View Attachment <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div>Submitted: {format(new Date(bug.created_at), "PPpp")}</div>
        {bug.resolved_at && (
          <div>Resolved: {format(new Date(bug.resolved_at), "PPpp")}</div>
        )}
      </div>
    </div>
  );

  const renderUserFieldsEdit = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Edit Bug Details</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditingUserFields(false)}
        >
          Cancel
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as BugCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Severity *</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as BugSeverity)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {severities.map((sev) => (
                <SelectItem key={sev} value={sev}>
                  {sev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Steps to Reproduce</Label>
        <Textarea
          value={stepsToReproduce}
          onChange={(e) => setStepsToReproduce(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Expected Result</Label>
        <Textarea
          value={expectedResult}
          onChange={(e) => setExpectedResult(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Actual Result *</Label>
        <Textarea
          value={actualResult}
          onChange={(e) => setActualResult(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Browser</Label>
          <Input
            value={browser}
            onChange={(e) => setBrowser(e.target.value)}
            placeholder="e.g., Chrome 120"
          />
        </div>

        <div className="space-y-2">
          <Label>Operating System</Label>
          <Input
            value={operatingSystem}
            onChange={(e) => setOperatingSystem(e.target.value)}
            placeholder="e.g., Windows 11"
          />
        </div>

        <div className="space-y-2">
          <Label>Device Type</Label>
          <Select
            value={deviceType}
            onValueChange={(v) => setDeviceType(v as DeviceType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              {deviceTypes.map((device) => (
                <SelectItem key={device} value={device}>
                  {device}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Attachment URL</Label>
        <Input
          type="url"
          value={attachmentUrl}
          onChange={(e) => setAttachmentUrl(e.target.value)}
          placeholder="Link to screenshot or file"
        />
      </div>

      <Button
        onClick={handleUpdateUserFields}
        disabled={isUpdating || !title || !description || !actualResult}
        className="w-full"
      >
        {isUpdating ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {bug.title}
            <Badge variant="outline">{bug.category}</Badge>
            <Badge
              variant={
                bug.severity === "Critical" || bug.severity === "Major"
                  ? "destructive"
                  : "secondary"
              }
            >
              {bug.severity}
            </Badge>
            <Badge
              variant={
                bug.status === "Resolved"
                  ? "default"
                  : bug.status === "In Progress"
                  ? "secondary"
                  : "outline"
              }
            >
              {bug.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User-submitted information */}
          {isEditingUserFields ? renderUserFieldsEdit() : renderUserFieldsView()}

          {/* Resolution summary (visible to users) */}
          {bug.resolution_summary && !isEditingUserFields && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Resolution</Label>
                <p className="mt-1 whitespace-pre-wrap">{bug.resolution_summary}</p>
              </div>
            </>
          )}

          {/* Admin-only section */}
          {canEditAdminFields && !isEditingUserFields && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold">Admin Controls</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as BugStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(v) => setPriority(v as BugPriority)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Input
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="Name or username"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Root Cause (internal)</Label>
                  <Textarea
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="Technical explanation of what caused the bug"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Resolution Summary (shown to user)</Label>
                  <Textarea
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    placeholder="Plain-language explanation of what was done"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Internal Notes (not shown to user)</Label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Debugging notes, links, decisions, etc."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleUpdateAdminFields}
                  disabled={isUpdating}
                  className="w-full"
                >
                  {isUpdating ? "Updating..." : "Update Bug Report"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BugReportDetail;
