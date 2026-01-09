import { ArrowRight, History, Calculator, PieChart, TrendingUp, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type InsightView = "overview" | "what-happened" | "true-cost" | "cost-structure" | "outlook" | "assumptions";

interface InsightCard {
  id: InsightView;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  dataType: "actual" | "modeled" | "projected";
}

const insightCards: InsightCard[] = [
  {
    id: "what-happened",
    title: "What Happened",
    subtitle: "Historical costs",
    description: "Actual recorded transactions over time. No modeling or projections.",
    icon: History,
    dataType: "actual"
  },
  {
    id: "true-cost",
    title: "True Cost",
    subtitle: "All-inclusive cost per hour",
    description: "Transactions + commitments + reserves. Shows the real cost of flying.",
    icon: Calculator,
    dataType: "modeled"
  },
  {
    id: "cost-structure",
    title: "Cost Structure",
    subtitle: "Fixed vs. variable costs",
    description: "Breakdown of fixed, variable, and deferred costs to understand your cost drivers.",
    icon: PieChart,
    dataType: "modeled"
  },
  {
    id: "outlook",
    title: "Outlook",
    subtitle: "Forward projection",
    description: "Estimated total cost and cost per hour over customizable timeframe based on current trends.",
    icon: TrendingUp,
    dataType: "projected"
  },
  {
    id: "assumptions",
    title: "Assumptions",
    subtitle: "Modeling parameters",
    description: "View and adjust the assumptions that drive projections and modeled values.",
    icon: Settings2,
    dataType: "modeled"
  }
];

interface InsightsOverviewProps {
  onSelectInsight: (view: InsightView) => void;
}

const DataTypeBadge = ({ type }: { type: "actual" | "modeled" | "projected" }) => {
  const styles = {
    actual: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    modeled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    projected: "bg-blue-500/10 text-blue-600 border-blue-500/20"
  };
  const labels = {
    actual: "Actual Data",
    modeled: "Modeled",
    projected: "Projected"
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[type]}`}>
      {labels[type]}
    </span>
  );
};

export function InsightsOverview({ onSelectInsight }: InsightsOverviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Insights</h2>
        <p className="text-muted-foreground mt-1">
          Curated financial views to understand the reality of aircraft ownership.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insightCards.map(card => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => onSelectInsight(card.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <DataTypeBadge type={card.dataType} />
                </div>
                <CardTitle className="text-lg mt-3 flex items-center gap-2">
                  {card.title}
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-muted-foreground" />
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  {card.subtitle}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-dashed">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Insights provide interpretation, not raw data manipulation.
          For custom analysis, use the <span className="font-medium">Export</span> feature in Transactions.
        </p>
      </div>
    </div>
  );
}
