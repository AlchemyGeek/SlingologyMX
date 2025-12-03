import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, History } from "lucide-react";
import { toast } from "sonner";
import { AircraftCounters } from "@/hooks/useAircraftCounters";
import CounterHistoryDialog from "./CounterHistoryDialog";

interface AircraftCountersDisplayProps {
  counters: AircraftCounters;
  loading: boolean;
  userId: string;
  onUpdateCounter: (field: keyof Omit<AircraftCounters, "id">, value: number) => Promise<void>;
  onUpdateAllCounters: (updates: Partial<Omit<AircraftCounters, "id">>) => Promise<void>;
  onRefetch: () => void;
}

const counterConfig = [
  { key: "hobbs" as const, label: "Hobbs", color: "bg-blue-500/10 border-blue-500/20" },
  { key: "tach" as const, label: "Tach", color: "bg-green-500/10 border-green-500/20" },
  { key: "airframe_total_time" as const, label: "Airframe TT", color: "bg-purple-500/10 border-purple-500/20" },
  { key: "engine_total_time" as const, label: "Engine TT", color: "bg-orange-500/10 border-orange-500/20" },
  { key: "prop_total_time" as const, label: "Prop TT", color: "bg-teal-500/10 border-teal-500/20" },
];

const syncableCounters: (keyof Omit<AircraftCounters, "id">)[] = [
  "tach", "airframe_total_time", "engine_total_time", "prop_total_time"
];

const AircraftCountersDisplay = ({ counters, loading, userId, onUpdateCounter, onUpdateAllCounters, onRefetch }: AircraftCountersDisplayProps) => {
  const [editingCounter, setEditingCounter] = useState<keyof Omit<AircraftCounters, "id"> | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addValue, setAddValue] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);

  const isSyncableCounter = editingCounter && syncableCounters.includes(editingCounter);

  const handleOpenEdit = (key: keyof Omit<AircraftCounters, "id">) => {
    setEditingCounter(key);
    setEditValue(counters[key].toString());
    setAddValue("");
    setSyncEnabled(true);
    setIsDialogOpen(true);
  };

  const handleSetValue = async () => {
    if (!editingCounter) return;
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    
    try {
      if (syncEnabled && isSyncableCounter) {
        // Calculate difference and apply to all syncable counters
        const diff = newValue - counters[editingCounter];
        const updates: Partial<Omit<AircraftCounters, "id">> = {};
        syncableCounters.forEach(key => {
          updates[key] = counters[key] + diff;
        });
        await onUpdateAllCounters(updates);
        toast.success(`Counter updated (synced ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} to all)`);
      } else {
        await onUpdateCounter(editingCounter, newValue);
        toast.success("Counter updated");
      }
      setIsDialogOpen(false);
    } catch {
      toast.error("Failed to update counter");
    }
  };

  const handleAddValue = async () => {
    if (!editingCounter) return;
    const toAdd = parseFloat(addValue);
    if (isNaN(toAdd) || toAdd <= 0) {
      toast.error("Please enter a valid positive number to add");
      return;
    }

    try {
      if (syncEnabled && isSyncableCounter) {
        // Update all syncable counters
        const updates: Partial<Omit<AircraftCounters, "id">> = {};
        syncableCounters.forEach(key => {
          updates[key] = counters[key] + toAdd;
        });
        await onUpdateAllCounters(updates);
        toast.success(`Added ${toAdd} to all synced counters`);
      } else {
        const newValue = counters[editingCounter] + toAdd;
        await onUpdateCounter(editingCounter, newValue);
        toast.success(`Added ${toAdd} to ${counterConfig.find(c => c.key === editingCounter)?.label}`);
      }
      setIsDialogOpen(false);
    } catch {
      toast.error("Failed to update counter");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {counterConfig.map((config) => (
          <Card key={config.key} className={`${config.color} border`}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{config.label}</p>
              <p className="text-2xl font-bold mt-1">...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Aircraft Counters</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {counterConfig.map((config) => (
            <Card
              key={config.key}
              className={`${config.color} border cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => handleOpenEdit(config.key)}
            >
              <CardContent className="p-4 text-center relative">
                <Pencil className="h-3 w-3 absolute top-2 right-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{config.label}</p>
                <p className="text-2xl font-bold mt-1">{counters[config.key].toFixed(1)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {counterConfig.find(c => c.key === editingCounter)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Value</Label>
              <p className="text-2xl font-bold">
                {editingCounter ? counters[editingCounter].toFixed(1) : "0.0"}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="setvalue">Set to specific value</Label>
              <div className="flex gap-2">
                <Input
                  id="setvalue"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter value"
                />
                <Button onClick={handleSetValue}>Set</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addvalue">Add hours</Label>
              <div className="flex gap-2">
                <Input
                  id="addvalue"
                  type="number"
                  step="0.1"
                  min="0"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder="Hours to add"
                />
                <Button onClick={handleAddValue} variant="secondary">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {isSyncableCounter && (
                <div className="flex items-center justify-between pt-2 border-t mt-3">
                  <Label htmlFor="sync-toggle" className="text-sm text-muted-foreground">
                    Sync with other counters (Tach, Airframe, Engine, Prop)
                  </Label>
                  <Switch
                    id="sync-toggle"
                    checked={syncEnabled}
                    onCheckedChange={setSyncEnabled}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CounterHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        userId={userId}
        onRevert={onRefetch}
      />
    </>
  );
};

export default AircraftCountersDisplay;
