import { InsightContainer, DisplayMode } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";

interface TrueCostInsightProps {
  onBack: () => void;
}

export function TrueCostInsight({ onBack }: TrueCostInsightProps) {
  const assumptions = [
    "Commitment costs are amortized based on their recurrence period",
    "Reserve accruals are calculated using straight-line method",
    "Flight hours derived from Tach counter changes",
  ];

  const renderContent = (mode: DisplayMode) => {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-4">💰</div>
          <h3 className="text-lg font-medium mb-2">True Cost</h3>
          <p className="text-muted-foreground max-w-md">
            This insight will calculate all-inclusive cost per flight hour including 
            transactions, amortized commitments, and reserve accruals.
            {mode === "chart" ? " Chart view coming soon." : " Table view coming soon."}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Data sources: Transactions + Commitments + Reserves + Counter History
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <InsightContainer
      title="True Cost"
      subtitle="All-inclusive cost per flight hour."
      dataType="modeled"
      assumptions={assumptions}
      onBack={onBack}
    >
      {renderContent}
    </InsightContainer>
  );
}
