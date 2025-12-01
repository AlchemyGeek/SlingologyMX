import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type FeatureStatus = Database["public"]["Enums"]["feature_status"];

interface FeatureRequestEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  currentStatus: FeatureStatus;
  currentAdminComment: string | null;
  onSuccess: () => void;
}

const FeatureRequestEditDialog = ({
  isOpen,
  onClose,
  featureId,
  currentStatus,
  currentAdminComment,
  onSuccess,
}: FeatureRequestEditDialogProps) => {
  const [status, setStatus] = useState<FeatureStatus>(currentStatus);
  const [adminComment, setAdminComment] = useState(currentAdminComment || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (adminComment.length > 50) {
      toast.error("Admin comment must be 50 characters or less");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("feature_requests")
        .update({
          status,
          admin_comment: adminComment || null,
        })
        .eq("id", featureId);

      if (error) throw error;

      toast.success("Feature request updated");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to update feature request");
      console.error("Error updating feature:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Feature Request Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as FeatureStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-comment">
              Admin Comment (optional, max 50 characters)
            </Label>
            <Input
              id="admin-comment"
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              maxLength={50}
              placeholder="Optional comment about this feature"
            />
            <p className="text-xs text-muted-foreground">
              {adminComment.length}/50 characters
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureRequestEditDialog;
