import { InsightContainer, DisplayMode } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";

interface YearEndOutlookInsightProps {
  onBack: () => void;
}

export function YearEndOutlookInsight({ onBack }: YearEndOutlookInsightProps) {
  const currentYear = new Date().getFullYear();
  
  const assumptions = [
    "Projection based on average monthly spending over last 90 days",
    "Assumes current flight hour rate continues through year end",
    "Scheduled commitment renewals are included in projection",
  ];

  const renderContent = (mode: DisplayMode) => {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-lg font-medium mb-2">Year-End Outlook</h3>
          <p className="text-muted-foreground max-w-md">
            This insight will project total cost and cost per hour through December {currentYear} 
            based on current spending trends.
            {mode === "chart" ? " Trend chart coming soon." : " Projection table coming soon."}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Projection methodology: Linear extrapolation with seasonal adjustment
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <InsightContainer
      title="Year-End Outlook"
      subtitle={`Projection of total costs through December ${currentYear}.`}
      dataType="projected"
      assumptions={assumptions}
      onBack={onBack}
    >
      {renderContent}
    </InsightContainer>
  );
}
