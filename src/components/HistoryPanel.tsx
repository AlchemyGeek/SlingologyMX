import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X } from "lucide-react";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateInput } from "@/components/ui/date-input";
import NotificationDetail from "./NotificationDetail";
import EquipmentDetail from "./EquipmentDetail";
import CounterHistoryDetail from "./CounterHistoryDetail";
import MaintenanceLogDetail from "./MaintenanceLogDetail";
import DirectiveDetail from "./DirectiveDetail";
import NotificationForm from "./NotificationForm";
import EquipmentForm from "./EquipmentForm";
import MaintenanceLogForm from "./MaintenanceLogForm";
import DirectiveForm from "./DirectiveForm";
import type { Directive } from "./DirectivesPanel";
import { useAircraftCounters } from "@/hooks/useAircraftCounters";

interface HistoryPanelProps {
  userId: string;
  aircraftId: string;
  refreshKey?: number;
}

interface UnifiedHistoryItem {
  id: string;
  date: Date;
  name: string;
  recordType: "Notification" | "Maintenance" | "Directive" | "Equipment" | "Counter";
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
  const [counterHistory, setCounterHistory] = useState<any[]>([]);
  const [directives, setDirectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected detail view state
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any | null>(null);
  const [selectedDirective, setSelectedDirective] = useState<Directive | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [selectedCounter, setSelectedCounter] = useState<any | null>(null);

  // Editing state
  const [editingNotification, setEditingNotification] = useState<any | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<any | null>(null);
  const [editingDirective, setEditingDirective] = useState<Directive | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);

  // Get current counters for notification form
  const { counters: currentCounters } = useAircraftCounters(userId, aircraftId);

  // Unified filters & sort
  const [search, setSearch] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("all");
  const [operationFilter, setOperationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [sort, setSort] = useState<{ field: keyof UnifiedHistoryItem; direction: SortDirection }>({ field: "date", direction: "desc" });

  const fetchHistory = async () => {
    try {
      const [notificationsRes, logsRes, directiveHistoryRes, equipmentRes, counterHistoryRes, directivesRes] = await Promise.all([
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
          .order("created_at", { ascending: false }),
        supabase
          .from("aircraft_counter_history")
          .select("*")
          .eq("user_id", userId)
          .eq("aircraft_id", aircraftId)
          .order("change_date", { ascending: false }),
        supabase
          .from("directives")
          .select("*")
          .eq("user_id", userId)
          .eq("aircraft_id", aircraftId)
      ]);

      if (notificationsRes.error) throw notificationsRes.error;
      if (logsRes.error) throw logsRes.error;
      if (directiveHistoryRes.error) throw directiveHistoryRes.error;
      if (equipmentRes.error) throw equipmentRes.error;
      if (counterHistoryRes.error) throw counterHistoryRes.error;
      if (directivesRes.error) throw directivesRes.error;
      
      setNotifications(notificationsRes.data || []);
      setMaintenanceLogs(logsRes.data || []);
      setDirectiveHistory(directiveHistoryRes.data || []);
      setEquipment(equipmentRes.data || []);
      setCounterHistory(counterHistoryRes.data || []);
      setDirectives(directivesRes.data || []);
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

    // Counter history - use change_date
    counterHistory.forEach((c) => {
      // Build a descriptive name showing what counters were updated
      const counters: string[] = [];
      if (c.hobbs != null) counters.push(`Hobbs: ${c.hobbs}`);
      if (c.tach != null) counters.push(`Tach: ${c.tach}`);
      if (c.airframe_total_time != null) counters.push(`Airframe: ${c.airframe_total_time}`);
      if (c.engine_total_time != null) counters.push(`Engine: ${c.engine_total_time}`);
      if (c.prop_total_time != null) counters.push(`Prop: ${c.prop_total_time}`);
      
      const name = counters.length > 0 ? counters.join(", ") : "Counter Update";
      
      items.push({
        id: `counter-${c.id}`,
        date: new Date(c.change_date),
        name: name,
        recordType: "Counter",
        operationType: "Updated",
        category: c.source || "-",
      });
    });

    return items;
  }, [notifications, maintenanceLogs, directiveHistory, equipment, counterHistory]);

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

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((item) => item.date >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((item) => item.date <= end);
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
  }, [unifiedHistory, search, recordTypeFilter, operationFilter, categoryFilter, startDate, endDate, sort]);

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

  const getRecordTypeBadgeVariant = (recordType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (recordType) {
      case "Notification":
        return "default";
      case "Maintenance":
        return "secondary";
      case "Directive":
        return "outline";
      case "Equipment":
        return "default";
      case "Counter":
        return "outline"; // Will use custom className
      default:
        return "outline";
    }
  };

  const getRecordTypeBadgeClassName = (recordType: string): string => {
    if (recordType === "Counter") {
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700";
    }
    return "";
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
      case "Deleted":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Handle row click to show detail view
  const handleRowClick = (item: UnifiedHistoryItem) => {
    const rawId = item.id.split("-").slice(1).join("-"); // Extract the actual ID

    switch (item.recordType) {
      case "Notification": {
        const notification = notifications.find((n) => n.id === rawId);
        if (notification) setSelectedNotification(notification);
        break;
      }
      case "Maintenance": {
        const log = maintenanceLogs.find((m) => m.id === rawId);
        if (log) setSelectedMaintenance(log);
        break;
      }
      case "Directive": {
        const historyEntry = directiveHistory.find((d) => d.id === rawId);
        if (historyEntry?.directive_id) {
          const directive = directives.find((d) => d.id === historyEntry.directive_id);
          if (directive) {
            setSelectedDirective(directive as Directive);
          } else {
            toast.info("Original directive no longer exists");
          }
        } else {
          toast.info("Directive details not available");
        }
        break;
      }
      case "Equipment": {
        const equip = equipment.find((e) => e.id === rawId);
        if (equip) setSelectedEquipment(equip);
        break;
      }
      case "Counter": {
        const counter = counterHistory.find((c) => c.id === rawId);
        if (counter) setSelectedCounter(counter);
        break;
      }
    }
  };

  // Handle notification edit/delete
  const handleNotificationEdit = (notification: any) => {
    setSelectedNotification(null);
    setEditingNotification(notification);
  };

  const handleNotificationDelete = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      toast.success("Notification deleted successfully");
      setSelectedNotification(null);
      fetchHistory();
    } catch (error: any) {
      toast.error("Failed to delete notification");
    }
  };

  // Handle equipment edit/delete
  const handleEquipmentEdit = (equip: any) => {
    setSelectedEquipment(null);
    setEditingEquipment(equip);
  };

  // Handle maintenance edit
  const handleMaintenanceEdit = (log: any) => {
    setSelectedMaintenance(null);
    setEditingMaintenance(log);
  };

  // Handle directive edit
  const handleDirectiveEdit = (directive: Directive) => {
    setSelectedDirective(null);
    setEditingDirective(directive);
  };

  const handleEquipmentDelete = async (equipmentId: string) => {
    try {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", equipmentId);

      if (error) throw error;

      toast.success("Equipment deleted successfully");
      setSelectedEquipment(null);
      fetchHistory();
    } catch (error: any) {
      toast.error("Failed to delete equipment");
    }
  };

  // Handle maintenance delete
  const handleMaintenanceDelete = async (logId: string) => {
    try {
      const { error } = await supabase
        .from("maintenance_logs")
        .delete()
        .eq("id", logId);

      if (error) throw error;

      toast.success("Maintenance log deleted successfully");
      setSelectedMaintenance(null);
      fetchHistory();
    } catch (error: any) {
      toast.error("Failed to delete maintenance log");
    }
  };

  // Handle directive delete
  const handleDirectiveDelete = async () => {
    if (!selectedDirective) return;
    
    try {
      const { error } = await supabase
        .from("directives")
        .delete()
        .eq("id", selectedDirective.id);

      if (error) throw error;

      toast.success("Directive deleted successfully");
      setSelectedDirective(null);
      fetchHistory();
    } catch (error: any) {
      toast.error("Failed to delete directive");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  // Show edit forms if editing
  if (editingNotification) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Edit Notification</h3>
        <NotificationForm
          userId={userId}
          aircraftId={aircraftId}
          editingNotification={editingNotification}
          currentCounters={currentCounters ? {
            hobbs: currentCounters.hobbs || 0,
            tach: currentCounters.tach || 0,
            airframe_total_time: currentCounters.airframe_total_time || 0,
            engine_total_time: currentCounters.engine_total_time || 0,
            prop_total_time: currentCounters.prop_total_time || 0,
          } : undefined}
          onSuccess={() => {
            setEditingNotification(null);
            fetchHistory();
          }}
          onCancel={() => setEditingNotification(null)}
        />
      </Card>
    );
  }

  if (editingMaintenance) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Edit Maintenance Log</h3>
        <MaintenanceLogForm
          userId={userId}
          aircraftId={aircraftId}
          editingLog={editingMaintenance}
          onSuccess={() => {
            setEditingMaintenance(null);
            fetchHistory();
          }}
          onCancel={() => setEditingMaintenance(null)}
        />
      </Card>
    );
  }

  if (editingDirective) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Edit Directive</h3>
        <DirectiveForm
          userId={userId}
          aircraftId={aircraftId}
          editingDirective={editingDirective}
          onSuccess={() => {
            setEditingDirective(null);
            fetchHistory();
          }}
          onCancel={() => setEditingDirective(null)}
        />
      </Card>
    );
  }

  if (editingEquipment) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Edit Equipment</h3>
        <EquipmentForm
          userId={userId}
          aircraftId={aircraftId}
          editingEquipment={editingEquipment}
          onSuccess={() => {
            setEditingEquipment(null);
            fetchHistory();
          }}
          onCancel={() => setEditingEquipment(null)}
        />
      </Card>
    );
  }

  // Show detail views if selected
  if (selectedNotification) {
    return (
      <NotificationDetail
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onEdit={handleNotificationEdit}
        onDelete={handleNotificationDelete}
      />
    );
  }

  if (selectedMaintenance) {
    return (
      <MaintenanceLogDetail
        log={selectedMaintenance}
        onClose={() => setSelectedMaintenance(null)}
        onEdit={() => handleMaintenanceEdit(selectedMaintenance)}
        onDelete={handleMaintenanceDelete}
      />
    );
  }

  if (selectedDirective) {
    return (
      <DirectiveDetail
        directive={selectedDirective}
        userId={userId}
        onClose={() => setSelectedDirective(null)}
        onEdit={() => handleDirectiveEdit(selectedDirective)}
        onDelete={handleDirectiveDelete}
        onUpdate={() => {}}
      />
    );
  }

  if (selectedEquipment) {
    return (
      <EquipmentDetail
        equipment={selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        onEdit={handleEquipmentEdit}
        onDelete={handleEquipmentDelete}
      />
    );
  }

  if (selectedCounter) {
    return (
      <CounterHistoryDetail
        counterHistory={selectedCounter}
        onClose={() => setSelectedCounter(null)}
      />
    );
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
            <div className="flex flex-col gap-3">
              {/* First row: Search and dropdowns */}
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

              {/* Second row: Date range filters */}
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">From:</Label>
                  <DateInput
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Start date"
                    className="w-[160px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">To:</Label>
                  <DateInput
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="End date"
                    className="w-[160px]"
                  />
                </div>
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate(null);
                      setEndDate(null);
                    }}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear dates
                  </Button>
                )}
              </div>
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
                        <TableRow 
                          key={item.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(item)}
                        >
                          <TableCell>{item.date.toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{item.name}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={getRecordTypeBadgeVariant(item.recordType)}
                              className={getRecordTypeBadgeClassName(item.recordType)}
                            >
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
