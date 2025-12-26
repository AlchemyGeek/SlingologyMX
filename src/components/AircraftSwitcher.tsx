import { useAircraft } from "@/contexts/AircraftContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plane } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AircraftSwitcher() {
  const { aircraft, selectedAircraft, loading, selectAircraft } = useAircraft();

  if (loading) {
    return <Skeleton className="h-9 w-40" />;
  }

  if (aircraft.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Plane className="h-4 w-4" />
        <span>No aircraft</span>
      </div>
    );
  }

  // If only one aircraft, show it without dropdown
  if (aircraft.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
        <Plane className="h-4 w-4 text-primary" />
        <span className="font-medium">{aircraft[0].registration}</span>
        {aircraft[0].model_make && (
          <span className="text-muted-foreground text-sm">({aircraft[0].model_make})</span>
        )}
      </div>
    );
  }

  return (
    <Select value={selectedAircraft?.id || ""} onValueChange={selectAircraft}>
      <SelectTrigger className="w-auto min-w-[180px] gap-2">
        <Plane className="h-4 w-4 text-primary" />
        <SelectValue placeholder="Select aircraft" />
      </SelectTrigger>
      <SelectContent>
        {aircraft.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{a.registration}</span>
              {a.model_make && (
                <span className="text-muted-foreground text-sm">({a.model_make})</span>
              )}
              {a.is_primary && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
