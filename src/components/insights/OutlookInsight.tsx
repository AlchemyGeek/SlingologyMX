import { useState, useEffect, useMemo, useCallback } from "react";
import { format, addYears, addMonths, endOfYear, differenceInDays, differenceInMonths } from "date-fns";
import { InsightContainer, DisplayMode } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAircraft } from "@/contexts/AircraftContext";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { formatCurrency } from "@/lib/currency";
import { Calendar as CalendarIcon, Info, AlertCircle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { 
  fetchCounterLog, 
  calculateUsageRate,
  CounterType, 
} from "@/lib/counterInterpolation";
import {
  calculateTimeBasedAmortization,
  TimeBasedAmortization,
} from "@/lib/amortization";

interface OutlookInsightProps {
  onBack: () => void;
  userId: string;
}

type ForecastPeriod = "rolling-12" | "calendar-year" | "custom";

interface ForecastCostItem {
  name: string;
  amount: number;
  type: "commitment" | "variable" | "reserve" | "maintenance";
  category: "fixed" | "variable" | "deferred";
}

interface UsageProjection {
  hoursPerMonth: number;
  totalHours: number;
  source: "calculated" | "manual";
  confidence: "high" | "low";
  explanation: string;
}

const FORECAST_OPTIONS = [
  { value: "rolling-12", label: "Rolling 12 Months" },
  { value: "calendar-year", label: "Calendar Year" },
  { value: "custom", label: "Custom Range" },
];

const COUNTER_OPTIONS: { value: CounterType; label: string }[] = [
  { value: "tach", label: "Tach" },
  { value: "hobbs", label: "Hobbs" },
  { value: "engine_total_time", label: "Engine TT" },
  { value: "airframe_total_time", label: "Airframe TT" },
];

// Variable cost categories (per-hour costs)
const VARIABLE_CATEGORIES = ["Fuel", "Oil & Consumables", "Travel"] as const;

const BREAKDOWN_COLORS = {
  variable: "hsl(220, 70%, 50%)",
  fixed: "hsl(160, 70%, 50%)",
  deferred: "hsl(30, 70%, 50%)",
};

function getRecurrenceMonths(recurrence: string): number {
  switch (recurrence) {
    case "Weekly": return 0.25;
    case "Bi-Monthly": return 0.5;
    case "Monthly": return 1;
    case "Quarterly": return 3;
    case "Semi-Annual": return 6;
    case "Yearly": return 12;
    default: return 12;
  }
}

function getForecastDateRange(period: ForecastPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const today = new Date();
  
  switch (period) {
    case "rolling-12":
      return { start: today, end: addYears(today, 1) };
    case "calendar-year":
      return { start: today, end: endOfYear(today) };
    case "custom":
      return { start: customStart || today, end: customEnd || addYears(today, 1) };
    default:
      return { start: today, end: addYears(today, 1) };
  }
}

// Helper to get current counter value for maintenance projections
async function getCurrentCounterValue(aircraftId: string, counterType: CounterType): Promise<number | null> {
  const { data: counters } = await supabase
    .from("aircraft_counters")
    .select("*")
    .eq("aircraft_id", aircraftId)
    .single();

  if (!counters) return null;

  switch (counterType) {
    case "tach": return counters.tach;
    case "hobbs": return counters.hobbs;
    case "engine_total_time": return counters.engine_total_time;
    case "airframe_total_time": return counters.airframe_total_time;
    case "prop_total_time": return counters.prop_total_time;
    default: return null;
  }
}

export function OutlookInsight({ onBack, userId }: OutlookInsightProps) {
  const { selectedAircraft } = useAircraft();
  const { currency } = useUserCurrency(userId);
  
  // Controls
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>("rolling-12");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [counterType, setCounterType] = useState<CounterType>("tach");
  
  // Usage controls
  const [useManualUsage, setUseManualUsage] = useState(false);
  const [manualHoursPerMonth, setManualHoursPerMonth] = useState<string>("");
  
  // Data
  const [loading, setLoading] = useState(true);
  const [usageProjection, setUsageProjection] = useState<UsageProjection | null>(null);
  const [breakdown, setBreakdown] = useState<ForecastCostItem[]>([]);
  const [historicalCostPerHourByCategory, setHistoricalCostPerHourByCategory] = useState<Record<string, number>>({});

  const dateRange = useMemo(() => {
    return getForecastDateRange(forecastPeriod, customStartDate, customEndDate);
  }, [forecastPeriod, customStartDate, customEndDate]);

  const forecastMonths = useMemo(() => {
    return Math.max(1, differenceInMonths(dateRange.end, dateRange.start));
  }, [dateRange]);

  const forecastDays = useMemo(() => {
    return Math.max(1, differenceInDays(dateRange.end, dateRange.start));
  }, [dateRange]);

  const startDateStr = format(dateRange.start, "yyyy-MM-dd");
  const endDateStr = format(dateRange.end, "yyyy-MM-dd");

  // Calculate usage projection
  const calculateUsage = useCallback(async () => {
    if (!selectedAircraft?.id) return;

    // If manual mode and valid input, use that
    if (useManualUsage && manualHoursPerMonth) {
      const hpm = parseFloat(manualHoursPerMonth);
      if (!isNaN(hpm) && hpm >= 0) {
        setUsageProjection({
          hoursPerMonth: hpm,
          totalHours: hpm * forecastMonths,
          source: "manual",
          confidence: "high",
          explanation: "Based on your manual input",
        });
        return;
      }
    }

    try {
      const log = await fetchCounterLog(selectedAircraft.id, counterType);
      const usageRate = calculateUsageRate(log, 90);

      if (!usageRate || usageRate.rate <= 0) {
        setUsageProjection({
          hoursPerMonth: 0,
          totalHours: 0,
          source: "calculated",
          confidence: "low",
          explanation: "Insufficient usage data. Enter hours manually or record counter values.",
        });
        return;
      }

      // Convert rate per day to per month (avg 30.44 days/month)
      const hoursPerMonth = usageRate.rate * 30.44;

      setUsageProjection({
        hoursPerMonth: Math.round(hoursPerMonth * 10) / 10,
        totalHours: Math.round(hoursPerMonth * forecastMonths * 10) / 10,
        source: "calculated",
        confidence: usageRate.confidence,
        explanation: `Based on average usage from the last ${usageRate.windowDays} days`,
      });
    } catch (err) {
      console.error("Error calculating usage:", err);
      setUsageProjection(null);
    }
  }, [selectedAircraft?.id, counterType, useManualUsage, manualHoursPerMonth, forecastMonths]);

  // Fetch historical variable cost per hour by category (last 90 days)
  const fetchHistoricalCostPerHour = useCallback(async () => {
    if (!selectedAircraft?.id) return;

    const ninetyDaysAgo = format(addMonths(new Date(), -3), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");

    // Fetch variable transactions from last 90 days
    const { data: transactions } = await supabase
      .from("transactions")
      .select("category, amount")
      .eq("aircraft_id", selectedAircraft.id)
      .eq("status", "Posted")
      .eq("direction", "Debit")
      .in("category", VARIABLE_CATEGORIES)
      .gte("transaction_date", ninetyDaysAgo)
      .lte("transaction_date", today);

    if (!transactions || transactions.length === 0) {
      setHistoricalCostPerHourByCategory({});
      return;
    }

    // Group costs by category
    const costByCategory: Record<string, number> = {};
    transactions.forEach((tx) => {
      const cat = tx.category as string;
      costByCategory[cat] = (costByCategory[cat] || 0) + (tx.amount || 0);
    });

    // Get hours in last 90 days
    try {
      const log = await fetchCounterLog(selectedAircraft.id, counterType);
      const usageRate = calculateUsageRate(log, 90);

      if (usageRate && usageRate.rate > 0) {
        const hoursInPeriod = usageRate.rate * usageRate.windowDays;
        if (hoursInPeriod > 0) {
          // Calculate cost per hour for each category
          const perHourByCategory: Record<string, number> = {};
          for (const cat of Object.keys(costByCategory)) {
            perHourByCategory[cat] = costByCategory[cat] / hoursInPeriod;
          }
          setHistoricalCostPerHourByCategory(perHourByCategory);
          return;
        }
      }
    } catch (err) {
      console.error("Error calculating historical cost per hour:", err);
    }

    setHistoricalCostPerHourByCategory({});
  }, [selectedAircraft?.id, counterType]);

  // Fetch all forecast cost components
  const fetchForecastCosts = useCallback(async () => {
    if (!selectedAircraft?.id) return;

    const items: ForecastCostItem[] = [];

    // 1. COMMITMENTS (Fixed Costs) - fetch active subscriptions
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("aircraft_id", selectedAircraft.id)
      .or(`final_date.is.null,final_date.gte.${startDateStr}`);

    if (subscriptions) {
      subscriptions.forEach((sub) => {
        if (!sub.cost || sub.cost <= 0) return;

        const recurrenceMonths = getRecurrenceMonths(sub.recurrence);
        const subEnd = sub.final_date ? new Date(sub.final_date) : null;
        
        // Determine the effective date range for this commitment
        // Start: later of commitment initial_date or forecast start
        // End: earlier of commitment final_date or forecast end
        const effectiveStart = dateRange.start;
        const effectiveEnd = subEnd && subEnd < dateRange.end ? subEnd : dateRange.end;
        
        // Skip if commitment ends before forecast starts
        if (effectiveEnd < effectiveStart) return;
        
        // Calculate the prorated cost for the forecast period
        // Cost per month = (cost / recurrenceMonths)
        // Total = cost per month * months in effective period
        const effectiveDays = differenceInDays(effectiveEnd, effectiveStart);
        const effectiveMonths = effectiveDays / 30.44; // Average days per month
        
        // Monthly cost from this commitment
        const costPerMonth = sub.cost / recurrenceMonths;
        const proratedCost = costPerMonth * effectiveMonths;

        if (proratedCost > 0) {
          items.push({
            name: sub.subscription_name,
            amount: Math.round(proratedCost * 100) / 100,
            type: "commitment",
            category: "fixed",
          });
        }
      });
    }

    // 2. VARIABLE COSTS (Usage-based projection) - broken down by category
    if (usageProjection && usageProjection.totalHours > 0) {
      for (const category of VARIABLE_CATEGORIES) {
        const costPerHour = historicalCostPerHourByCategory[category] || 0;
        if (costPerHour > 0) {
          const projectedCost = costPerHour * usageProjection.totalHours;
          items.push({
            name: category,
            amount: Math.round(projectedCost * 100) / 100,
            type: "variable",
            category: "variable",
          });
        }
      }
    }

    // 3. RESERVES (Deferred Costs) - usage-based accrual projection
    const { data: reserves } = await supabase
      .from("reserves")
      .select("*")
      .eq("aircraft_id", selectedAircraft.id)
      .eq("status", "Active")
      .eq("include_in_cost_per_hour", true);

    if (reserves && usageProjection) {
      reserves.forEach((reserve) => {
        if (!reserve.expected_cost || reserve.expected_cost <= 0) return;

        if (reserve.basis_type === "Hours" && reserve.limit_hours) {
          // Usage-based reserve - accrue based on projected hours
          const costPerHour = reserve.expected_cost / reserve.limit_hours;
          const projectedAccrual = costPerHour * usageProjection.totalHours;

          if (projectedAccrual > 0) {
            items.push({
              name: `${reserve.title} Reserve`,
              amount: Math.round(projectedAccrual * 100) / 100,
              type: "reserve",
              category: "deferred",
            });
          }
        } else if (reserve.basis_type === "Calendar" && reserve.interval_value && reserve.interval_unit) {
          // Time-based reserve - amortize over forecast period
          const startDate = reserve.start_date || reserve.created_at?.split("T")[0];
          if (!startDate) return;

          const months = reserve.interval_unit === "Years" 
            ? reserve.interval_value * 12 
            : reserve.interval_value;
          
          const reserveEndDate = new Date(startDate);
          reserveEndDate.setMonth(reserveEndDate.getMonth() + months);

          const config: TimeBasedAmortization = {
            basis: "time",
            totalCost: reserve.expected_cost,
            startDate: startDate,
            endDate: format(reserveEndDate, "yyyy-MM-dd"),
          };

          const result = calculateTimeBasedAmortization(config, startDateStr, endDateStr);
          
          if (result && result.amortizedCost > 0) {
            items.push({
              name: `${reserve.title} Reserve`,
              amount: result.amortizedCost,
              type: "reserve",
              category: "deferred",
            });
          }
        }
      });
    }

    // 4. RECURRING MAINTENANCE - scheduled maintenance within forecast period
    const { data: maintenanceLogs } = await supabase
      .from("maintenance_logs")
      .select("*")
      .eq("aircraft_id", selectedAircraft.id)
      .eq("is_recurring_task", true);

    if (maintenanceLogs && usageProjection) {
      for (const log of maintenanceLogs) {
        const totalCost = log.total_cost || 0;
        if (totalCost <= 0) continue;

        let occurrences = 0;

        // Check date-based recurrence (Calendar or Mixed)
        if ((log.interval_type === "Calendar" || log.interval_type === "Mixed") && log.next_due_date) {
          const nextDue = new Date(log.next_due_date);
          
          // Count occurrences within forecast period
          if (nextDue >= dateRange.start && nextDue <= dateRange.end) {
            occurrences++;
            
            // Check for additional occurrences if interval_months is set
            if (log.interval_months && log.interval_months > 0) {
              let subsequentDue = addMonths(nextDue, log.interval_months);
              while (subsequentDue <= dateRange.end) {
                occurrences++;
                subsequentDue = addMonths(subsequentDue, log.interval_months);
              }
            }
          }
        }

        // Check counter-based recurrence (Hours or Mixed with counter)
        // Use recurrence_counter_type and recurrence_counter_increment fields
        if ((log.interval_type === "Hours" || log.interval_type === "Mixed") && 
            log.recurrence_counter_type && log.recurrence_counter_increment && log.recurrence_counter_increment > 0 &&
            usageProjection.hoursPerMonth > 0) {
          
          // Map recurrence_counter_type to CounterType for getting current value
          const counterTypeMap: Record<string, CounterType> = {
            "Hobbs": "hobbs",
            "Tach": "tach",
            "Airframe TT": "airframe_total_time",
            "Engine TT": "engine_total_time",
            "Prop TT": "prop_total_time",
          };
          const mappedCounterType = counterTypeMap[log.recurrence_counter_type] || counterType;
          const currentCounterValue = await getCurrentCounterValue(selectedAircraft.id, mappedCounterType);
          
          if (currentCounterValue !== null) {
            // Calculate next due value from the counter value at last maintenance + increment
            // Use tach_at_event for Tach, hobbs_at_event for Hobbs, etc.
            let lastPerformedValue: number | null = null;
            switch (log.recurrence_counter_type) {
              case "Hobbs": lastPerformedValue = log.hobbs_at_event; break;
              case "Tach": lastPerformedValue = log.tach_at_event; break;
              case "Airframe TT": lastPerformedValue = log.airframe_total_time; break;
              case "Engine TT": lastPerformedValue = log.engine_total_time; break;
              case "Prop TT": lastPerformedValue = log.prop_total_time; break;
            }
            
            if (lastPerformedValue !== null) {
              // Calculate first next due after last maintenance
              let nextDueCounter = lastPerformedValue + log.recurrence_counter_increment;
              
              // Count how many occurrences fall within the forecast based on projected usage
              while (nextDueCounter <= currentCounterValue + usageProjection.totalHours) {
                // Check if this occurrence is in the future (counter value > current)
                if (nextDueCounter > currentCounterValue) {
                  // Only count for Hours type to avoid double counting in Mixed
                  if (log.interval_type === "Hours") {
                    occurrences++;
                  }
                }
                nextDueCounter += log.recurrence_counter_increment;
              }
            }
          }
        }

        if (occurrences > 0) {
          // Counter-based (Hours) maintenance is variable - scales with usage
          // Calendar-based maintenance is fixed - time-driven regardless of usage
          // Mixed defaults to variable since it has a usage component
          const costCategory = log.interval_type === "Calendar" ? "fixed" : "variable";
          
          items.push({
            name: `${log.entry_title} (Scheduled)`,
            amount: Math.round(totalCost * occurrences * 100) / 100,
            type: "maintenance",
            category: costCategory,
          });
        }
      }
    }

    setBreakdown(items);
  }, [selectedAircraft?.id, startDateStr, endDateStr, dateRange, usageProjection, historicalCostPerHourByCategory, counterType]);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      if (!selectedAircraft?.id) return;
      
      setLoading(true);
      await Promise.all([calculateUsage(), fetchHistoricalCostPerHour()]);
      setLoading(false);
    };

    loadData();
  }, [calculateUsage, fetchHistoricalCostPerHour, selectedAircraft?.id]);

  // Fetch costs after usage is calculated
  useEffect(() => {
    if (usageProjection !== null && !loading) {
      fetchForecastCosts();
    }
  }, [usageProjection, fetchForecastCosts, loading]);

  // Computed values
  const { variableCost, fixedCost, deferredCost, totalCost, forecastedCostPerHour } = useMemo(() => {
    const variable = breakdown
      .filter((item) => item.category === "variable")
      .reduce((sum, item) => sum + item.amount, 0);
    
    const fixed = breakdown
      .filter((item) => item.category === "fixed")
      .reduce((sum, item) => sum + item.amount, 0);
    
    const deferred = breakdown
      .filter((item) => item.category === "deferred")
      .reduce((sum, item) => sum + item.amount, 0);

    const total = variable + fixed + deferred;
    const perHour = usageProjection && usageProjection.totalHours > 0 
      ? total / usageProjection.totalHours 
      : null;

    return {
      variableCost: variable,
      fixedCost: fixed,
      deferredCost: deferred,
      totalCost: total,
      forecastedCostPerHour: perHour,
    };
  }, [breakdown, usageProjection]);

  const chartData = useMemo(() => [
    { name: "Variable", amount: variableCost },
    { name: "Fixed", amount: fixedCost },
    { name: "Deferred", amount: deferredCost },
  ], [variableCost, fixedCost, deferredCost]);

  const assumptions = useMemo(() => {
    const list: string[] = [];
    
    if (usageProjection) {
      if (usageProjection.source === "manual") {
        list.push(`Usage forecast: ${usageProjection.hoursPerMonth} hours/month (manual input)`);
      } else {
        list.push(`Usage forecast: ${usageProjection.hoursPerMonth.toFixed(1)} hours/month (${usageProjection.explanation})`);
      }
    }
    
    const totalHistoricalCostPerHour = Object.values(historicalCostPerHourByCategory).reduce((sum, val) => sum + val, 0);
    if (totalHistoricalCostPerHour > 0) {
      list.push(`Variable costs derived from recent ${formatCurrency(totalHistoricalCostPerHour, currency)}/hr average`);
    }
    
    list.push("Commitment renewals assumed to continue at current rates");
    list.push("Recurring maintenance projected based on next due dates/hours");
    list.push("Reserve accruals calculated using straight-line method");
    
    return list;
  }, [usageProjection, historicalCostPerHourByCategory, currency]);

  const renderHeroSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Forecasted Cost per Hour - Hero */}
      <Card className="md:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Forecasted Cost per Hour</p>
          {forecastedCostPerHour !== null ? (
            <div className="mt-2">
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(forecastedCostPerHour, currency)}
                <span className="text-lg font-normal text-muted-foreground">/hr</span>
              </p>
              {usageProjection?.confidence === "low" && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Based on limited data
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No usage forecast</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Forecast Cost */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Forecast Cost</p>
          <p className="text-3xl font-semibold mt-2">{formatCurrency(totalCost, currency)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Over {forecastMonths} month{forecastMonths !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Projected Hours */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Projected Hours ({counterType.toUpperCase()})
          </p>
          {usageProjection && usageProjection.totalHours > 0 ? (
            <div className="mt-2">
              <p className="text-3xl font-semibold">{usageProjection.totalHours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {usageProjection.hoursPerMonth.toFixed(1)}/month ({usageProjection.source})
              </p>
            </div>
          ) : (
            <p className="text-2xl text-muted-foreground mt-2">—</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderChart = () => {
    if (totalCost === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No forecast costs calculated.</p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis tickFormatter={(v) => formatCurrency(v, currency)} fontSize={12} />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value, currency), "Amount"]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Bar dataKey="amount" name="Projected Cost" radius={[4, 4, 0, 0]}>
            <Cell fill={BREAKDOWN_COLORS.variable} />
            <Cell fill={BREAKDOWN_COLORS.fixed} />
            <Cell fill={BREAKDOWN_COLORS.deferred} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (breakdown.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No forecast costs calculated.</p>
        </div>
      );
    }

    // Group by category
    const variableItems = breakdown.filter((i) => i.category === "variable");
    const fixedItems = breakdown.filter((i) => i.category === "fixed");
    const deferredItems = breakdown.filter((i) => i.category === "deferred");

    const renderSection = (title: string, items: ForecastCostItem[], color: string) => {
      if (items.length === 0) return null;
      const sectionTotal = items.reduce((sum, i) => sum + i.amount, 0);

      return (
        <>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={2} className="font-semibold">
              <span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: color }} />
              {title}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {formatCurrency(sectionTotal, currency)}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {usageProjection && usageProjection.totalHours > 0 
                ? `${formatCurrency(sectionTotal / usageProjection.totalHours, currency)}/hr`
                : "—"}
            </TableCell>
          </TableRow>
          {items.map((item, idx) => (
            <TableRow key={`${item.name}-${idx}`}>
              <TableCell className="pl-8">{item.name}</TableCell>
              <TableCell>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  item.type === "commitment" && "bg-emerald-500/10 text-emerald-600",
                  item.type === "variable" && "bg-blue-500/10 text-blue-600",
                  item.type === "reserve" && "bg-amber-500/10 text-amber-600"
                )}>
                  {item.type === "commitment" ? "Commitment" : item.type === "variable" ? "Variable" : "Reserve"}
                </span>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.amount, currency)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {usageProjection && usageProjection.totalHours > 0 
                  ? `${formatCurrency(item.amount / usageProjection.totalHours, currency)}/hr`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </>
      );
    };

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Projected Cost</TableHead>
            <TableHead className="text-right">Per Hour</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderSection("Fixed (Commitments)", fixedItems, BREAKDOWN_COLORS.fixed)}
          {renderSection("Variable (Usage-Based)", variableItems, BREAKDOWN_COLORS.variable)}
          {renderSection("Deferred (Reserve Accruals)", deferredItems, BREAKDOWN_COLORS.deferred)}
          
          {/* Grand Total */}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={2}>Total Forecast</TableCell>
            <TableCell className="text-right">{formatCurrency(totalCost, currency)}</TableCell>
            <TableCell className="text-right">
              {forecastedCostPerHour !== null 
                ? `${formatCurrency(forecastedCostPerHour, currency)}/hr`
                : "—"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  const renderContent = (mode: DisplayMode) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Calculating forecast...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={forecastPeriod} onValueChange={(v) => setForecastPeriod(v as ForecastPeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Forecast period" />
            </SelectTrigger>
            <SelectContent>
              {FORECAST_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {forecastPeriod === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !customStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "MMM d, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !customEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "MMM d, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Select value={counterType} onValueChange={(v) => setCounterType(v as CounterType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Counter" />
            </SelectTrigger>
            <SelectContent>
              {COUNTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Usage Override Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Usage
                {useManualUsage && <span className="text-primary">(Manual)</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Usage Forecast Mode</Label>
                  <Select 
                    value={useManualUsage ? "manual" : "calculated"} 
                    onValueChange={(v) => setUseManualUsage(v === "manual")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calculated">Auto (from history)</SelectItem>
                      <SelectItem value="manual">Manual entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {useManualUsage && (
                  <div className="space-y-2">
                    <Label htmlFor="manual-hours">Hours per month</Label>
                    <Input
                      id="manual-hours"
                      type="number"
                      min="0"
                      step="0.1"
                      value={manualHoursPerMonth}
                      onChange={(e) => setManualHoursPerMonth(e.target.value)}
                      placeholder="e.g. 10"
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <span className="text-sm text-muted-foreground ml-auto">
            {format(dateRange.start, "MMM d, yyyy")} – {format(dateRange.end, "MMM d, yyyy")}
          </span>
        </div>

        {/* Low confidence warning */}
        {usageProjection?.confidence === "low" && usageProjection.source === "calculated" && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">Limited usage data</p>
              <p className="text-muted-foreground">{usageProjection.explanation}</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        {renderHeroSection()}

        {/* Breakdown Chart or Table */}
        <Card>
          <CardContent className="pt-6">
            {mode === "chart" ? renderChart() : renderTable()}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <InsightContainer
      title="Outlook"
      subtitle={`Forward projection through ${format(dateRange.end, "MMMM yyyy")}.`}
      dataType="projected"
      assumptions={assumptions}
      onBack={onBack}
    >
      {renderContent}
    </InsightContainer>
  );
}
