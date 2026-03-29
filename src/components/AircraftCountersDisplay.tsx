import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, History } from "lucide-react";
import { AircraftCounters, NumericCounterKey } from "@/hooks/useAircraftCounters";
import CounterHistoryDialog from "./CounterHistoryDialog";
import { BatchCounterEditDialog } from "./BatchCounterEditDialog";
import { useAircraft } from "@/contexts/AircraftContext";

interface AircraftCountersDisplayProps {
  counters: AircraftCounters;
  loading: boolean;
  userId: string;
  aircraftId: string;
  onUpdateCounter: (field: NumericCounterKey, value: number) => Promise<void>;
  onUpdateAllCounters: (updates: Partial<Pick<AircraftCounters, NumericCounterKey>>) => Promise<void>;
  onRefetch: () => void;
}

const counterConfig = [
  { key: "hobbs" as const, label: "Hobbs", color: "bg-blue-500/10 border-blue-500/20" },
  { key: "tach" as const, label: "Tach", color: "bg-green-500/10 border-green-500/20" },
  { key: "airframe_total_time" as const, label: "Airframe TT", color: "bg-purple-500/10 border-purple-500/20" },
  { key: "engine_total_time" as const, label: "Engine TT", color: "bg-orange-500/10 border-orange-500/20" },
  { key: "prop_total_time" as const, label: "Prop TT", color: "bg-teal-500/10 border-teal-500/20" },
];

// Helper to format counter display
const formatCounterDisplay = (counters: AircraftCounters, key: NumericCounterKey): string => {
  if (!counters.isInitialized) return "—";
  const value = counters[key];
  return typeof value === "number" ? value.toFixed(1) : "—";
};

const AircraftCountersDisplay = ({ counters, loading, userId, aircraftId, onUpdateAllCounters, onRefetch }: AircraftCountersDisplayProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);

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
              onClick={() => setIsBatchEditOpen(true)}
            >
              <CardContent className="p-4 text-center relative">
                <Pencil className="h-3 w-3 absolute top-2 right-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{config.label}</p>
                <p className="text-2xl font-bold mt-1">{formatCounterDisplay(counters, config.key)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <CounterHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        userId={userId}
        aircraftId={aircraftId}
        onRevert={onRefetch}
      />

      <BatchCounterEditDialog
        open={isBatchEditOpen}
        onOpenChange={setIsBatchEditOpen}
        counters={counters}
        counterModes={{
          airframe_tt_mode: selectedAircraft?.airframe_tt_mode ?? "tach",
          engine_tt_mode: selectedAircraft?.engine_tt_mode ?? "tach",
          prop_tt_mode: selectedAircraft?.prop_tt_mode ?? "tach",
        }}
        onSave={onUpdateAllCounters}
      />
    </>
  );
};

export default AircraftCountersDisplay;
