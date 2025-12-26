import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";

interface CounterHistoryEntry {
  id: string;
  change_date: string;
  hobbs: number;
  tach: number;
  airframe_total_time: number;
  engine_total_time: number;
  prop_total_time: number;
  source: string;
}

interface CounterHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  aircraftId: string;
  onRevert: () => void;
}

const CounterHistoryDialog = ({ open, onOpenChange, userId, aircraftId, onRevert }: CounterHistoryDialogProps) => {
  const [history, setHistory] = useState<CounterHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertEntry, setRevertEntry] = useState<CounterHistoryEntry | null>(null);
  const [reverting, setReverting] = useState(false);

  const fetchHistory = async () => {
    if (!userId || !aircraftId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("aircraft_counter_history")
      .select("*")
      .eq("user_id", userId)
      .eq("aircraft_id", aircraftId)
      .order("change_date", { ascending: false });

    if (error) {
      console.error("Error fetching counter history:", error);
      toast.error("Failed to load counter history");
    } else {
      setHistory(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && aircraftId) {
      fetchHistory();
    }
  }, [open, userId, aircraftId]);

  const handleRevert = async () => {
    if (!revertEntry) return;
    
    setReverting(true);
    try {
      // Update the current counters to the reverted values
      const { error: updateError } = await supabase
        .from("aircraft_counters")
        .update({
          hobbs: revertEntry.hobbs,
          tach: revertEntry.tach,
          airframe_total_time: revertEntry.airframe_total_time,
          engine_total_time: revertEntry.engine_total_time,
          prop_total_time: revertEntry.prop_total_time,
        })
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId);

      if (updateError) throw updateError;

      // Delete all history entries after the reverted entry
      const { error: deleteError } = await supabase
        .from("aircraft_counter_history")
        .delete()
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .gt("change_date", revertEntry.change_date);

      if (deleteError) throw deleteError;

      toast.success("Counters reverted successfully");
      setRevertEntry(null);
      onRevert();
      fetchHistory();
    } catch (error) {
      console.error("Error reverting counters:", error);
      toast.error("Failed to revert counters");
    }
    setReverting(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Counter Change History</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No history entries yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Hobbs</TableHead>
                  <TableHead className="text-right">Tach</TableHead>
                  <TableHead className="text-right">Airframe TT</TableHead>
                  <TableHead className="text-right">Engine TT</TableHead>
                  <TableHead className="text-right">Prop TT</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.change_date), "PPp")}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        entry.source === "Dashboard" 
                          ? "bg-blue-500/10 text-blue-600" 
                          : "bg-green-500/10 text-green-600"
                      }`}>
                        {entry.source}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{Number(entry.hobbs).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{Number(entry.tach).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{Number(entry.airframe_total_time).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{Number(entry.engine_total_time).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{Number(entry.prop_total_time).toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevertEntry(entry)}
                        title="Revert to this entry"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revertEntry} onOpenChange={(open) => !open && setRevertEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Counters?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the counters to the values from {revertEntry && format(new Date(revertEntry.change_date), "PPp")}.
              All history entries after this point will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={reverting}>
              {reverting ? "Reverting..." : "Revert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CounterHistoryDialog;
