import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface HistoryPanelProps {
  userId: string;
  aircraftId: string;
  refreshKey?: number;
}

interface UnifiedHistoryItem {
  id: string;
  date: Date;
  name: string;
  recordType: "Notification" | "Maintenance" | "Directive" | "Equipment";
  operationType: string;
  category: string;
}

type SortDirection = "asc" | "desc" | null;

const HistoryPanel = ({ userId, aircraftId, refreshKey }: HistoryPanelProps) => {
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [directiveHistory, setDirectiveHistory] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Unified filters & sort
  const [search, setSearch] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("all");
  const [operationFilter, setOperationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ field: keyof UnifiedHistoryItem; direction: SortDirection }>({ field: "date", direction: "desc" });

  const fetchHistory = async () => {
    try {
      const [notificationsRes, logsRes, directiveHistoryRes, equipmentRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .eq("aircraft_id", aircraftId)
          .eq("is_completed", true)
          .order("completed_at", { ascending: false }),
        supabase
          .from("maintenance_logs")
          .select("*")
          .eq("user_id", userId)
          .eq("aircraft_id", aircraftId)
          .order("date_performed", { ascending: false }),
        supabase
          .from("directive_history")
          .select("*")
          .eq("user_id", userId)
          .eq("aircraft_id", aircraftId)
          .order("created_at", { ascending: false }),
        supabase
          .from("equipment")
          .select("*")
          .eq("user_id", userId)
          .eq("aircraft_id", aircraftId)
          .order("created_at", { ascending: false })
      ]);

      if (notificationsRes.error) throw notificationsRes.error;
      if (logsRes.error) throw logsRes.error;
      if (directiveHistoryRes.error) throw directiveHistoryRes.error;
      if (equipmentRes.error) throw equipmentRes.error;
      
      setNotifications(notificationsRes.data || []);
      setMaintenanceLogs(logsRes.data || []);
      setDirectiveHistory(directiveHistoryRes.data || []);
      setEquipment(equipmentRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aircraftId) fetchHistory();
  }, [userId, aircraftId, refreshKey]);

  // Transform all records into unified format
  const unifiedHistory = useMemo((): UnifiedHistoryItem[] => {
    const items: UnifiedHistoryItem[] = [];

    // Notifications - use completed_at or initial_date
    notifications.forEach((n) => {
      const dateValue = n.completed_at ? new Date(n.completed_at) : parseLocalDate(n.initial_date);
      items.push({
        id: `notification-${n.id}`,
        date: dateValue,
        name: n.description || "Untitled",
        recordType: "Notification",
        operationType: "Completed",
        category: n.type || "-",
      });
    });

    // Maintenance logs - use date_performed
    maintenanceLogs.forEach((m) => {
      items.push({
        id: `maintenance-${m.id}`,
        date: parseLocalDate(m.date_performed),
        name: m.entry_title || "Untitled",
        recordType: "Maintenance",
        operationType: m.subcategory || "Created",
        category: m.category || "-",
      });
    });

    // Directive history - use created_at (date of action)
    directiveHistory.forEach((d) => {
      // Normalize action_type to past tense for consistency
      let operation = d.action_type || "Created";
      if (operation === "Create") operation = "Created";
      if (operation === "Delete") operation = "Deleted";
      
      items.push({
        id: `directive-${d.id}`,
        date: new Date(d.created_at),
        name: d.directive_title || d.directive_code || "Untitled",
        recordType: "Directive",
        operationType: operation,
        category: d.compliance_status || "-",
      });
    });

    // Equipment - use created_at
    equipment.forEach((e) => {
      items.push({
        id: `equipment-${e.id}`,
        date: new Date(e.created_at),
        name: e.name || "Untitled",
        recordType: "Equipment",
        operationType: "Created",
        category: e.category || "-",
      });
    });

    return items;
  }, [notifications, maintenanceLogs, directiveHistory, equipment]);

  // Get unique values for filters
  const recordTypes = [...new Set(unifiedHistory.map((item) => item.recordType))];
  const operationTypes = [...new Set(unifiedHistory.map((item) => item.operationType))];
  const categories = [...new Set(unifiedHistory.map((item) => item.category))].filter(c => c !== "-");

  // Filtered & sorted history
  const filteredHistory = useMemo(() => {
    let result = [...unifiedHistory];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.recordType.toLowerCase().includes(searchLower) ||
        item.operationType.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
      );
    }

    // Record type filter
    if (recordTypeFilter !== "all") {
      result = result.filter((item) => item.recordType === recordTypeFilter);
    }

    // Operation filter
    if (operationFilter !== "all") {
      result = result.filter((item) => item.operationType === operationFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // Sort
    if (sort.direction) {
      result.sort((a, b) => {
        let aVal: any = a[sort.field];
        let bVal: any = b[sort.field];

        if (sort.field === "date") {
          aVal = aVal?.getTime() || 0;
          bVal = bVal?.getTime() || 0;
        } else if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }

        if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [unifiedHistory, search, recordTypeFilter, operationFilter, categoryFilter, sort]);

  const toggleSort = (field: keyof UnifiedHistoryItem) => {
    if (sort.field !== field) {
      setSort({ field, direction: "desc" });
    } else if (sort.direction === "desc") {
      setSort({ field, direction: "asc" });
    } else if (sort.direction === "asc") {
      setSort({ field, direction: null });
    } else {
      setSort({ field, direction: "desc" });
    }
  };

  const SortIcon = ({ field }: { field: keyof UnifiedHistoryItem }) => {
    if (sort.field !== field || !sort.direction) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sort.direction === "asc" 
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const getRecordTypeBadgeVariant = (recordType: string) => {
    switch (recordType) {
      case "Notification":
        return "default";
      case "Maintenance":
        return "secondary";
      case "Directive":
        return "outline";
      case "Equipment":
        return "default";
      default:
        return "outline";
    }
  };

  const getOperationBadgeVariant = (operation: string) => {
    switch (operation) {
      case "Completed":
        return "default";
      case "Created":
        return "secondary";
      case "Compliance":
        return "default";
      case "Delete":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const hasHistory = unifiedHistory.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>All completed notifications, maintenance records, directive history, and equipment</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasHistory ? (
          <p className="text-muted-foreground">No history items yet.</p>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Record Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  {recordTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={operationFilter} onValueChange={setOperationFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  {operationTypes.map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isMobile && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {filteredHistory.length === 0 ? (
              <p className="text-muted-foreground">No records match your filters.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort("date")}>
                            Date <SortIcon field="date" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort("name")}>
                            Name <SortIcon field="name" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort("recordType")}>
                            Record Type <SortIcon field="recordType" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort("operationType")}>
                            Operation <SortIcon field="operationType" />
                          </Button>
                        </TableHead>
                        {!isMobile && (
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort("category")}>
                              Category <SortIcon field="category" />
                            </Button>
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.date.toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant={getRecordTypeBadgeVariant(item.recordType)}>
                              {item.recordType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getOperationBadgeVariant(item.operationType)}>
                              {item.operationType}
                            </Badge>
                          </TableCell>
                          {!isMobile && <TableCell>{item.category}</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryPanel;
