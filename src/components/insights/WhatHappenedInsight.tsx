import { InsightContainer, DisplayMode } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";

interface WhatHappenedInsightProps {
  onBack: () => void;
}

export function WhatHappenedInsight({ onBack }: WhatHappenedInsightProps) {
  const renderContent = (mode: DisplayMode) => {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium mb-2">What Happened</h3>
          <p className="text-muted-foreground max-w-md">
            This insight will show historical costs based on actual recorded transactions.
            {mode === "chart" ? " Chart view coming soon." : " Table view coming soon."}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Data source: Transactions table (Posted status only)
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <InsightContainer
      title="What Happened"
      subtitle="Historical costs based on actual recorded transactions."
      dataType="actual"
      onBack={onBack}
    >
      {renderContent}
    </InsightContainer>
  );
}
