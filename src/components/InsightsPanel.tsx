import { useState } from "react";
import { InsightsOverview, InsightView } from "./insights/InsightsOverview";
import { WhatHappenedInsight } from "./insights/WhatHappenedInsight";
import { TrueCostInsight } from "./insights/TrueCostInsight";
import { CostStructureInsight } from "./insights/CostStructureInsight";
import { YearEndOutlookInsight } from "./insights/YearEndOutlookInsight";
import { AssumptionsInsight } from "./insights/AssumptionsInsight";

export function InsightsPanel() {
  const [currentView, setCurrentView] = useState<InsightView>("overview");

  const handleBack = () => setCurrentView("overview");

  switch (currentView) {
    case "what-happened":
      return <WhatHappenedInsight onBack={handleBack} />;
    case "true-cost":
      return <TrueCostInsight onBack={handleBack} />;
    case "cost-structure":
      return <CostStructureInsight onBack={handleBack} />;
    case "year-end-outlook":
      return <YearEndOutlookInsight onBack={handleBack} />;
    case "assumptions":
      return <AssumptionsInsight onBack={handleBack} />;
    default:
      return <InsightsOverview onSelectInsight={setCurrentView} />;
  }
}
