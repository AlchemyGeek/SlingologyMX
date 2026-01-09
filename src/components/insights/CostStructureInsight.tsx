import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subMonths, startOfYear, endOfMonth, startOfMonth, subYears } from "date-fns";
import { InsightContainer, DisplayMode } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAircraft } from "@/contexts/AircraftContext";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { formatCurrency } from "@/lib/currency";
import { Calendar as CalendarIcon, Plane, Clock, Wallet } from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { 
  fetchCounterLog, 
  CounterType, 
} from "@/lib/counterInterpolation";
import {
  calculateTimeBasedAmortization,
  calculateUsageBasedAmortization,
  TimeBasedAmortization,
  UsageBasedAmortization,
} from "@/lib/amortization";

interface CostStructureInsightProps {
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

const BREAKDOWN_COLORS = {
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

export function CostStructureInsight({ onBack, userId }: CostStructureInsightProps) {
  const { selectedAircraft } = useAircraft();
  const { currency } = useUserCurrency(userId);
  
  // Controls
  const [timeframe, setTimeframe] = useState<TimeframePeriod>("year-so-far");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [counterType, setCounterType] = useState<CounterType>("tach");
  
  // Data
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<CostBreakdownItem[]>([]);

  const dateRange = useMemo(() => {
    return getDateRange(timeframe, customStartDate, customEndDate);
  }, [timeframe, customStartDate, customEndDate]);

  const startDateStr = format(dateRange.start, "yyyy-MM-dd");
  const endDateStr = format(dateRange.end, "yyyy-MM-dd");

  // Fetch all cost components (same logic as True Cost)
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

    // 2. Fetch reserves and calculate accrued contributions
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
      await fetchCosts();
      setLoading(false);
    };

    loadData();
  }, [fetchCosts, selectedAircraft?.id]);

  // Computed values
  const { variableCost, fixedCost, deferredCost, totalCost, variablePercent, fixedPercent, deferredPercent } = useMemo(() => {
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
    
    return {
      variableCost: variable,
      fixedCost: fixed,
      deferredCost: deferred,
      totalCost: total,
      variablePercent: total > 0 ? (variable / total) * 100 : 0,
      fixedPercent: total > 0 ? (fixed / total) * 100 : 0,
      deferredPercent: total > 0 ? (deferred / total) * 100 : 0,
    };
  }, [breakdown]);

  const pieData = useMemo(() => [
    { name: "Fixed", value: fixedCost, percent: fixedPercent, color: BREAKDOWN_COLORS.fixed },
    { name: "Variable", value: variableCost, percent: variablePercent, color: BREAKDOWN_COLORS.variable },
    { name: "Deferred", value: deferredCost, percent: deferredPercent, color: BREAKDOWN_COLORS.deferred },
  ].filter(d => d.value > 0), [fixedCost, variableCost, deferredCost, fixedPercent, variablePercent, deferredPercent]);

  const assumptions = useMemo(() => [
    "Fixed costs: Subscriptions, hangar, insurance, non-fuel transactions",
    "Variable costs: Fuel, oil & consumables, travel",
    "Deferred costs: Reserve accruals for future overhauls",
    "Classification based on transaction category and source",
  ], []);

  // Proportional blocks with explanatory annotations
  const renderProportionCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Fixed Costs */}
      <Card className="border-l-4" style={{ borderLeftColor: BREAKDOWN_COLORS.fixed }}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium uppercase tracking-wide">Fixed Costs</p>
          </div>
          <p className="text-4xl font-bold" style={{ color: BREAKDOWN_COLORS.fixed }}>
            {fixedPercent.toFixed(0)}%
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {formatCurrency(fixedCost, currency, { decimals: false })}
          </p>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Costs that exist even if you don't fly
          </p>
        </CardContent>
      </Card>

      {/* Variable Costs */}
      <Card className="border-l-4" style={{ borderLeftColor: BREAKDOWN_COLORS.variable }}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium uppercase tracking-wide">Variable Costs</p>
          </div>
          <p className="text-4xl font-bold" style={{ color: BREAKDOWN_COLORS.variable }}>
            {variablePercent.toFixed(0)}%
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {formatCurrency(variableCost, currency, { decimals: false })}
          </p>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Costs that scale with flying
          </p>
        </CardContent>
      </Card>

      {/* Deferred Costs */}
      <Card className="border-l-4" style={{ borderLeftColor: BREAKDOWN_COLORS.deferred }}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium uppercase tracking-wide">Deferred Costs</p>
          </div>
          <p className="text-4xl font-bold" style={{ color: BREAKDOWN_COLORS.deferred }}>
            {deferredPercent.toFixed(0)}%
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {formatCurrency(deferredCost, currency, { decimals: false })}
          </p>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Future wear you are accumulating
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderChart = () => {
    if (totalCost === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No costs recorded for this period.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${percent.toFixed(0)}%`}
              labelLine={true}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value, currency), name]}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

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

    const renderSection = (title: string, items: CostBreakdownItem[], color: string, sectionPercent: number) => {
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
              {sectionPercent.toFixed(1)}%
            </TableCell>
            <TableCell className="text-right font-semibold">
              {formatCurrency(sectionTotal, currency)}
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderSection("Fixed (Time-Independent)", fixedItems, BREAKDOWN_COLORS.fixed, fixedPercent)}
          {renderSection("Variable (Usage-Dependent)", variableItems, BREAKDOWN_COLORS.variable, variablePercent)}
          {renderSection("Deferred (Future Wear)", deferredItems, BREAKDOWN_COLORS.deferred, deferredPercent)}
          
          {/* Grand Total */}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right">100%</TableCell>
            <TableCell className="text-right">{formatCurrency(totalCost, currency)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  const renderContent = (mode: DisplayMode) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Loading cost structure...</p>
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

        {/* Proportion Cards with Explanatory Annotations */}
        {renderProportionCards()}

        {/* Chart or Table */}
        <Card>
          <CardContent className="pt-6">
            {mode === "chart" ? renderChart() : renderTable()}
          </CardContent>
        </Card>

        {/* Insight Summary */}
        {totalCost > 0 && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">What This Means</h4>
              <div className="space-y-2 text-sm">
                {fixedPercent > 0 && (
                  <p>
                    <strong>{fixedPercent.toFixed(0)}%</strong> of your costs exist even if you don't fly.
                    {fixedPercent > 50 && " Consider flying more to spread fixed costs."}
                  </p>
                )}
                {variablePercent > 0 && (
                  <p>
                    <strong>{variablePercent.toFixed(0)}%</strong> of your costs scale with how much you fly.
                    {variablePercent > 50 && " Variable costs dominate—fuel efficiency matters."}
                  </p>
                )}
                {deferredPercent > 0 && (
                  <p>
                    <strong>{deferredPercent.toFixed(0)}%</strong> represents future wear you're accumulating.
                    {deferredPercent > 30 && " Reserve funding is significant—plan ahead."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <InsightContainer
      title="Cost Structure"
      subtitle="What kind of costs your aircraft has and how they behave."
      dataType="modeled"
      assumptions={assumptions}
      onBack={onBack}
    >
      {renderContent}
    </InsightContainer>
  );
}