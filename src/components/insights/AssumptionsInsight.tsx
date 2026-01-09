import { useState, useEffect, useCallback } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { InsightContainer } from "./InsightContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAircraft } from "@/contexts/AircraftContext";
import { fetchCounterLog, calculateUsageRate, CounterType } from "@/lib/counterInterpolation";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface AssumptionsInsightProps {
  onBack: () => void;
  userId: string;
}

interface UsageAssumptions {
  forecastedHoursPerMonth: number | null;
  forecastedTotalHours: number | null;
  usageModel: "Linear" | "Manual" | "Fixed-costs-only";
  sourceWindow: string;
  counterType: string;
  hasOverride: boolean;
  confidence: "high" | "low" | null;
}

interface CostBehaviorAssumptions {
  fixedCostCount: number;
  fixedCostItems: string[];
  variableCostCategories: string[];
  deferredCostCount: number;
  deferredCostItems: string[];
  costPerHourEnabled: boolean;
}

interface MaintenanceAssumptions {
  recurringMaintenanceIncluded: boolean;
  recurringMaintenanceCount: number;
  recurringMaintenanceItems: { name: string; basis: string; interval: string }[];
  detectionBasis: "Historical pattern" | "User-configured" | "None";
}

interface ReserveAssumptions {
  activeReservesCount: number;
  reservesInCostPerHour: number;
  hourBasedReserves: { name: string; hoursInterval: number }[];
  calendarBasedReserves: { name: string; interval: string }[];
}

interface AmortizationAssumptions {
  amortizedTransactionsIncluded: boolean;
  amortizedTransactionCount: number;
  amortizedItems: { name: string; period: string }[];
  coverageHandoffs: { from: string; to: string }[];
  doubleCountingPrevention: boolean;
}

interface DataGapAssumptions {
  hasDataGaps: boolean;
  gaps: string[];
  fallbacksApplied: string[];
}

interface AllAssumptions {
  usage: UsageAssumptions;
  costBehavior: CostBehaviorAssumptions;
  maintenance: MaintenanceAssumptions;
  reserves: ReserveAssumptions;
  amortization: AmortizationAssumptions;
  dataGaps: DataGapAssumptions;
}

// Variable cost categories matching other insights
const VARIABLE_CATEGORIES = ["Fuel", "Oil & Consumables", "Travel"];

export function AssumptionsInsight({ onBack, userId }: AssumptionsInsightProps) {
  const { selectedAircraft } = useAircraft();
  const [loading, setLoading] = useState(true);
  const [assumptions, setAssumptions] = useState<AllAssumptions | null>(null);

  const fetchAssumptions = useCallback(async () => {
    if (!selectedAircraft?.id) return;
    
    setLoading(true);
    
    try {
      const gaps: string[] = [];
      const fallbacks: string[] = [];

      // 1. USAGE ASSUMPTIONS
      const counterType: CounterType = "tach"; // Default counter type
      const log = await fetchCounterLog(selectedAircraft.id, counterType);
      const usageRate = calculateUsageRate(log, 90);
      
      let usageAssumptions: UsageAssumptions;
      
      if (!usageRate || usageRate.rate <= 0) {
        gaps.push("Insufficient counter history for usage projection");
        fallbacks.push("Using zero hours for variable cost projections");
        usageAssumptions = {
          forecastedHoursPerMonth: null,
          forecastedTotalHours: null,
          usageModel: "Fixed-costs-only",
          sourceWindow: "N/A",
          counterType: "Tach",
          hasOverride: false,
          confidence: null,
        };
      } else {
        const hoursPerMonth = usageRate.rate * 30.44;
        usageAssumptions = {
          forecastedHoursPerMonth: Math.round(hoursPerMonth * 10) / 10,
          forecastedTotalHours: Math.round(hoursPerMonth * 12 * 10) / 10,
          usageModel: "Linear",
          sourceWindow: `Last ${usageRate.windowDays} days`,
          counterType: "Tach",
          hasOverride: false,
          confidence: usageRate.confidence,
        };
        
        if (usageRate.confidence === "low") {
          gaps.push("Limited counter data points available");
        }
      }

      // 2. COST BEHAVIOR ASSUMPTIONS
      // Fetch commitments (fixed costs)
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("subscription_name, type")
        .eq("aircraft_id", selectedAircraft.id)
        .or(`final_date.is.null,final_date.gte.${format(new Date(), "yyyy-MM-dd")}`);

      const fixedCostItems = subscriptions?.map(s => s.subscription_name) || [];
      
      // Fetch reserves included in cost per hour
      const { data: reserves } = await supabase
        .from("reserves")
        .select("*")
        .eq("aircraft_id", selectedAircraft.id)
        .eq("status", "Active");

      const reservesInCph = reserves?.filter(r => r.include_in_cost_per_hour) || [];
      const deferredCostItems = reservesInCph.map(r => `${r.title} Reserve`);

      const costBehaviorAssumptions: CostBehaviorAssumptions = {
        fixedCostCount: fixedCostItems.length,
        fixedCostItems: fixedCostItems.slice(0, 5), // Show top 5
        variableCostCategories: VARIABLE_CATEGORIES,
        deferredCostCount: deferredCostItems.length,
        deferredCostItems: deferredCostItems.slice(0, 5),
        costPerHourEnabled: reservesInCph.length > 0,
      };

      // 3. MAINTENANCE ASSUMPTIONS
      const { data: maintenanceLogs } = await supabase
        .from("maintenance_logs")
        .select("entry_title, interval_type, interval_months, recurrence_counter_type, recurrence_counter_increment")
        .eq("aircraft_id", selectedAircraft.id)
        .eq("is_recurring_task", true);

      const recurringMaintenanceItems = (maintenanceLogs || []).map(log => {
        let basis = "Unknown";
        let interval = "";
        
        if (log.interval_type === "Calendar" && log.interval_months) {
          basis = "Calendar";
          interval = log.interval_months === 12 ? "Yearly" : `Every ${log.interval_months} months`;
        } else if (log.interval_type === "Hours" && log.recurrence_counter_increment) {
          basis = log.recurrence_counter_type || "Hours";
          interval = `Every ${log.recurrence_counter_increment} hours`;
        } else if (log.interval_type === "Mixed") {
          basis = "Mixed";
          const parts = [];
          if (log.interval_months) parts.push(`${log.interval_months} months`);
          if (log.recurrence_counter_increment) parts.push(`${log.recurrence_counter_increment} hours`);
          interval = parts.join(" or ");
        }
        
        return { name: log.entry_title, basis, interval };
      });

      const maintenanceAssumptions: MaintenanceAssumptions = {
        recurringMaintenanceIncluded: recurringMaintenanceItems.length > 0,
        recurringMaintenanceCount: recurringMaintenanceItems.length,
        recurringMaintenanceItems: recurringMaintenanceItems.slice(0, 5),
        detectionBasis: recurringMaintenanceItems.length > 0 ? "User-configured" : "None",
      };

      // 4. RESERVE ASSUMPTIONS
      const hourBasedReserves = (reserves || [])
        .filter(r => r.basis_type === "Hours" && r.limit_hours)
        .map(r => ({ name: r.title, hoursInterval: r.limit_hours! }));
      
      const calendarBasedReserves = (reserves || [])
        .filter(r => r.basis_type === "Calendar" && r.interval_value && r.interval_unit)
        .map(r => ({ 
          name: r.title, 
          interval: `${r.interval_value} ${r.interval_unit}` 
        }));

      const reserveAssumptions: ReserveAssumptions = {
        activeReservesCount: reserves?.length || 0,
        reservesInCostPerHour: reservesInCph.length,
        hourBasedReserves: hourBasedReserves.slice(0, 5),
        calendarBasedReserves: calendarBasedReserves.slice(0, 5),
      };

      // 5. AMORTIZATION ASSUMPTIONS
      const { data: amortizedTransactions } = await supabase
        .from("transactions")
        .select("title, allocation_start_date, allocation_end_date")
        .eq("aircraft_id", selectedAircraft.id)
        .eq("allocate_over_time", true);

      // Detect coverage handoffs (where one amortization ends and another begins)
      const coverageHandoffs: { from: string; to: string }[] = [];
      if (amortizedTransactions && amortizedTransactions.length > 1) {
        // Group by similar titles (e.g., Insurance renewals)
        const grouped: Record<string, typeof amortizedTransactions> = {};
        amortizedTransactions.forEach(tx => {
          const baseTitle = tx.title.replace(/\d{4}|\d{2}\/\d{2}/g, "").trim();
          if (!grouped[baseTitle]) grouped[baseTitle] = [];
          grouped[baseTitle].push(tx);
        });
        
        Object.entries(grouped).forEach(([title, txs]) => {
          if (txs.length >= 2) {
            const sorted = txs.sort((a, b) => 
              new Date(a.allocation_start_date || 0).getTime() - new Date(b.allocation_start_date || 0).getTime()
            );
            for (let i = 0; i < sorted.length - 1; i++) {
              if (sorted[i].allocation_end_date && sorted[i + 1].allocation_start_date) {
                const endDate = new Date(sorted[i].allocation_end_date);
                const startDate = new Date(sorted[i + 1].allocation_start_date);
                // If dates are within a month, it's a handoff
                const diffDays = Math.abs((startDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays <= 45) {
                  coverageHandoffs.push({
                    from: `${title} (ends ${format(endDate, "MMM yyyy")})`,
                    to: `${title} (starts ${format(startDate, "MMM yyyy")})`,
                  });
                }
              }
            }
          }
        });
      }

      // Build list of amortized items with their periods
      const amortizedItems = (amortizedTransactions || [])
        .filter(tx => tx.allocation_start_date && tx.allocation_end_date)
        .map(tx => ({
          name: tx.title,
          period: `${format(new Date(tx.allocation_start_date), "MMM yyyy")} – ${format(new Date(tx.allocation_end_date), "MMM yyyy")}`,
        }))
        .slice(0, 5);

      const amortizationAssumptions: AmortizationAssumptions = {
        amortizedTransactionsIncluded: (amortizedTransactions?.length || 0) > 0,
        amortizedTransactionCount: amortizedTransactions?.length || 0,
        amortizedItems,
        coverageHandoffs: coverageHandoffs.slice(0, 3),
        doubleCountingPrevention: true, // Always applied
      };

      // 6. DATA GAPS & FALLBACKS
      const dataGapAssumptions: DataGapAssumptions = {
        hasDataGaps: gaps.length > 0,
        gaps,
        fallbacksApplied: fallbacks,
      };

      setAssumptions({
        usage: usageAssumptions,
        costBehavior: costBehaviorAssumptions,
        maintenance: maintenanceAssumptions,
        reserves: reserveAssumptions,
        amortization: amortizationAssumptions,
        dataGaps: dataGapAssumptions,
      });
    } catch (err) {
      console.error("Error fetching assumptions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAircraft?.id]);

  useEffect(() => {
    fetchAssumptions();
  }, [fetchAssumptions]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      );
    }

    if (!assumptions) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Unable to load assumptions. Please try again.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Intro Card */}
        <div className="p-4 rounded-lg bg-muted/50 border flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>
              These assumptions drive the calculations in Outlook, True Cost, and Cost Structure.
              Understanding them helps you interpret the numbers accurately and identify areas for improvement.
            </p>
          </div>
        </div>

        {/* Data Gaps Alert - shown first if present */}
        {assumptions.dataGaps.hasDataGaps && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Data Gaps & Fallbacks</CardTitle>
              </div>
              <CardDescription className="text-xs">Uncertainty that affects projections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assumptions.dataGaps.gaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Missing or insufficient data:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    {assumptions.dataGaps.gaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
              {assumptions.dataGaps.fallbacksApplied.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Fallbacks applied:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    {assumptions.dataGaps.fallbacksApplied.map((fallback, i) => (
                      <li key={i}>{fallback}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Usage Assumptions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Usage Projection</CardTitle>
              <CardDescription className="text-xs">How future flight hours are estimated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AssumptionRow
                label="Forecasted usage (annual)"
                value={assumptions.usage.forecastedTotalHours !== null 
                  ? `${assumptions.usage.forecastedTotalHours} hours`
                  : "Not available"}
                status={assumptions.usage.confidence === "high" ? "good" : assumptions.usage.confidence === "low" ? "warning" : "neutral"}
              />
              <AssumptionRow
                label="Usage model"
                value={assumptions.usage.usageModel}
                status="neutral"
              />
              <AssumptionRow
                label="Source window"
                value={assumptions.usage.sourceWindow}
                status="neutral"
              />
              <AssumptionRow
                label="Counter type"
                value={assumptions.usage.counterType}
                status="neutral"
              />
              <AssumptionRow
                label="Override applied"
                value={assumptions.usage.hasOverride ? "Yes" : "No"}
                status="neutral"
              />
            </CardContent>
          </Card>

          {/* Cost Behavior Assumptions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cost Classification</CardTitle>
              <CardDescription className="text-xs">How expenses are categorized</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AssumptionRow
                label="Fixed costs (Commitments)"
                value={`${assumptions.costBehavior.fixedCostCount} items`}
                status={assumptions.costBehavior.fixedCostCount > 0 ? "good" : "neutral"}
                subItems={assumptions.costBehavior.fixedCostItems}
              />
              <AssumptionRow
                label="Variable cost categories"
                value={assumptions.costBehavior.variableCostCategories.join(", ")}
                status="neutral"
              />
              <AssumptionRow
                label="Deferred costs (Reserves)"
                value={`${assumptions.costBehavior.deferredCostCount} items`}
                status={assumptions.costBehavior.deferredCostCount > 0 ? "good" : "neutral"}
                subItems={assumptions.costBehavior.deferredCostItems}
              />
              <AssumptionRow
                label="Cost-per-hour enabled"
                value={assumptions.costBehavior.costPerHourEnabled ? "Yes" : "No"}
                status={assumptions.costBehavior.costPerHourEnabled ? "good" : "neutral"}
              />
            </CardContent>
          </Card>

          {/* Maintenance Assumptions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recurring Maintenance</CardTitle>
              <CardDescription className="text-xs">How scheduled maintenance is projected</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AssumptionRow
                label="Recurring maintenance"
                value={assumptions.maintenance.recurringMaintenanceIncluded ? "Included" : "Not included"}
                status={assumptions.maintenance.recurringMaintenanceIncluded ? "good" : "neutral"}
              />
              <AssumptionRow
                label="Items detected"
                value={`${assumptions.maintenance.recurringMaintenanceCount} tasks`}
                status="neutral"
              />
              <AssumptionRow
                label="Detection basis"
                value={assumptions.maintenance.detectionBasis}
                status="neutral"
              />
              {assumptions.maintenance.recurringMaintenanceItems.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Scheduled items:</p>
                  <ul className="space-y-1.5">
                    {assumptions.maintenance.recurringMaintenanceItems.map((item, i) => (
                      <li key={i} className="text-xs flex items-start gap-2">
                        <span className="font-medium truncate max-w-[140px]">{item.name}</span>
                        <span className="text-muted-foreground">
                          ({item.basis}: {item.interval})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reserve Assumptions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reserve Accruals</CardTitle>
              <CardDescription className="text-xs">How future wear contributes to cost</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AssumptionRow
                label="Active reserves"
                value={`${assumptions.reserves.activeReservesCount} total`}
                status={assumptions.reserves.activeReservesCount > 0 ? "good" : "neutral"}
              />
              <AssumptionRow
                label="Included in cost-per-hour"
                value={`${assumptions.reserves.reservesInCostPerHour} reserves`}
                status={assumptions.reserves.reservesInCostPerHour > 0 ? "good" : "neutral"}
              />
              {assumptions.reserves.hourBasedReserves.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Hour-based accrual:</p>
                  <ul className="space-y-1">
                    {assumptions.reserves.hourBasedReserves.map((item, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground"> every {item.hoursInterval} hours</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {assumptions.reserves.calendarBasedReserves.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Calendar-based accrual:</p>
                  <ul className="space-y-1">
                    {assumptions.reserves.calendarBasedReserves.map((item, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground"> over {item.interval}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Amortization Assumptions */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Amortization & Coverage</CardTitle>
              <CardDescription className="text-xs">How overlapping costs are handled over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AssumptionRow
                  label="Amortized transactions"
                  value={assumptions.amortization.amortizedTransactionsIncluded 
                    ? `${assumptions.amortization.amortizedTransactionCount} items` 
                    : "None"}
                  status={assumptions.amortization.amortizedTransactionsIncluded ? "good" : "neutral"}
                />
                <AssumptionRow
                  label="Coverage handoffs detected"
                  value={`${assumptions.amortization.coverageHandoffs.length} transitions`}
                  status="neutral"
                />
                <AssumptionRow
                  label="Double-counting prevention"
                  value={assumptions.amortization.doubleCountingPrevention ? "Applied" : "Not applied"}
                  status="good"
                />
              </div>
              {assumptions.amortization.amortizedItems.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Amortized items:</p>
                  <ul className="space-y-1">
                    {assumptions.amortization.amortizedItems.map((item, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground"> ({item.period})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {assumptions.amortization.coverageHandoffs.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Coverage transitions:</p>
                  <ul className="space-y-2">
                    {assumptions.amortization.coverageHandoffs.map((handoff, i) => (
                      <li key={i} className="text-xs flex items-center gap-2">
                        <span className="text-muted-foreground">{handoff.from}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{handoff.to}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Relationships Note */}
        <Card className="border-dashed">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How insights relate:</p>
                <ul className="space-y-1">
                  <li><strong>Outlook</strong> → "Here's the forecast"</li>
                  <li><strong>Assumptions</strong> → "Here's how we got there"</li>
                  <li><strong>True Cost</strong> → "Here's the normalized result"</li>
                  <li><strong>Cost Structure</strong> → "Here's what kind of costs those are"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <InsightContainer
      title="Assumptions"
      subtitle="Inputs, inferences, and fallbacks behind your forecasts."
      dataType="modeled"
      onBack={onBack}
      showDisplayToggle={false}
    >
      {renderContent}
    </InsightContainer>
  );
}

// Helper component for consistent assumption display
interface AssumptionRowProps {
  label: string;
  value: string;
  status: "good" | "warning" | "neutral";
  subItems?: string[];
}

function AssumptionRow({ label, value, status, subItems }: AssumptionRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {status === "good" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          {status === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          <span className={cn(
            "text-sm font-medium",
            status === "good" && "text-emerald-600",
            status === "warning" && "text-amber-600"
          )}>
            {value}
          </span>
        </div>
      </div>
      {subItems && subItems.length > 0 && (
        <div className="pl-2 text-xs text-muted-foreground">
          {subItems.slice(0, 3).join(", ")}
          {subItems.length > 3 && ` +${subItems.length - 3} more`}
        </div>
      )}
    </div>
  );
}
