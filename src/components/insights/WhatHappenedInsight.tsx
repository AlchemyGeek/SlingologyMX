import { useState, useEffect, useMemo } from "react";
import { InsightContainer, DisplayMode } from "./InsightContainer";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAircraft } from "@/contexts/AircraftContext";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { formatCurrency } from "@/lib/currency";
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

interface WhatHappenedInsightProps {
  onBack: () => void;
  userId: string;
}

interface CategoryData {
  category: string;
  amount: number;
  count: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Fuel": "hsl(220, 70%, 50%)",
  "Oil & Consumables": "hsl(200, 70%, 50%)",
  "Hangar / Tie-Down": "hsl(180, 70%, 50%)",
  "Insurance": "hsl(160, 70%, 50%)",
  "Avionics": "hsl(140, 70%, 50%)",
  "Maintenance Labor": "hsl(30, 70%, 50%)",
  "Maintenance Parts": "hsl(50, 70%, 50%)",
  "Training": "hsl(280, 70%, 50%)",
  "Travel": "hsl(300, 70%, 50%)",
  "Tools & Equipment": "hsl(320, 70%, 50%)",
  "Other": "hsl(0, 0%, 50%)",
};

export function WhatHappenedInsight({ onBack, userId }: WhatHappenedInsightProps) {
  const { selectedAircraft } = useAircraft();
  const { currency } = useUserCurrency(userId);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedAircraft?.id) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("aircraft_id", selectedAircraft.id)
        .eq("status", "Posted")
        .eq("direction", "Debit");

      if (!error && data) {
        setTransactions(data);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [selectedAircraft?.id]);

  const { categoryData, totalCost, transactionCount } = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    transactions.forEach((tx) => {
      const existing = categoryMap.get(tx.category) || { amount: 0, count: 0 };
      categoryMap.set(tx.category, {
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
          <p className="text-muted-foreground">No posted transactions found.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Record transactions and mark them as "Posted" to see your spending breakdown.
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
          <p className="text-muted-foreground">No posted transactions found.</p>
        </div>
      );
    }

    return (
      <Table>
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
        {/* Summary Numbers */}
        <div className="flex gap-6">
          <Card className="flex-1">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Total Spent</p>
              <p className="text-3xl font-semibold mt-1">{formatCurrency(totalCost, currency)}</p>
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
