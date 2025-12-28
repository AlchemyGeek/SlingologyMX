import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Calendar, DollarSign, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";

interface SubscriptionDetailProps {
  subscription: any;
  onClose: () => void;
  onEdit?: (subscription: any) => void;
  onDelete?: (subscriptionId: string) => void;
}

const SubscriptionDetail = ({ subscription, onClose, onEdit, onDelete }: SubscriptionDetailProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(subscription.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(subscription)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{subscription.subscription_name}</CardTitle>
              <Badge variant="secondary">{subscription.type}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cost</p>
                  <p className="font-medium">${subscription.cost || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Recurrence</p>
                  <p className="font-medium">{subscription.recurrence}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Initial Date</p>
                  <p className="font-medium">
                    {format(parseLocalDate(subscription.initial_date), "PPP")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {subscription.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{subscription.notes}</p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {subscription.created_at
                    ? format(new Date(subscription.created_at), "PPP p")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {subscription.updated_at
                    ? format(new Date(subscription.updated_at), "PPP p")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionDetail;
