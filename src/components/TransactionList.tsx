import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, Search, X, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { useIsMobile } from "@/hooks/use-mobile";
import { Constants } from "@/integrations/supabase/types";
import ExcelJS from "exceljs";

const TRANSACTION_CATEGORIES = Constants.public.Enums.transaction_category;
const TRANSACTION_STATUSES = Constants.public.Enums.transaction_status;

interface TransactionListProps {
  transactions: any[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (transaction: any) => void;
  onSelect: (transaction: any) => void;
  userCurrency?: string;
  initialStatusFilter?: string;
  onClearStatusFilter?: () => void;
}

const TransactionList = ({ transactions, loading, onUpdate, onEdit, onSelect, userCurrency = "USD", initialStatusFilter, onClearStatusFilter }: TransactionListProps) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || "all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "title" | "category">("date");

  // Apply externally-driven status filter (e.g. from header bell)
  useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        const matchesSearch = searchTerm === "" || 
          transaction.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        }
        if (sortBy === "amount") {
          return Math.abs(b.amount) - Math.abs(a.amount);
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "category") {
          return a.category.localeCompare(b.category);
        }
        return 0;
      });
  }, [transactions, searchTerm, categoryFilter, statusFilter, sortBy]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Transaction deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete transaction");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: newStatus as typeof TRANSACTION_STATUSES[number] })
        .eq("id", id);
      if (error) throw error;
      toast.success("Status updated");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const handleExportExcel = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const exportData = filteredTransactions.map((t, index) => ({
      "ID": `TXN-${parseLocalDate(t.transaction_date).toISOString().slice(2, 10).replace(/-/g, "")}-${String(index + 1).padStart(3, "0")}`,
      "Date": parseLocalDate(t.transaction_date).toLocaleDateString(),
      "Title": t.title,
      "Amount": Number(t.amount).toFixed(2),
      "Currency": t.currency?.trim() || "USD",
      "Direction": t.direction,
      "Intent": t.intent,
      "Category": t.category,
      "Status": t.status,
      "Source": t.source,
      "Tags": t.tags?.join(", ") || "",
      "Notes": t.notes || "",
      "Include in Cash Flow": t.include_in_cash_flow ? "Yes" : "No",
      "Include in Ownership Total": t.include_in_ownership_total ? "Yes" : "No",
      "Include in Cost-Per-Hour": t.include_in_cost_per_hour ? "Yes" : "No",
      "Allocate Over Time": t.allocate_over_time ? "Yes" : "No",
      "Allocation Method": t.allocation_method || "",
      "Allocation Period": t.allocation_period_value && t.allocation_period_unit 
        ? `${t.allocation_period_value} ${t.allocation_period_unit}` 
        : "",
      "Hobbs Hours": t.hobbs_hours ?? "",
      "Tach Hours": t.tach_hours ?? "",
      "Flight Time Hours": t.flight_time_hours ?? "",
      "Block Time Hours": t.block_time_hours ?? "",
      "Created At": t.created_at ? new Date(t.created_at).toLocaleString() : "",
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Transactions");
    if (exportData.length > 0) {
      worksheet.columns = Object.keys(exportData[0]).map(key => ({ header: key, key }));
      exportData.forEach(row => worksheet.addRow(row));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredTransactions.length} transactions`);
  };

  const getDirectionColor = (direction: string) => {
    return direction === "Credit" ? "text-green-600" : "text-foreground";
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Posted": return "default";
      case "Pending": return "secondary";
      case "Voided": return "destructive";
      case "Skipped": return "outline";
      default: return "secondary";
    }
  };

  const hasActiveFilters = searchTerm !== "" || categoryFilter !== "all" || statusFilter !== "all" || sortBy !== "date";

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortBy("date");
    onClearStatusFilter?.();
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading transactions...</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-muted-foreground">No transactions yet. Create your first one!</p>;
  }

  return (
    <div className="space-y-4">
      {initialStatusFilter && statusFilter === initialStatusFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            Showing {initialStatusFilter.toLowerCase()} only
            <button
              type="button"
              aria-label="Clear status filter"
              onClick={() => { setStatusFilter("all"); onClearStatusFilter?.(); }}
              className="ml-1 hover:opacity-80"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}
      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TRANSACTION_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TRANSACTION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: "date" | "amount" | "title" | "category") => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="amount">Sort by Amount</SelectItem>
            <SelectItem value="title">Sort by Title</SelectItem>
            <SelectItem value="category">Sort by Category</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleExportExcel} title="Export to Excel">
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Results Count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </p>
      )}

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {filteredTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No transactions match your filters</p>
        ) : (
          filteredTransactions.map((transaction) => (
            <button
              key={transaction.id}
              type="button"
              onClick={() => onSelect(transaction)}
              className="w-full text-left rounded-lg border bg-card p-3 active:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{transaction.title}</p>
                    {transaction.source === "Imported" && transaction.tags?.includes("ramp-import") && (
                      <Badge variant="outline" className="text-[10px] shrink-0">Ramp</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {parseLocalDate(transaction.transaction_date).toLocaleDateString()} · {transaction.category}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`font-semibold ${getDirectionColor(transaction.direction)}`}>
                    {transaction.direction === "Credit" ? "+" : "-"}
                    {formatCurrency(Number(transaction.amount), transaction.currency?.trim() || userCurrency)}
                  </span>
                  <Badge variant={getStatusBadgeVariant(transaction.status)} className="text-[10px]">
                    {transaction.status}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(transaction)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(transaction.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                {!isMobile && <TableHead>Category</TableHead>}
                {!isMobile && <TableHead>Intent</TableHead>}
                <TableHead className="text-right">Amount</TableHead>
                {!isMobile && <TableHead>Status</TableHead>}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 4 : 7} className="text-center text-muted-foreground">
                    No transactions match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelect(transaction)}
                  >
                    <TableCell>{parseLocalDate(transaction.transaction_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={transaction.title}>
                      {transaction.title}
                    </TableCell>
                    {!isMobile && (
                      <TableCell className="max-w-[150px] truncate" title={transaction.category}>
                        {transaction.category}
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell className="max-w-[120px] truncate" title={transaction.intent}>
                        {transaction.intent}
                      </TableCell>
                    )}
                    <TableCell className={`text-right font-medium ${getDirectionColor(transaction.direction)}`}>
                      {transaction.direction === "Credit" ? "+" : "-"}
                      {formatCurrency(Number(transaction.amount), transaction.currency?.trim() || userCurrency)}
                    </TableCell>
                    {!isMobile && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={transaction.status}
                          onValueChange={(value) => handleStatusChange(transaction.id, value)}
                        >
                          <SelectTrigger className="h-8 w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSACTION_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
