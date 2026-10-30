import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, History, CornerDownRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AircraftCounters, NumericCounterKey } from "@/hooks/useAircraftCounters";
import { getOwnerHours } from "@/lib/counterInterpolation";
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
  { key: "tach" as const, label: "Tach" },
  { key: "hobbs" as const, label: "Hobbs" },
  { key: "airframe_total_time" as const, label: "Airframe TT" },
  { key: "engine_total_time" as const, label: "Engine TT" },
  { key: "prop_total_time" as const, label: "Prop TT" },
];

// Helper to format counter display
const formatCounterDisplay = (counters: AircraftCounters, key: NumericCounterKey): string => {
  if (!counters.isInitialized) return "—";
  const value = counters[key];
  return typeof value === "number" ? value.toFixed(1) : "—";
};

// Helper to get owner hours display if initial values are set
const getOwnerHoursDisplay = (
  counters: AircraftCounters,
  key: NumericCounterKey,
  initialValue: number | null
): string | null => {
  if (!counters.isInitialized || initialValue === null) return null;
  const value = counters[key];
  if (typeof value !== "number") return null;
  const ownerHrs = getOwnerHours(value, initialValue);
  return ownerHrs.toFixed(1);
};

const AircraftCountersDisplay = ({ counters, loading, userId, aircraftId, onUpdateAllCounters, onRefetch }: AircraftCountersDisplayProps) => {
  const { selectedAircraft } = useAircraft();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const hideHobbs = !!selectedAircraft?.link_hobbs_to_tach;
  const primaryConfig = counterConfig.filter((c) => c.key === "tach" || (c.key === "hobbs" && !hideHobbs));
  const derivedConfig = counterConfig.filter((c) => c.key !== "tach" && c.key !== "hobbs");
  const initialValues = {
    hobbs: selectedAircraft?.initial_hobbs ?? null,
    tach: selectedAircraft?.initial_tach ?? null,
    airframe_total_time: selectedAircraft?.initial_airframe_total_time ?? null,
    engine_total_time: selectedAircraft?.initial_engine_total_time ?? null,
    prop_total_time: selectedAircraft?.initial_prop_total_time ?? null,
  };
  const ownerHours = (key: NumericCounterKey) => loading ? null : getOwnerHoursDisplay(counters, key, initialValues[key]);
  const reading = (key: NumericCounterKey) => loading ? "…" : formatCounterDisplay(counters, key);

  return (
    <>
      <section aria-label="Aircraft counters" className="mb-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Aircraft Counters</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
            variant="outline"
            size="sm"
            aria-label="Counter history"
            onClick={() => setIsHistoryOpen(true)}
            className="shrink-0"
          >
            <History className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">History</span>
          </Button>
            </TooltipTrigger>
            <TooltipContent>Counter history</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-start gap-3 border-l-2 border-primary bg-primary/5 py-4 pl-4 pr-3 sm:pl-5">
          <dl className={`grid min-w-0 flex-1 ${hideHobbs ? "grid-cols-1" : "grid-cols-2"} gap-3 sm:gap-6`}>
            {primaryConfig.map((config) => (
              <div key={config.key} className="min-w-0">
                <dt className="text-sm font-medium text-primary">{config.label}</dt>
                <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-3xl sm:text-4xl font-semibold tabular-nums break-all">{reading(config.key)}</span>
                  <span className="text-xs text-muted-foreground">hrs</span>
                </dd>
                {ownerHours(config.key) !== null && <dd className="mt-1 text-xs text-muted-foreground">Owner: {ownerHours(config.key)} hrs</dd>}
              </div>
            ))}
          </dl>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 h-11 w-11" aria-label="Edit counters" disabled={loading} onClick={() => setIsBatchEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit counters</TooltipContent>
          </Tooltip>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CornerDownRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Component hours · follows Tach</span>
        </div>
        <dl className="mt-2 grid grid-cols-3 divide-x divide-border border-b border-border pb-3">
          {derivedConfig.map((config, index) => (
            <div key={config.key} className={`min-w-0 ${index === 0 ? "pr-2" : "px-2 sm:px-4"}`}>
              <dt className="text-xs text-muted-foreground">{config.label}</dt>
              <dd className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-lg sm:text-xl font-medium tabular-nums break-all">{reading(config.key)}</span>
                <span className="text-xs text-muted-foreground">hrs</span>
              </dd>
              {ownerHours(config.key) !== null && <dd className="mt-1 text-[11px] text-muted-foreground">Owner: {ownerHours(config.key)} hrs</dd>}
            </div>
          ))}
        </dl>
      </section>

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
        initialValues={{
          hobbs: selectedAircraft?.initial_hobbs ?? null,
          tach: selectedAircraft?.initial_tach ?? null,
          airframe_total_time: selectedAircraft?.initial_airframe_total_time ?? null,
          engine_total_time: selectedAircraft?.initial_engine_total_time ?? null,
          prop_total_time: selectedAircraft?.initial_prop_total_time ?? null,
        }}
        onSave={onUpdateAllCounters}
        linkHobbsToTach={!!selectedAircraft?.link_hobbs_to_tach}
      />
    </>
  );
};

export default AircraftCountersDisplay;
