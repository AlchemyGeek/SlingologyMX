import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Constants } from "@/integrations/supabase/types";

const TRANSACTION_CATEGORIES = Constants.public.Enums.transaction_category;
const TRANSACTION_STATUSES = Constants.public.Enums.transaction_status;

interface TransactionListProps {
  transactions: any[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (transaction: any) => void;
  onSelect: (transaction: any) => void;
}

const TransactionList = ({ transactions, loading, onUpdate, onEdit, onSelect }: TransactionListProps) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "title" | "category">("date");

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

  const hasActiveFilters = searchTerm !== "" || categoryFilter !== "all" || statusFilter !== "all" || sortBy !== "date";

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortBy("date");
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

  if (loading) {
    return <p className="text-muted-foreground">Loading transactions...</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-muted-foreground">No transactions yet. Create your first one!</p>;
  }

  return (
    <div className="space-y-4">
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
      </div>

      {/* Results Count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </p>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                {!isMobile && <TableHead>Category</TableHead>}
                <TableHead className="text-right">Amount</TableHead>
                {!isMobile && <TableHead>Status</TableHead>}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 4 : 6} className="text-center text-muted-foreground">
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
                    <TableCell className={`text-right font-medium ${getDirectionColor(transaction.direction)}`}>
                      {transaction.direction === "Credit" ? "+" : "-"}
                      {transaction.currency} {Number(transaction.amount).toFixed(2)}
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(transaction.status)}>
                          {transaction.status}
                        </Badge>
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
