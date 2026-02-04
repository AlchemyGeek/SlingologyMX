import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Directive } from "@/components/DirectivesPanel";

interface ShareSBDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directive: Directive;
  userId: string;
  onShared: () => void;
}

const ShareSBDialog = ({
  open,
  onOpenChange,
  directive,
  userId,
  onShared,
}: ShareSBDialogProps) => {
  const [description, setDescription] = useState("");
  const [sharing, setSharing] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setDescription("");
    }
  }, [open]);

  const handleShare = async () => {
    setSharing(true);
    try {
      // INSERT new community SB
      const { error } = await supabase.from("community_service_bulletins").insert({
        maintainer_id: userId,
        directive_type: directive.directive_type as any,
        severity: directive.severity as any,
        directive_status: "Active" as any,
        category: directive.category as any,
        compliance_scope: directive.compliance_scope as any,
        directive_code: directive.directive_code,
        title: directive.title,
        issuing_authority: directive.issuing_authority,
        revision: directive.revision,
        issue_date: directive.issue_date,
        effective_date: directive.effective_date,
        initial_due_type: directive.initial_due_type as any,
        initial_due_hours: directive.initial_due_hours,
        initial_due_months: directive.initial_due_months,
        repeat_hours: directive.repeat_hours,
        repeat_months: directive.repeat_months,
        counter_type: directive.counter_type,
        applicable_serial_range: directive.applicable_serial_range,
        applicability_notes: directive.applicability_notes,
        applicability_category: directive.applicability_category,
        equipment_name: directive.equipment_name,
        equipment_model: directive.equipment_model,
        software_version: directive.software_version,
        database_version: directive.database_version,
        action_types: directive.action_types,
        terminating_action_exists: directive.terminating_action_exists,
        terminating_action_summary: directive.terminating_action_summary,
        requires_log_entry: directive.requires_log_entry,
        source_links: directive.source_links,
        description: description || null,
        version_number: 1,
      });

      if (error) throw error;
      toast.success("Service Bulletin shared with the community!");

      onOpenChange(false);
      onShared();
    } catch (err: any) {
      console.error("Error sharing SB:", err);
      toast.error("Failed to share Service Bulletin");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share with Community
          </DialogTitle>
          <DialogDescription>
            Share your interpretation of this Service Bulletin with other aircraft owners.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="bg-accent rounded-lg p-4 space-y-2">
            <p className="font-mono text-sm text-muted-foreground">{directive.directive_code}</p>
            <p className="font-medium">{directive.title}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{directive.directive_type}</span>
              <span>•</span>
              <span>{directive.category}</span>
              <span>•</span>
              <span>{directive.severity}</span>
            </div>
          </div>

          {/* What gets excluded */}
          <div className="bg-accent rounded-lg p-3 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="text-muted-foreground">
              <p className="font-medium text-foreground mb-1">What gets excluded:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Aircraft-specific applicability status</li>
                <li>Your compliance history</li>
                <li>Equipment serial numbers specific to your aircraft</li>
                <li>Any linked notifications or maintenance logs</li>
              </ul>
            </div>
          </div>

          {/* Maintainer notes */}
          <div className="space-y-2">
            <Label htmlFor="description">Interpretation Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add helpful notes about your interpretation, any clarifications, or tips for other owners..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              These notes will help others understand your interpretation.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-accent rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">By sharing:</strong>{" "}
              You become the maintainer of this community SB. You can edit it directly in the Community tab. 
              After sharing, updates must be made on the community record, not the original.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={sharing}>
            {sharing ? "Sharing..." : "Share with Community"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareSBDialog;
