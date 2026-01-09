import { useState } from "react";
import { InsightsOverview, InsightView } from "./insights/InsightsOverview";
import { WhatHappenedInsight } from "./insights/WhatHappenedInsight";
import { TrueCostInsight } from "./insights/TrueCostInsight";
import { CostStructureInsight } from "./insights/CostStructureInsight";
import { OutlookInsight } from "./insights/OutlookInsight";
import { AssumptionsInsight } from "./insights/AssumptionsInsight";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface InsightsPanelProps {
  userId?: string;
}

export function InsightsPanel({ userId: propUserId }: InsightsPanelProps) {
  const [currentView, setCurrentView] = useState<InsightView>("overview");
  const [userId, setUserId] = useState<string | null>(propUserId || null);

  useEffect(() => {
    if (!propUserId) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUserId(session?.user?.id || null);
      });
    }
  }, [propUserId]);

  const handleBack = () => setCurrentView("overview");

  if (!userId) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  switch (currentView) {
    case "what-happened":
      return <WhatHappenedInsight onBack={handleBack} userId={userId} />;
    case "true-cost":
      return <TrueCostInsight onBack={handleBack} userId={userId} />;
    case "cost-structure":
      return <CostStructureInsight onBack={handleBack} userId={userId} />;
    case "outlook":
      return <OutlookInsight onBack={handleBack} userId={userId} />;
    case "assumptions":
      return <AssumptionsInsight onBack={handleBack} />;
    default:
      return <InsightsOverview onSelectInsight={setCurrentView} />;
  }
}
