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
import { ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BugReport = Database["public"]["Tables"]["bug_reports"]["Row"];
type BugStatus = Database["public"]["Enums"]["bug_status"];
type BugPriority = Database["public"]["Enums"]["bug_priority"];

interface BugReportDetailProps {
  bug: BugReport;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const BugReportDetail = ({
  bug,
  isAdmin,
  isOpen,
  onClose,
  onUpdate,
}: BugReportDetailProps) => {
  const [status, setStatus] = useState<BugStatus>(bug.status);
  const [priority, setPriority] = useState<BugPriority>(bug.priority);
  const [assignedTo, setAssignedTo] = useState(bug.assigned_to || "");
  const [rootCause, setRootCause] = useState(bug.root_cause || "");
  const [resolutionSummary, setResolutionSummary] = useState(
    bug.resolution_summary || ""
  );
  const [internalNotes, setInternalNotes] = useState(bug.internal_notes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const statuses: BugStatus[] = [
    "New",
    "In Progress",
    "Waiting for User",
    "Resolved",
    "Closed (Won't Fix)",
    "Closed (Duplicate)",
  ];

  const priorities: BugPriority[] = ["Low", "Medium", "High", "Urgent"];

  const handleUpdate = async () => {
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
        ["Resolved", "Closed (Won't Fix)", "Closed (Duplicate)"].includes(
          status
        ) &&
        !["Resolved", "Closed (Won't Fix)", "Closed (Duplicate)"].includes(
          bug.status
        )
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
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User-submitted information */}
          <div className="space-y-4">
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
                    <span className="text-muted-foreground">Browser:</span>{" "}
                    {bug.browser}
                  </div>
                )}
                {bug.operating_system && (
                  <div>
                    <span className="text-muted-foreground">OS:</span>{" "}
                    {bug.operating_system}
                  </div>
                )}
                {bug.device_type && (
                  <div>
                    <span className="text-muted-foreground">Device:</span>{" "}
                    {bug.device_type}
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
              <div>
                Submitted: {format(new Date(bug.created_at), "PPpp")}
              </div>
              {bug.resolved_at && (
                <div>
                  Resolved: {format(new Date(bug.resolved_at), "PPpp")}
                </div>
              )}
            </div>
          </div>

          {/* Resolution summary (visible to users) */}
          {bug.resolution_summary && (
            <>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Resolution</Label>
                <p className="mt-1 whitespace-pre-wrap">
                  {bug.resolution_summary}
                </p>
              </div>
            </>
          )}

          {/* Admin-only section */}
          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold">Admin Controls</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v as BugStatus)}
                    >
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
                  onClick={handleUpdate}
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
