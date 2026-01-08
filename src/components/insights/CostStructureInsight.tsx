import { InsightContainer, DisplayMode } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";

interface CostStructureInsightProps {
  onBack: () => void;
}

export function CostStructureInsight({ onBack }: CostStructureInsightProps) {
  const assumptions = [
    "Fixed costs: Hangar, Insurance, Subscriptions",
    "Variable costs: Fuel, Maintenance, Oil & Consumables",
    "Deferred costs: Reserve accruals for future overhauls",
  ];

  const renderContent = (mode: DisplayMode) => {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-4">🥧</div>
          <h3 className="text-lg font-medium mb-2">Cost Structure</h3>
          <p className="text-muted-foreground max-w-md">
            This insight will break down costs into fixed, variable, and deferred categories 
            to help understand cost drivers.
            {mode === "chart" ? " Pie chart view coming soon." : " Table breakdown coming soon."}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Categorization based on transaction intent and category
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <InsightContainer
      title="Cost Structure"
      subtitle="Breakdown of fixed, variable, and deferred costs."
      dataType="modeled"
      assumptions={assumptions}
      onBack={onBack}
    >
      {renderContent}
    </InsightContainer>
  );
}
