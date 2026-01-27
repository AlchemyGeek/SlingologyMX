import { useState, useMemo } from "react";
import { format, addWeeks, addMonths } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BackfillTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (count: number) => void;
  missedDates: Date[];
  subscriptionName: string;
}

const BackfillTransactionsDialog = ({
  open,
  onOpenChange,
  onConfirm,
  missedDates,
  subscriptionName,
}: BackfillTransactionsDialogProps) => {
  const maxTransactions = Math.min(missedDates.length, 10);
  const [selectedCount, setSelectedCount] = useState(maxTransactions);

  const selectedDates = useMemo(() => {
    // Take the most recent N dates (from the end of the array)
    return missedDates.slice(-selectedCount);
  }, [missedDates, selectedCount]);

  const handleConfirm = () => {
    onConfirm(selectedCount);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onConfirm(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Past Transactions</DialogTitle>
          <DialogDescription>
            The initial date for "{subscriptionName}" is in the past. We can automatically 
            generate up to {maxTransactions} pending transaction{maxTransactions !== 1 ? 's' : ''} for 
            missed occurrences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Transactions to create:</span>
              <span className="font-medium">{selectedCount}</span>
            </div>
            <Slider
              value={[selectedCount]}
              onValueChange={(value) => setSelectedCount(value[0])}
              min={0}
              max={maxTransactions}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{maxTransactions}</span>
            </div>
          </div>

          {selectedCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Transaction dates:</p>
              <ScrollArea className="h-[150px] rounded-md border p-2">
                <ul className="space-y-1">
                  {selectedDates.map((date, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {format(date, "MMMM d, yyyy")}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            All generated transactions will be created with "Pending" status for your review.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleConfirm} disabled={selectedCount === 0}>
            Create {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Utility function to calculate all missed occurrence dates
export const calculateMissedOccurrences = (
  initialDate: Date,
  recurrence: string,
  finalDate?: Date | null
): Date[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  let current = new Date(initialDate);
  current.setHours(0, 0, 0, 0);

  // If initial date is in the future, no missed occurrences
  if (current > today) {
    return [];
  }

  // Non-recurring commitments only have one occurrence
  if (recurrence === "None") {
    if (current <= today) {
      if (!finalDate || current <= finalDate) {
        dates.push(new Date(current));
      }
    }
    return dates;
  }

  // Calculate all occurrences from initial date up to today
  while (current <= today) {
    // Check if within final date bounds
    if (!finalDate || current <= finalDate) {
      dates.push(new Date(current));
    }

    // Move to next occurrence
    switch (recurrence) {
      case "Weekly":
        current = addWeeks(current, 1);
        break;
      case "Bi-Monthly":
        current = addWeeks(current, 2);
        break;
      case "Monthly":
        current = addMonths(current, 1);
        break;
      case "Quarterly":
        current = addMonths(current, 3);
        break;
      case "Semi-Annual":
        current = addMonths(current, 6);
        break;
      case "Yearly":
        current = addMonths(current, 12);
        break;
      default:
        return dates;
    }
  }

  return dates;
};

export default BackfillTransactionsDialog;
