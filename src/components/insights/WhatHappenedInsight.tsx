import { useState, useEffect, useMemo } from "react";
import { format, subMonths, subDays, startOfYear, startOfMonth, endOfMonth, subYears } from "date-fns";
import { InsightContainer, DisplayMode } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAircraft } from "@/contexts/AircraftContext";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { formatCurrency } from "@/lib/currency";
import { Calendar as CalendarIcon } from "lucide-react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rollupCategory } from "@/lib/insightCategories";

interface WhatHappenedInsightProps {
  onBack: () => void;
  userId: string;
}

interface CategoryData {
  category: string;
  amount: number;
  count: number;
}

type TimeframePeriod = "last-month" | "last-quarter" | "last-6-months" | "year-so-far" | "last-year" | "custom";

const CATEGORY_COLORS: Record<string, string> = {
  "Fuel": "hsl(220, 70%, 50%)",
  "Oil & Consumables": "hsl(200, 70%, 50%)",
  "Hangar / Tie-Down": "hsl(180, 70%, 50%)",
  "Insurance": "hsl(160, 70%, 50%)",
  "Avionics": "hsl(140, 70%, 50%)",
  "Maintenance": "hsl(30, 70%, 50%)",
  "Training": "hsl(280, 70%, 50%)",
  "Travel": "hsl(300, 70%, 50%)",
  "Tools & Equipment": "hsl(320, 70%, 50%)",
  "Other": "hsl(0, 0%, 50%)",
};

const TIMEFRAME_OPTIONS = [
  { value: "last-month", label: "Last Month" },
  { value: "last-quarter", label: "Last Quarter" },
  { value: "last-6-months", label: "Last 6 Months" },
  { value: "year-so-far", label: "Year So Far" },
  { value: "last-year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

function getDateRange(period: TimeframePeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const today = new Date();
  
  switch (period) {
    case "last-month": {
      const lastMonth = subMonths(today, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    }
    case "last-quarter":
      return {
        start: subMonths(today, 3),
        end: today,
      };
    case "last-6-months":
      return {
        start: subMonths(today, 6),
        end: today,
      };
    case "year-so-far":
      return {
        start: startOfYear(today),
        end: today,
      };
    case "last-year": {
      const lastYear = subYears(today, 1);
      return {
        start: startOfYear(lastYear),
        end: new Date(lastYear.getFullYear(), 11, 31),
      };
    }
    case "custom":
      return {
        start: customStart || subMonths(today, 1),
        end: customEnd || today,
      };
    default:
      return {
        start: startOfYear(today),
        end: today,
      };
  }
}

export function WhatHappenedInsight({ onBack, userId }: WhatHappenedInsightProps) {
  const { selectedAircraft } = useAircraft();
  const { currency } = useUserCurrency(userId);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeframePeriod>("year-so-far");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const dateRange = useMemo(() => {
    return getDateRange(timeframe, customStartDate, customEndDate);
  }, [timeframe, customStartDate, customEndDate]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedAircraft?.id) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("aircraft_id", selectedAircraft.id)
        .eq("status", "Posted")
        .eq("direction", "Debit")
        .gte("transaction_date", format(dateRange.start, "yyyy-MM-dd"))
        .lte("transaction_date", format(dateRange.end, "yyyy-MM-dd"));

      if (!error && data) {
        setTransactions(data);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [selectedAircraft?.id, dateRange]);

  const { categoryData, totalCost, transactionCount } = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    transactions.forEach((tx) => {
      const cat = rollupCategory(tx.category);
      const existing = categoryMap.get(cat) || { amount: 0, count: 0 };
      categoryMap.set(cat, {
        amount: existing.amount + (tx.amount || 0),
        count: existing.count + 1,
      });
    });

    const data: CategoryData[] = Array.from(categoryMap.entries())
      .map(([category, { amount, count }]) => ({
        category,
        amount,
        count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = data.reduce((sum, item) => sum + item.amount, 0);
    const count = transactions.length;

    return { categoryData: data, totalCost: total, transactionCount: count };
  }, [transactions]);

  const renderChart = () => {
    if (categoryData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No posted transactions in this period.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Try selecting a different timeframe or mark transactions as "Posted".
          </p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={Math.max(300, categoryData.length * 50)}>
        <BarChart
          data={categoryData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCurrency(value, currency)}
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={90}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value, currency), "Amount"]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {categoryData.map((entry) => (
              <Cell
                key={entry.category}
                fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS["Other"]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (categoryData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No posted transactions in this period.</p>
        </div>
      );
    }

    return (
      <Table className="min-w-[520px] text-xs sm:text-sm [&_th]:px-2 [&_td]:p-2 sm:[&_th]:px-4 sm:[&_td]:p-4">
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">% of Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categoryData.map((row) => (
            <TableRow key={row.category}>
              <TableCell className="font-medium">{row.category}</TableCell>
              <TableCell className="text-right text-muted-foreground">{row.count}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.amount, currency)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {totalCost > 0 ? ((row.amount / totalCost) * 100).toFixed(1) : 0}%
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold border-t-2">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">{transactionCount}</TableCell>
            <TableCell className="text-right">{formatCurrency(totalCost, currency)}</TableCell>
            <TableCell className="text-right">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  const renderContent = (mode: DisplayMode) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Timeframe Selector */}
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
                    className={cn("p-3 pointer-events-auto")}
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
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <span className="text-sm text-muted-foreground ml-auto">
            {format(dateRange.start, "MMM d, yyyy")} – {format(dateRange.end, "MMM d, yyyy")}
          </span>
        </div>

        {/* Summary Numbers */}
        <div className="flex gap-6">
          <Card className="flex-1">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Spent</p>
              <p className="text-3xl font-semibold mt-1">{formatCurrency(totalCost, currency, { decimals: false })}</p>
            </CardContent>
          </Card>
          <Card className="w-40">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Transactions</p>
              <p className="text-3xl font-semibold mt-1">{transactionCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Primary Visualization */}
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
      title="What Happened"
      subtitle="Historical costs based on actual recorded transactions."
      dataType="actual"
      onBack={onBack}
    >
      {renderContent}
    </InsightContainer>
  );
}
