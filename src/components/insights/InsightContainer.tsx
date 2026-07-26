import { ArrowLeft, Table, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";

export type DisplayMode = "table" | "chart";

interface InsightContainerProps {
  title: string;
  subtitle: string;
  dataType: "actual" | "modeled" | "projected";
  assumptions?: string[];
  onBack: () => void;
  children: (mode: DisplayMode) => React.ReactNode;
  showDisplayToggle?: boolean;
}

const DataTypeBadge = ({ type }: { type: "actual" | "modeled" | "projected" }) => {
  const styles = {
    actual: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    modeled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    projected: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  const labels = {
    actual: "Actual Data",
    modeled: "Modeled Values",
    projected: "Future Projection",
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${styles[type]}`}>
      {labels[type]}
    </span>
  );
};

export function InsightContainer({
  title,
  subtitle,
  dataType,
  assumptions,
  onBack,
  children,
  showDisplayToggle = true,
}: InsightContainerProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("chart");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              <DataTypeBadge type={dataType} />
            </div>
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          </div>
        </div>

        {showDisplayToggle && (
          <ToggleGroup
            type="single"
            value={displayMode}
            onValueChange={(value) => value && setDisplayMode(value as DisplayMode)}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem value="chart" aria-label="Chart view" className="px-3">
              <BarChart3 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Chart</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" className="px-3">
              <Table className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Table</span>
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {/* Assumptions Banner */}
      {assumptions && assumptions.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600 mb-1">
            Assumptions
          </p>
          <ul className="text-sm text-muted-foreground space-y-0.5">
            {assumptions.map((assumption, idx) => (
              <li key={idx}>• {assumption}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px]">
        {children(displayMode)}
      </div>
    </div>
  );
}
