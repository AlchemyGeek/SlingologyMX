import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Share2 } from "lucide-react";

interface ConfirmShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSharing: boolean;
}

const ConfirmShareDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isSharing,
}: ConfirmShareDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share with Community
          </DialogTitle>
          <DialogDescription>
            Your directive will be shared with other aircraft owners after removing account-specific information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* Disclaimer */}
          <div className="bg-accent rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">By sharing:</strong> You become the maintainer of
              this community SB. You can update it anytime. Users who adopt it will receive
              notifications about your updates.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSharing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSharing}>
            {isSharing ? "Sharing..." : "Confirm & Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmShareDialog;
