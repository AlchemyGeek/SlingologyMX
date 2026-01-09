import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subMonths, startOfYear, endOfMonth, startOfMonth, subYears } from "date-fns";
import { InsightContainer } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAircraft } from "@/contexts/AircraftContext";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { formatCurrency } from "@/lib/currency";
import { Calendar as CalendarIcon, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  fetchCounterLog, 
  getCounterValue, 
  CounterType, 
  CounterResult 
} from "@/lib/counterInterpolation";
import {
  calculateTimeBasedAmortization,
  calculateUsageBasedAmortization,
  TimeBasedAmortization,
  UsageBasedAmortization,
} from "@/lib/amortization";

interface TrueCostInsightProps {
  onBack: () => void;
  userId: string;
}

type TimeframePeriod = "last-month" | "last-quarter" | "last-6-months" | "year-so-far" | "last-year" | "custom";

interface CostBreakdownItem {
  name: string;
  amount: number;
  type: "actual" | "amortized" | "reserve_accrual";
  category: "variable" | "fixed" | "deferred";
}

interface HoursData {
  hours: number;
  startValue: number;
  endValue: number;
  startResult: CounterResult;
  endResult: CounterResult;
  isProjected: boolean;
}

const TIMEFRAME_OPTIONS = [
  { value: "last-month", label: "Last Month" },
  { value: "last-quarter", label: "Last Quarter" },
  { value: "last-6-months", label: "Last 6 Months" },
  { value: "year-so-far", label: "Year So Far" },
  { value: "last-year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

const COUNTER_OPTIONS: { value: CounterType; label: string }[] = [
  { value: "tach", label: "Tach" },
  { value: "hobbs", label: "Hobbs" },
  { value: "engine_total_time", label: "Engine TT" },
  { value: "airframe_total_time", label: "Airframe TT" },
];

// Variable cost categories - from transactions
const VARIABLE_CATEGORIES = ["Fuel", "Oil & Consumables", "Travel"];

// Fixed cost categories - typically amortized
const FIXED_COMMITMENT_TYPES = [
  "Facilities & Storage",
  "Insurance",
  "Avionics Data & Services",
  "Navigation, Charts & Flight Planning",
  "Weather Services",
  "Maintenance, Compliance & Records",
  "Hardware Services & Fees",
  "Training & Proficiency",
  "Memberships & Associations",
  "Publications & Media",
  "Operations & Administration",
];

const CATEGORY_COLORS = {
  variable: "hsl(220, 70%, 50%)",
  fixed: "hsl(160, 70%, 50%)",
  deferred: "hsl(30, 70%, 50%)",
};

function getDateRange(period: TimeframePeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const today = new Date();
  
  switch (period) {
    case "last-month": {
      const lastMonth = subMonths(today, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "last-quarter":
      return { start: subMonths(today, 3), end: today };
    case "last-6-months":
      return { start: subMonths(today, 6), end: today };
    case "year-so-far":
      return { start: startOfYear(today), end: today };
    case "last-year": {
      const lastYear = subYears(today, 1);
      return { start: startOfYear(lastYear), end: new Date(lastYear.getFullYear(), 11, 31) };
    }
    case "custom":
      return { start: customStart || subMonths(today, 1), end: customEnd || today };
    default:
      return { start: startOfYear(today), end: today };
  }
}

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

export function TrueCostInsight({ onBack, userId }: TrueCostInsightProps) {
  const { selectedAircraft } = useAircraft();
  const { currency } = useUserCurrency(userId);
  
  // Controls
  const [timeframe, setTimeframe] = useState<TimeframePeriod>("year-so-far");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [counterType, setCounterType] = useState<CounterType>("tach");
  
  // Data
  const [loading, setLoading] = useState(true);
  const [hoursData, setHoursData] = useState<HoursData | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdownItem[]>([]);

  const dateRange = useMemo(() => {
    return getDateRange(timeframe, customStartDate, customEndDate);
  }, [timeframe, customStartDate, customEndDate]);

  const startDateStr = format(dateRange.start, "yyyy-MM-dd");
  const endDateStr = format(dateRange.end, "yyyy-MM-dd");

  // Fetch hours from counter
  const fetchHours = useCallback(async () => {
    if (!selectedAircraft?.id) return;

    try {
      const log = await fetchCounterLog(selectedAircraft.id, counterType);
      
      console.log("[TrueCost] Counter log entries:", log.entries.length, "for", counterType);
      console.log("[TrueCost] Date range:", startDateStr, "to", endDateStr);
      console.log("[TrueCost] First entry:", log.entries[0]);
      console.log("[TrueCost] Last entry:", log.entries[log.entries.length - 1]);
      
      if (log.entries.length === 0) {
        setHoursError("No counter data available. Please record counter values to enable cost per hour calculations.");
        setHoursData(null);
        return;
      }

      let startResult = getCounterValue(log, startDateStr);
      let endResult = getCounterValue(log, endDateStr);

      console.log("[TrueCost] startResult:", startResult);
      console.log("[TrueCost] endResult:", endResult);

      // If start date is before first entry, use first entry as start
      const firstEntry = log.entries[0];
      if (!startResult && firstEntry && startDateStr < firstEntry.date) {
        startResult = {
          value: firstEntry.value,
          type: "actual",
          confidence: "high",
          explanation: `First recorded value on ${firstEntry.date} (counter history starts after selected period start)`,
        };
        console.log("[TrueCost] Using first entry as start fallback:", startResult);
      }

      // If end date is after last entry, extrapolate or use last entry
      const lastEntry = log.entries[log.entries.length - 1];
      if (!endResult && lastEntry && endDateStr > lastEntry.date) {
        // This shouldn't happen as getCounterValue handles extrapolation, but let's log it
        console.log("[TrueCost] End date after last entry, extrapolation should have worked");
      }

      if (!startResult) {
        setHoursError(`Cannot determine ${counterType.toUpperCase()} value at period start (${startDateStr}). Please record counter values covering this date.`);
        setHoursData(null);
        return;
      }

      if (!endResult) {
        setHoursError(`Cannot determine ${counterType.toUpperCase()} value at period end (${endDateStr}). The counter history may not extend to this date.`);
        setHoursData(null);
        return;
      }

      const hours = endResult.value - startResult.value;

      if (hours <= 0) {
        setHoursError(`No flight hours recorded in this period (${counterType.toUpperCase()}: ${startResult.value.toFixed(1)} → ${endResult.value.toFixed(1)})`);
        setHoursData(null);
        return;
      }

      const isProjected = startResult.type === "extrapolated" || endResult.type === "extrapolated";

      setHoursData({
        hours,
        startValue: startResult.value,
        endValue: endResult.value,
        startResult,
        endResult,
        isProjected,
      });
      setHoursError(null);
    } catch (err) {
      console.error("Error fetching hours:", err);
      setHoursError("Error loading counter data.");
      setHoursData(null);
    }
  }, [selectedAircraft?.id, counterType, startDateStr, endDateStr]);

  // Fetch all cost components
  const fetchCosts = useCallback(async () => {
    if (!selectedAircraft?.id) return;

    const items: CostBreakdownItem[] = [];

    // 1. Fetch transactions - separate handling for amortized vs non-amortized
    // 1a. Non-amortized transactions within the period
    const { data: regularTransactions } = await supabase
      .from("transactions")
      .select("category, amount")
      .eq("aircraft_id", selectedAircraft.id)
      .eq("status", "Posted")
      .eq("direction", "Debit")
      .eq("allocate_over_time", false)
      .gte("transaction_date", startDateStr)
      .lte("transaction_date", endDateStr);

    // 1b. Amortized transactions - fetch those whose allocation window overlaps analysis period
    const { data: amortizedTransactions } = await supabase
      .from("transactions")
      .select("title, category, amount, allocation_start_date, allocation_end_date")
      .eq("aircraft_id", selectedAircraft.id)
      .eq("status", "Posted")
      .eq("direction", "Debit")
      .eq("allocate_over_time", true)
      .not("allocation_start_date", "is", null)
      .not("allocation_end_date", "is", null)
      .lte("allocation_start_date", endDateStr)
      .gte("allocation_end_date", startDateStr);

    // Process regular transactions
    const categoryTotals = new Map<string, number>();
    if (regularTransactions) {
      regularTransactions.forEach((tx) => {
        const existing = categoryTotals.get(tx.category) || 0;
        categoryTotals.set(tx.category, existing + (tx.amount || 0));
      });
    }

    // Process amortized transactions
    if (amortizedTransactions) {
      amortizedTransactions.forEach((tx) => {
        if (!tx.amount || !tx.allocation_start_date || !tx.allocation_end_date) return;
        
        const config: TimeBasedAmortization = {
          basis: "time",
          totalCost: tx.amount,
          startDate: tx.allocation_start_date,
          endDate: tx.allocation_end_date,
        };

        const result = calculateTimeBasedAmortization(config, startDateStr, endDateStr);
        
        if (result && result.amortizedCost > 0) {
          const existing = categoryTotals.get(tx.category) || 0;
          categoryTotals.set(tx.category, existing + result.amortizedCost);
        }
      });
    }

    categoryTotals.forEach((amount, category) => {
      const isVariable = VARIABLE_CATEGORIES.includes(category);
      items.push({
        name: category,
        amount: Math.round(amount * 100) / 100,
        type: "actual",
        category: isVariable ? "variable" : "fixed",
      });
    });

    // NOTE: Commitments (subscriptions) are NOT included in True Cost analysis.
    // True Cost is backward-looking and should use actual transactions only.
    // Commitments either auto-generate transactions or are manually entered as transactions.
    // Commitments are used in future-looking insights like Year-End Outlook.

    // 3. Fetch reserves and calculate accrued contributions
    const { data: reserves } = await supabase
      .from("reserves")
      .select("*")
      .eq("aircraft_id", selectedAircraft.id)
      .eq("status", "Active")
      .eq("include_in_cost_per_hour", true);

    if (reserves) {
      const counterLog = await fetchCounterLog(selectedAircraft.id, counterType);

      reserves.forEach((reserve) => {
        if (!reserve.expected_cost || reserve.expected_cost <= 0) return;
        
        if (reserve.basis_type === "Hours" && reserve.limit_hours && reserve.start_counter_value !== null) {
          // Usage-based reserve
          const config: UsageBasedAmortization = {
            basis: "usage",
            totalCost: reserve.expected_cost,
            startCounterValue: reserve.start_counter_value,
            endCounterValue: reserve.start_counter_value + reserve.limit_hours,
          };

          const result = calculateUsageBasedAmortization(config, startDateStr, endDateStr, counterLog);
          
          if (result && result.amortizedCost > 0) {
            items.push({
              name: `${reserve.title} Reserve`,
              amount: result.amortizedCost,
              type: "reserve_accrual",
              category: "deferred",
            });
          }
        } else if (reserve.basis_type === "Calendar" && reserve.interval_value && reserve.interval_unit) {
          // Time-based reserve
          const startDate = reserve.start_date || reserve.created_at?.split("T")[0];
          if (!startDate) return;

          const months = reserve.interval_unit === "Years" 
            ? reserve.interval_value * 12 
            : reserve.interval_value;
          
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + months);

          const config: TimeBasedAmortization = {
            basis: "time",
            totalCost: reserve.expected_cost,
            startDate: startDate,
            endDate: format(endDate, "yyyy-MM-dd"),
          };

          const result = calculateTimeBasedAmortization(config, startDateStr, endDateStr);
          
          if (result && result.amortizedCost > 0) {
            items.push({
              name: `${reserve.title} Reserve`,
              amount: result.amortizedCost,
              type: "reserve_accrual",
              category: "deferred",
            });
          }
        }
      });
    }

    setBreakdown(items);
  }, [selectedAircraft?.id, startDateStr, endDateStr, counterType]);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      if (!selectedAircraft?.id) return;
      
      setLoading(true);
      await Promise.all([fetchHours(), fetchCosts()]);
      setLoading(false);
    };

    loadData();
  }, [fetchHours, fetchCosts, selectedAircraft?.id]);

  // Computed values
  const { variableCost, fixedCost, deferredCost, totalCost, trueCostPerHour } = useMemo(() => {
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
    const perHour = hoursData && hoursData.hours > 0 ? total / hoursData.hours : null;

    return {
      variableCost: variable,
      fixedCost: fixed,
      deferredCost: deferred,
      totalCost: total,
      trueCostPerHour: perHour,
    };
  }, [breakdown, hoursData]);


  const assumptions = useMemo(() => {
    const list = [
      "Commitments are amortized based on their recurrence period",
      "Reserve accruals are calculated using straight-line method",
      `Flight hours derived from ${counterType.toUpperCase()} counter changes`,
    ];
    if (hoursData?.isProjected) {
      list.push("Hours include projected values based on recent usage rates");
    }
    return list;
  }, [counterType, hoursData?.isProjected]);

  const renderHeroSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* True Cost per Hour - Hero */}
      <Card className="md:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">True Cost per Hour</p>
          {trueCostPerHour !== null ? (
            <div className="mt-2">
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(trueCostPerHour, currency)}
                <span className="text-lg font-normal text-muted-foreground">/hr</span>
              </p>
              {hoursData?.isProjected && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Includes projected hours
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Cannot calculate</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Cost */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">All-In Total Cost</p>
          <p className="text-3xl font-semibold mt-2">{formatCurrency(totalCost, currency)}</p>
        </CardContent>
      </Card>

      {/* Hours */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Hours ({counterType.toUpperCase()})
          </p>
          {hoursData && !isNaN(hoursData.hours) ? (
            <div className="mt-2">
              <p className="text-3xl font-semibold">{hoursData.hours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {!isNaN(hoursData.startValue) ? hoursData.startValue.toFixed(1) : "?"} → {!isNaN(hoursData.endValue) ? hoursData.endValue.toFixed(1) : "?"}
                {hoursData.startResult.type !== "actual" && ` (${hoursData.startResult.type})`}
              </p>
            </div>
          ) : (
            <p className="text-2xl text-muted-foreground mt-2">—</p>
          )}
        </CardContent>
      </Card>
    </div>
  );


  const renderTable = () => {
    if (breakdown.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No costs recorded for this period.</p>
        </div>
      );
    }

    // Group by category
    const variableItems = breakdown.filter((i) => i.category === "variable");
    const fixedItems = breakdown.filter((i) => i.category === "fixed");
    const deferredItems = breakdown.filter((i) => i.category === "deferred");

    const renderSection = (title: string, items: CostBreakdownItem[], color: string) => {
      if (items.length === 0) return null;
      const sectionTotal = items.reduce((sum, i) => sum + i.amount, 0);

      return (
        <>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={3} className="font-semibold">
              <span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: color }} />
              {title}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {formatCurrency(sectionTotal, currency)}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {hoursData && hoursData.hours > 0 
                ? `${formatCurrency(sectionTotal / hoursData.hours, currency)}/hr`
                : "—"}
            </TableCell>
          </TableRow>
          {items.map((item, idx) => (
            <TableRow key={`${item.name}-${idx}`}>
              <TableCell className="pl-8">{item.name}</TableCell>
              <TableCell>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  item.type === "actual" && "bg-emerald-500/10 text-emerald-600",
                  item.type === "amortized" && "bg-amber-500/10 text-amber-600",
                  item.type === "reserve_accrual" && "bg-blue-500/10 text-blue-600"
                )}>
                  {item.type === "actual" ? "Actual" : item.type === "amortized" ? "Amortized" : "Reserve"}
                </span>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {totalCost > 0 ? ((item.amount / totalCost) * 100).toFixed(1) : 0}%
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.amount, currency)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {hoursData && hoursData.hours > 0 
                  ? `${formatCurrency(item.amount / hoursData.hours, currency)}/hr`
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
            <TableHead className="text-right">% of Total</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Per Hour</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderSection("Variable (Actual Transactions)", variableItems, CATEGORY_COLORS.variable)}
          {renderSection("Fixed (Time-Based Amortized)", fixedItems, CATEGORY_COLORS.fixed)}
          {renderSection("Deferred (Usage-Based Reserves)", deferredItems, CATEGORY_COLORS.deferred)}
          
          {/* Grand Total */}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={3}>Total (All-In)</TableCell>
            <TableCell className="text-right">{formatCurrency(totalCost, currency)}</TableCell>
            <TableCell className="text-right">
              {trueCostPerHour !== null 
                ? `${formatCurrency(trueCostPerHour, currency)}/hr`
                : "—"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Loading cost data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as TimeframePeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {timeframe === "custom" && (
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

          <span className="text-sm text-muted-foreground ml-auto">
            {format(dateRange.start, "MMM d, yyyy")} – {format(dateRange.end, "MMM d, yyyy")}
          </span>
        </div>

        {/* Hours Error Banner */}
        {hoursError && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">{hoursError}</p>
          </div>
        )}

        {/* Hero Section */}
        {renderHeroSection()}

        {/* Breakdown Chart or Table */}
        <Card>
          <CardContent className="pt-6">
            {renderTable()}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <InsightContainer
      title="True Cost"
      subtitle="All-inclusive cost per flight hour."
      dataType="modeled"
      assumptions={assumptions}
      onBack={onBack}
      showDisplayToggle={false}
    >
      {() => renderContent()}
    </InsightContainer>
  );
}
