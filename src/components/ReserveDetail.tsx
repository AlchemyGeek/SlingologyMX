import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import { ArrowLeft, Calendar, DollarSign, Clock, Gauge, RefreshCw, Pencil, Trash2, TrendingUp } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { format, differenceInMonths, parseISO, addMonths, addYears } from "date-fns";
import { Reserve } from "./ReservesPanel";

interface ReserveDetailProps {
  reserve: Reserve;
  onClose: () => void;
  onEdit?: (reserve: Reserve) => void;
  onDelete?: (reserveId: string) => void;
  userCurrency?: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
}

const counterTypeToFieldMap: Record<string, keyof NonNullable<ReserveDetailProps["currentCounters"]>> = {
  Hobbs: "hobbs",
  Tach: "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

const ReserveDetail = ({ reserve, onClose, onEdit, onDelete, userCurrency = "USD", currentCounters }: ReserveDetailProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(reserve.id);
    }
    setShowDeleteDialog(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Paused":
        return "secondary";
      case "Retired":
        return "outline";
      default:
        return "default";
    }
  };

  const progressData = useMemo(() => {
    if (reserve.basis_type === "Calendar" && reserve.start_date && reserve.interval_value && reserve.interval_unit) {
      const startDate = parseISO(reserve.start_date);
      const endDate = reserve.interval_unit === "Years" 
        ? addYears(startDate, reserve.interval_value)
        : addMonths(startDate, reserve.interval_value);
      
      const totalMonths = differenceInMonths(endDate, startDate);
      const elapsedMonths = differenceInMonths(new Date(), startDate);
      const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
      const progress = Math.min(100, Math.max(0, (elapsedMonths / totalMonths) * 100));
      
      return {
        progress,
        elapsed: `${elapsedMonths} months`,
        remaining: `${remainingMonths} months`,
        total: `${reserve.interval_value} ${reserve.interval_unit?.toLowerCase()}`,
        endDate: format(endDate, "PPP"),
      };
    }

    if (reserve.basis_type === "Hours" && reserve.limit_hours && reserve.counter_type && currentCounters) {
      const field = counterTypeToFieldMap[reserve.counter_type];
      if (field) {
        const currentValue = currentCounters[field] || 0;
        const startValue = reserve.start_counter_value || 0;
        const elapsed = currentValue - startValue;
        const remaining = Math.max(0, reserve.limit_hours - elapsed);
        const progress = Math.min(100, Math.max(0, (elapsed / reserve.limit_hours) * 100));
        
        return {
          progress,
          elapsed: `${elapsed.toFixed(1)} hours`,
          remaining: `${remaining.toFixed(1)} hours`,
          total: `${reserve.limit_hours} hours`,
          currentCounter: currentValue.toFixed(1),
        };
      }
    }

    if (reserve.basis_type === "Cycles" && reserve.limit_cycles) {
      const startCycles = reserve.start_cycle_count || 0;
      return {
        progress: 0,
        elapsed: `${startCycles} cycles`,
        remaining: `${reserve.limit_cycles} cycles`,
        total: `${reserve.limit_cycles} cycles`,
      };
    }

    return null;
  }, [reserve, currentCounters]);

  const accruedAmount = useMemo(() => {
    if (!reserve.expected_cost || !progressData || reserve.accrual_method === "None") {
      return null;
    }
    return (reserve.expected_cost * progressData.progress) / 100;
  }, [reserve, progressData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(reserve)}>
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
              <CardTitle className="text-xl">{reserve.title}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">{reserve.reserve_type}</Badge>
                <Badge variant={getStatusBadgeVariant(reserve.status)}>{reserve.status}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Section */}
          {progressData && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Progress to Event</h3>
              <div className="space-y-3">
                <Progress value={progressData.progress} className="h-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Progress</p>
                    <p className="font-medium">{progressData.progress.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Elapsed</p>
                    <p className="font-medium">{progressData.elapsed}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-medium">{progressData.remaining}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Limit</p>
                    <p className="font-medium">{progressData.total}</p>
                  </div>
                </div>
                {accruedAmount !== null && (
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Accrued to Date:</span>
                      <span className="font-medium">{formatCurrency(accruedAmount, userCurrency)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Trigger Basis */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Trigger Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Basis Type</p>
                  <p className="font-medium">{reserve.basis_type}</p>
                </div>
              </div>
              
              {reserve.basis_type === "Calendar" && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">
                        {reserve.start_date ? format(parseLocalDate(reserve.start_date), "PPP") : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Interval</p>
                      <p className="font-medium">
                        {reserve.interval_value} {reserve.interval_unit}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {reserve.basis_type === "Hours" && (
                <>
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Counter Type</p>
                      <p className="font-medium">{reserve.counter_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Limit</p>
                      <p className="font-medium">{reserve.limit_hours} hours</p>
                    </div>
                  </div>
                  {reserve.start_counter_value !== null && (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Start Counter Value</p>
                        <p className="font-medium">{reserve.start_counter_value}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {reserve.basis_type === "Cycles" && (
                <>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Limit Cycles</p>
                      <p className="font-medium">{reserve.limit_cycles}</p>
                    </div>
                  </div>
                  {reserve.start_cycle_count !== null && (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Start Cycle Count</p>
                        <p className="font-medium">{reserve.start_cycle_count}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Cost Model */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Cost Model</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Expected Cost</p>
                  <p className="font-medium">{formatCurrency(reserve.expected_cost || 0, userCurrency)}</p>
                </div>
              </div>
              {reserve.cost_estimate_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Estimate Date</p>
                    <p className="font-medium">{format(parseLocalDate(reserve.cost_estimate_date), "PPP")}</p>
                  </div>
                </div>
              )}
              {reserve.cost_source_notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Cost Source</p>
                  <p className="font-medium">{reserve.cost_source_notes}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Accrual Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Accrual Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Accrual Method</p>
                <p className="font-medium">{reserve.accrual_method}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Include in True Cost</p>
                <p className="font-medium">{reserve.include_in_true_cost ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Include in Cost-Per-Hour</p>
                <p className="font-medium">{reserve.include_in_cost_per_hour ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {reserve.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{reserve.notes}</p>
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
                  {reserve.created_at ? format(new Date(reserve.created_at), "PPP p") : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {reserve.updated_at ? format(new Date(reserve.updated_at), "PPP p") : "-"}
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
            <AlertDialogTitle>Delete Reserve</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reserve? This action cannot be undone.
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

export default ReserveDetail;
