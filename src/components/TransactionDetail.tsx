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
import { ArrowLeft, Calendar, DollarSign, Tag, Pencil, Trash2, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";

interface TransactionDetailProps {
  transaction: any;
  onClose: () => void;
  onEdit?: (transaction: any) => void;
  onDelete?: (transactionId: string) => void;
}

const TransactionDetail = ({ transaction, onClose, onEdit, onDelete }: TransactionDetailProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(transaction.id);
    }
    setShowDeleteDialog(false);
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Posted": return "default";
      case "Pending": return "secondary";
      case "Voided": return "destructive";
      case "Skipped": return "outline";
      default: return "secondary";
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === "Credit" ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-foreground" />
    );
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
            <Button variant="outline" size="sm" onClick={() => onEdit(transaction)}>
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
              <CardTitle className="text-xl">{transaction.title}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={getStatusBadgeVariant(transaction.status)}>{transaction.status}</Badge>
                <Badge variant="outline">{transaction.category}</Badge>
                <Badge variant="secondary">{transaction.intent}</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                {getDirectionIcon(transaction.direction)}
                <span className={`text-2xl font-bold ${transaction.direction === "Credit" ? "text-green-600" : ""}`}>
                  {transaction.direction === "Credit" ? "+" : "-"}
                  {transaction.currency} {Number(transaction.amount).toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{transaction.direction}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(parseLocalDate(transaction.transaction_date), "PPP")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium">{transaction.source}</p>
                </div>
              </div>
              {transaction.tags && transaction.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tags</p>
                    <div className="flex gap-1 flex-wrap">
                      {transaction.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Settings */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4">Analysis Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${transaction.include_in_cash_flow ? "bg-green-500" : "bg-muted"}`} />
                <span className="text-sm">Include in Cash Flow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${transaction.include_in_ownership_total ? "bg-green-500" : "bg-muted"}`} />
                <span className="text-sm">Include in Ownership Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${transaction.include_in_cost_per_hour ? "bg-green-500" : "bg-muted"}`} />
                <span className="text-sm">Include in Cost-Per-Hour</span>
              </div>
            </div>
          </div>

          {/* Cost Allocation */}
          {transaction.allocate_over_time && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Cost Allocation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Allocation Method</p>
                      <p className="font-medium">{transaction.allocation_method}</p>
                    </div>
                  </div>
                  {transaction.allocation_period_value && transaction.allocation_period_unit && (
                    <div>
                      <p className="text-sm text-muted-foreground">Period</p>
                      <p className="font-medium">
                        {transaction.allocation_period_value} {transaction.allocation_period_unit}
                      </p>
                    </div>
                  )}
                  {transaction.allocation_start_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">
                        {format(parseLocalDate(transaction.allocation_start_date), "PPP")}
                      </p>
                    </div>
                  )}
                  {transaction.allocation_end_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">
                        {format(parseLocalDate(transaction.allocation_end_date), "PPP")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Counter Snapshots */}
          {(transaction.tach_hours || transaction.hobbs_hours) && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Counter Snapshots</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transaction.tach_hours && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tach Hours</p>
                      <p className="font-medium">{transaction.tach_hours}</p>
                    </div>
                  )}
                  {transaction.hobbs_hours && (
                    <div>
                      <p className="text-sm text-muted-foreground">Hobbs Hours</p>
                      <p className="font-medium">{transaction.hobbs_hours}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {transaction.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{transaction.notes}</p>
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
                  {transaction.created_at
                    ? format(new Date(transaction.created_at), "PPP p")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {transaction.updated_at
                    ? format(new Date(transaction.updated_at), "PPP p")
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
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
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

export default TransactionDetail;
