import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Pencil, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { useIsMobile } from "@/hooks/use-mobile";
import { Reserve } from "./ReservesPanel";
import { differenceInMonths, parseISO, addMonths, addYears } from "date-fns";

const RESERVE_TYPES = ["Engine", "Propeller", "Gearbox", "Parachute", "Battery", "Avionics", "Other"] as const;
const STATUS_OPTIONS = ["Active", "Paused", "Retired"] as const;

interface ReserveListProps {
  reserves: Reserve[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (reserve: Reserve) => void;
  onSelect: (reserve: Reserve) => void;
  userCurrency?: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
}

const counterTypeToFieldMap: Record<string, keyof NonNullable<ReserveListProps["currentCounters"]>> = {
  Hobbs: "hobbs",
  Tach: "tach",
  "Airframe TT": "airframe_total_time",
  "Engine TT": "engine_total_time",
  "Prop TT": "prop_total_time",
};

const calculateProgress = (
  reserve: Reserve,
  currentCounters?: ReserveListProps["currentCounters"]
): { progress: number; remaining: string; total: string } | null => {
  if (reserve.basis_type === "Calendar" && reserve.start_date && reserve.interval_value && reserve.interval_unit) {
    const startDate = parseISO(reserve.start_date);
    const endDate = reserve.interval_unit === "Years" 
      ? addYears(startDate, reserve.interval_value)
      : addMonths(startDate, reserve.interval_value);
    
    const totalMonths = differenceInMonths(endDate, startDate);
    const elapsedMonths = differenceInMonths(new Date(), startDate);
    const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
    const progress = Math.min(100, Math.max(0, (elapsedMonths / totalMonths) * 100));
    
    return {
      progress,
      remaining: `${remainingMonths} mo`,
      total: `${reserve.interval_value} ${reserve.interval_unit?.toLowerCase()}`,
    };
  }

  if (reserve.basis_type === "Hours" && reserve.limit_hours && reserve.counter_type && currentCounters) {
    const field = counterTypeToFieldMap[reserve.counter_type];
    if (field) {
      const currentValue = currentCounters[field] || 0;
      const startValue = reserve.start_counter_value || 0;
      const elapsed = currentValue - startValue;
      const remaining = Math.max(0, reserve.limit_hours - elapsed);
      const progress = Math.min(100, Math.max(0, (elapsed / reserve.limit_hours) * 100));
      
      return {
        progress,
        remaining: `${remaining.toFixed(1)} hrs`,
        total: `${reserve.limit_hours} hrs`,
      };
    }
  }

  if (reserve.basis_type === "Cycles" && reserve.limit_cycles) {
    const startCycles = reserve.start_cycle_count || 0;
    // For cycles, we'd need a current cycle count from somewhere - for now show limit only
    return {
      progress: 0,
      remaining: `${reserve.limit_cycles} cycles`,
      total: `${reserve.limit_cycles} cycles`,
    };
  }

  return null;
};

const ReserveList = ({ reserves, loading, onUpdate, onEdit, onSelect, userCurrency = "USD", currentCounters }: ReserveListProps) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("Active");
  const [sortBy, setSortBy] = useState<"title" | "type" | "cost" | "status">("title");

  const filteredReserves = useMemo(() => {
    return reserves
      .filter((reserve) => {
        const matchesSearch = searchTerm === "" || 
          reserve.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "all" || reserve.reserve_type === typeFilter;
        const matchesStatus = statusFilter === "all" || reserve.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "type") {
          return a.reserve_type.localeCompare(b.reserve_type);
        }
        if (sortBy === "cost") {
          return (b.expected_cost || 0) - (a.expected_cost || 0);
        }
        if (sortBy === "status") {
          return a.status.localeCompare(b.status);
        }
        return 0;
      });
  }, [reserves, searchTerm, typeFilter, statusFilter, sortBy]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("reserves" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Reserve deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete reserve");
    }
  };

  const hasActiveFilters = searchTerm !== "" || typeFilter !== "all" || statusFilter !== "Active" || sortBy !== "title";

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("Active");
    setSortBy("title");
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Paused":
        return "secondary";
      case "Retired":
        return "outline";
      default:
        return "default";
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading reserves...</p>;
  }

  if (reserves.length === 0) {
    return <p className="text-muted-foreground">No reserves yet. Create your first one!</p>;
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {RESERVE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: "title" | "type" | "cost" | "status") => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Sort by Title</SelectItem>
            <SelectItem value="type">Sort by Type</SelectItem>
            <SelectItem value="cost">Sort by Cost</SelectItem>
            <SelectItem value="status">Sort by Status</SelectItem>
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
          Showing {filteredReserves.length} of {reserves.length} reserves
        </p>
      )}

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {filteredReserves.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No reserves match your filters</p>
        ) : (
          filteredReserves.map((reserve) => {
            const progressData = calculateProgress(reserve, currentCounters);
            return (
              <div
                key={reserve.id}
                onClick={() => onSelect(reserve)}
                className="w-full text-left rounded-lg border p-3 active:bg-accent transition-colors bg-card cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{reserve.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reserve.reserve_type} · {formatCurrency(reserve.expected_cost || 0, userCurrency)}
                    </p>
                    {progressData && (
                      <div className="mt-2 space-y-1">
                        <Progress value={progressData.progress} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">{progressData.remaining} left</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={getStatusBadgeVariant(reserve.status)}>{reserve.status}</Badge>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(reserve)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(reserve.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <div className="min-w-0 md:min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                {!isMobile && <TableHead>Expected Cost</TableHead>}
                {!isMobile && <TableHead>Progress</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReserves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 4 : 6} className="text-center text-muted-foreground">
                    No reserves match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredReserves.map((reserve) => {
                  const progressData = calculateProgress(reserve, currentCounters);
                  return (
                    <TableRow 
                      key={reserve.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelect(reserve)}
                    >
                      <TableCell className="font-medium">{reserve.title}</TableCell>
                      <TableCell>{reserve.reserve_type}</TableCell>
                      {!isMobile && (
                        <TableCell>{formatCurrency(reserve.expected_cost || 0, userCurrency)}</TableCell>
                      )}
                      {!isMobile && (
                        <TableCell>
                          {progressData ? (
                            <div className="space-y-1 min-w-[120px]">
                              <Progress value={progressData.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {progressData.remaining} left
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(reserve.status)}>
                          {reserve.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(reserve)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(reserve.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ReserveList;
