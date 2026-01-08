import { InsightContainer } from "./InsightContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface AssumptionsInsightProps {
  onBack: () => void;
}

interface AssumptionGroup {
  title: string;
  description: string;
  assumptions: {
    name: string;
    value: string;
    impact: string;
  }[];
}

const assumptionGroups: AssumptionGroup[] = [
  {
    title: "Flight Hours",
    description: "How flight time is measured and projected",
    assumptions: [
      {
        name: "Counter Source",
        value: "Tach",
        impact: "Used to calculate cost per hour and project future usage",
      },
      {
        name: "Annual Hours Estimate",
        value: "Derived from 90-day average",
        impact: "Affects year-end projections and reserve accrual rates",
      },
    ],
  },
  {
    title: "Cost Classification",
    description: "How expenses are categorized",
    assumptions: [
      {
        name: "Fixed Costs",
        value: "Hangar, Insurance, Subscriptions",
        impact: "Included regardless of flight activity",
      },
      {
        name: "Variable Costs",
        value: "Fuel, Oil, Maintenance",
        impact: "Scaled by flight hours for projections",
      },
      {
        name: "Deferred Costs",
        value: "Reserve accruals",
        impact: "Spread over time-to-event or hours-to-event",
      },
    ],
  },
  {
    title: "Projections",
    description: "How future values are estimated",
    assumptions: [
      {
        name: "Projection Method",
        value: "Linear extrapolation",
        impact: "Uses historical trends to estimate future costs",
      },
      {
        name: "Lookback Period",
        value: "90 days",
        impact: "Balances recent trends with seasonal variation",
      },
    ],
  },
];

export function AssumptionsInsight({ onBack }: AssumptionsInsightProps) {
  const renderContent = () => {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-muted/50 border flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>
              These assumptions drive the calculations in True Cost, Cost Structure, and Year-End Outlook.
              Understanding them helps interpret the numbers accurately.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assumptionGroups.map((group) => (
            <Card key={group.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{group.title}</CardTitle>
                <CardDescription className="text-xs">{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.assumptions.map((assumption) => (
                  <div key={assumption.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{assumption.name}</span>
                      <span className="text-sm text-muted-foreground">{assumption.value}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{assumption.impact}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Assumption customization coming soon. Currently using system defaults.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <InsightContainer
      title="Assumptions"
      subtitle="Modeling parameters that drive insights calculations."
      dataType="modeled"
      onBack={onBack}
      showDisplayToggle={false}
    >
      {renderContent}
    </InsightContainer>
  );
}
