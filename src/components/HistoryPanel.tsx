import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface DirectiveHistoryEntry {
  id: string;
  directive_id: string | null;
  directive_code: string;
  directive_title: string;
  action_type: string;
  compliance_status: string | null;
  first_compliance_date: string | null;
  last_compliance_date: string | null;
  notes: string | null;
  created_at: string;
}

type SortDirection = "asc" | "desc" | null;

const HistoryPanel = ({ userId, aircraftId, refreshKey }: HistoryPanelProps) => {
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [directiveHistory, setDirectiveHistory] = useState<DirectiveHistoryEntry[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification filters & sort
  const [notifSearch, setNotifSearch] = useState("");
  const [notifTypeFilter, setNotifTypeFilter] = useState<string>("all");
  const [notifSort, setNotifSort] = useState<{ field: string; direction: SortDirection }>({ field: "completed_at", direction: "desc" });

  // Maintenance filters & sort
  const [maintSearch, setMaintSearch] = useState("");
  const [maintCategoryFilter, setMaintCategoryFilter] = useState<string>("all");
  const [maintSort, setMaintSort] = useState<{ field: string; direction: SortDirection }>({ field: "date_performed", direction: "desc" });

  // Directive filters & sort
  const [dirSearch, setDirSearch] = useState("");
  const [dirActionFilter, setDirActionFilter] = useState<string>("all");
  const [dirSort, setDirSort] = useState<{ field: string; direction: SortDirection }>({ field: "created_at", direction: "desc" });

  // Equipment filters & sort
  const [equipSearch, setEquipSearch] = useState("");
  const [equipCategoryFilter, setEquipCategoryFilter] = useState<string>("all");
  const [equipSort, setEquipSort] = useState<{ field: string; direction: SortDirection }>({ field: "created_at", direction: "desc" });

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

  // Filtered & sorted notifications
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];
    
    // Search filter
    if (notifSearch) {
      const search = notifSearch.toLowerCase();
      result = result.filter(n => 
        n.description?.toLowerCase().includes(search) ||
        n.notes?.toLowerCase().includes(search)
      );
    }
    
    // Type filter
    if (notifTypeFilter !== "all") {
      result = result.filter(n => n.type === notifTypeFilter);
    }
    
    // Sort
    if (notifSort.direction) {
      result.sort((a, b) => {
        let aVal = a[notifSort.field];
        let bVal = b[notifSort.field];
        
        if (notifSort.field.includes("date") || notifSort.field.includes("_at")) {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        
        if (aVal < bVal) return notifSort.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return notifSort.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [notifications, notifSearch, notifTypeFilter, notifSort]);

  // Filtered & sorted maintenance logs
  const filteredMaintenance = useMemo(() => {
    let result = [...maintenanceLogs];
    
    // Search filter
    if (maintSearch) {
      const search = maintSearch.toLowerCase();
      result = result.filter(m => 
        m.entry_title?.toLowerCase().includes(search) ||
        m.performed_by_name?.toLowerCase().includes(search) ||
        m.tags?.some((t: string) => t.toLowerCase().includes(search))
      );
    }
    
    // Category filter
    if (maintCategoryFilter !== "all") {
      result = result.filter(m => m.category === maintCategoryFilter);
    }
    
    // Sort
    if (maintSort.direction) {
      result.sort((a, b) => {
        let aVal = a[maintSort.field];
        let bVal = b[maintSort.field];
        
        if (maintSort.field.includes("date") || maintSort.field.includes("_at")) {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        
        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return maintSort.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return maintSort.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [maintenanceLogs, maintSearch, maintCategoryFilter, maintSort]);

  // Filtered & sorted directive history
  const filteredDirectives = useMemo(() => {
    let result = [...directiveHistory];
    
    // Search filter
    if (dirSearch) {
      const search = dirSearch.toLowerCase();
      result = result.filter(d => 
        d.directive_code?.toLowerCase().includes(search) ||
        d.directive_title?.toLowerCase().includes(search)
      );
    }
    
    // Action filter
    if (dirActionFilter !== "all") {
      result = result.filter(d => d.action_type === dirActionFilter);
    }
    
    // Sort
    if (dirSort.direction) {
      result.sort((a, b) => {
        let aVal = a[dirSort.field as keyof DirectiveHistoryEntry];
        let bVal = b[dirSort.field as keyof DirectiveHistoryEntry];
        
        if (dirSort.field.includes("date") || dirSort.field.includes("_at")) {
          aVal = aVal ? new Date(aVal as string).getTime() as any : 0;
          bVal = bVal ? new Date(bVal as string).getTime() as any : 0;
        }
        
        if (typeof aVal === "string") aVal = aVal.toLowerCase() as any;
        if (typeof bVal === "string") bVal = bVal.toLowerCase() as any;
        
        if ((aVal ?? "") < (bVal ?? "")) return dirSort.direction === "asc" ? -1 : 1;
        if ((aVal ?? "") > (bVal ?? "")) return dirSort.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [directiveHistory, dirSearch, dirActionFilter, dirSort]);

  // Filtered & sorted equipment
  const filteredEquipment = useMemo(() => {
    let result = [...equipment];
    
    // Search filter
    if (equipSearch) {
      const search = equipSearch.toLowerCase();
      result = result.filter(e => 
        e.name?.toLowerCase().includes(search) ||
        e.manufacturer?.toLowerCase().includes(search) ||
        e.model_or_part_number?.toLowerCase().includes(search) ||
        e.serial_number?.toLowerCase().includes(search) ||
        e.tags?.some((t: string) => t.toLowerCase().includes(search))
      );
    }
    
    // Category filter
    if (equipCategoryFilter !== "all") {
      result = result.filter(e => e.category === equipCategoryFilter);
    }
    
    // Sort
    if (equipSort.direction) {
      result.sort((a, b) => {
        let aVal = a[equipSort.field];
        let bVal = b[equipSort.field];
        
        if (equipSort.field.includes("date") || equipSort.field.includes("_at")) {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        
        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();
        
        if ((aVal ?? "") < (bVal ?? "")) return equipSort.direction === "asc" ? -1 : 1;
        if ((aVal ?? "") > (bVal ?? "")) return equipSort.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [equipment, equipSearch, equipCategoryFilter, equipSort]);

  const toggleSort = (
    currentSort: { field: string; direction: SortDirection },
    setSort: React.Dispatch<React.SetStateAction<{ field: string; direction: SortDirection }>>,
    field: string
  ) => {
    if (currentSort.field !== field) {
      setSort({ field, direction: "desc" });
    } else if (currentSort.direction === "desc") {
      setSort({ field, direction: "asc" });
    } else if (currentSort.direction === "asc") {
      setSort({ field, direction: null });
    } else {
      setSort({ field, direction: "desc" });
    }
  };

  const SortIcon = ({ field, currentSort }: { field: string; currentSort: { field: string; direction: SortDirection } }) => {
    if (currentSort.field !== field || !currentSort.direction) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return currentSort.direction === "asc" 
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const hasHistory = notifications.length > 0 || maintenanceLogs.length > 0 || directiveHistory.length > 0 || equipment.length > 0;

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case "Create":
        return "default";
      case "Delete":
        return "destructive";
      case "Compliance":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Get unique values for filters
  const notificationTypes = [...new Set(notifications.map(n => n.type))];
  const maintenanceCategories = [...new Set(maintenanceLogs.map(m => m.category))];
  const directiveActions = [...new Set(directiveHistory.map(d => d.action_type))];
  const equipmentCategories = [...new Set(equipment.map(e => e.category))];

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
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="notifications">Notifications ({filteredNotifications.length})</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance ({filteredMaintenance.length})</TabsTrigger>
              <TabsTrigger value="directives">Directives ({filteredDirectives.length})</TabsTrigger>
              <TabsTrigger value="equipment">Equipment ({filteredEquipment.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="notifications" className="mt-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={notifTypeFilter} onValueChange={setNotifTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {notificationTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredNotifications.length === 0 ? (
                <p className="text-muted-foreground">No notifications match your filters.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <div className="min-w-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(notifSort, setNotifSort, "description")}>
                              Description <SortIcon field="description" currentSort={notifSort} />
                            </Button>
                          </TableHead>
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(notifSort, setNotifSort, "type")}>
                                Type <SortIcon field="type" currentSort={notifSort} />
                              </Button>
                            </TableHead>
                          )}
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(notifSort, setNotifSort, "initial_date")}>
                              Initial Date <SortIcon field="initial_date" currentSort={notifSort} />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(notifSort, setNotifSort, "completed_at")}>
                              Completed <SortIcon field="completed_at" currentSort={notifSort} />
                            </Button>
                          </TableHead>
                          {!isMobile && <TableHead>Recurrence</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNotifications.map((notification) => (
                          <TableRow key={notification.id}>
                            <TableCell className="font-medium">{notification.description}</TableCell>
                            {!isMobile && (
                              <TableCell>
                                <Badge variant="outline">{notification.type}</Badge>
                              </TableCell>
                            )}
                            <TableCell>{parseLocalDate(notification.initial_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {notification.completed_at
                                ? new Date(notification.completed_at).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            {!isMobile && <TableCell>{notification.recurrence}</TableCell>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="maintenance" className="mt-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search maintenance logs..."
                    value={maintSearch}
                    onChange={(e) => setMaintSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={maintCategoryFilter} onValueChange={setMaintCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {maintenanceCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredMaintenance.length === 0 ? (
                <p className="text-muted-foreground">No maintenance records match your filters.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <div className="min-w-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(maintSort, setMaintSort, "entry_title")}>
                              Title <SortIcon field="entry_title" currentSort={maintSort} />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(maintSort, setMaintSort, "category")}>
                              Category <SortIcon field="category" currentSort={maintSort} />
                            </Button>
                          </TableHead>
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(maintSort, setMaintSort, "subcategory")}>
                                Subcategory <SortIcon field="subcategory" currentSort={maintSort} />
                              </Button>
                            </TableHead>
                          )}
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(maintSort, setMaintSort, "performed_by_name")}>
                                Performed By <SortIcon field="performed_by_name" currentSort={maintSort} />
                              </Button>
                            </TableHead>
                          )}
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(maintSort, setMaintSort, "date_performed")}>
                              Date <SortIcon field="date_performed" currentSort={maintSort} />
                            </Button>
                          </TableHead>
                          {!isMobile && <TableHead>Tags</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMaintenance.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.entry_title}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{log.category}</Badge>
                            </TableCell>
                            {!isMobile && <TableCell>{log.subcategory}</TableCell>}
                            {!isMobile && <TableCell>{log.performed_by_name}</TableCell>}
                            <TableCell>{parseLocalDate(log.date_performed).toLocaleDateString()}</TableCell>
                            {!isMobile && (
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {log.tags?.map((tag: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="directives" className="mt-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search directives..."
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={dirActionFilter} onValueChange={setDirActionFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {directiveActions.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredDirectives.length === 0 ? (
                <p className="text-muted-foreground">No directive history matches your filters.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <div className="min-w-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(dirSort, setDirSort, "directive_code")}>
                              Code <SortIcon field="directive_code" currentSort={dirSort} />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(dirSort, setDirSort, "directive_title")}>
                              Title <SortIcon field="directive_title" currentSort={dirSort} />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(dirSort, setDirSort, "action_type")}>
                              Action <SortIcon field="action_type" currentSort={dirSort} />
                            </Button>
                          </TableHead>
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(dirSort, setDirSort, "compliance_status")}>
                                Status <SortIcon field="compliance_status" currentSort={dirSort} />
                              </Button>
                            </TableHead>
                          )}
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(dirSort, setDirSort, "first_compliance_date")}>
                                First Compliance <SortIcon field="first_compliance_date" currentSort={dirSort} />
                              </Button>
                            </TableHead>
                          )}
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(dirSort, setDirSort, "last_compliance_date")}>
                                Last Compliance <SortIcon field="last_compliance_date" currentSort={dirSort} />
                              </Button>
                            </TableHead>
                          )}
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(dirSort, setDirSort, "created_at")}>
                              Date <SortIcon field="created_at" currentSort={dirSort} />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDirectives.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.directive_code}</TableCell>
                            <TableCell>{entry.directive_title}</TableCell>
                            <TableCell>
                              <Badge variant={getActionBadgeVariant(entry.action_type)}>
                                {entry.action_type}
                              </Badge>
                            </TableCell>
                            {!isMobile && <TableCell>{entry.compliance_status || "-"}</TableCell>}
                            {!isMobile && (
                              <TableCell>
                                {entry.first_compliance_date
                                  ? parseLocalDate(entry.first_compliance_date).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                            )}
                            {!isMobile && (
                              <TableCell>
                                {entry.last_compliance_date
                                  ? parseLocalDate(entry.last_compliance_date).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                            )}
                            <TableCell>
                              {new Date(entry.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="equipment" className="mt-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search equipment..."
                    value={equipSearch}
                    onChange={(e) => setEquipSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={equipCategoryFilter} onValueChange={setEquipCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {equipmentCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredEquipment.length === 0 ? (
                <p className="text-muted-foreground">No equipment matches your filters.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <div className="min-w-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(equipSort, setEquipSort, "name")}>
                              Name <SortIcon field="name" currentSort={equipSort} />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(equipSort, setEquipSort, "category")}>
                              Category <SortIcon field="category" currentSort={equipSort} />
                            </Button>
                          </TableHead>
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(equipSort, setEquipSort, "manufacturer")}>
                                Manufacturer <SortIcon field="manufacturer" currentSort={equipSort} />
                              </Button>
                            </TableHead>
                          )}
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(equipSort, setEquipSort, "model_or_part_number")}>
                                Model/Part# <SortIcon field="model_or_part_number" currentSort={equipSort} />
                              </Button>
                            </TableHead>
                          )}
                          {!isMobile && (
                            <TableHead>
                              <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(equipSort, setEquipSort, "installed_date")}>
                                Installed <SortIcon field="installed_date" currentSort={equipSort} />
                              </Button>
                            </TableHead>
                          )}
                          <TableHead>
                            <Button variant="ghost" size="sm" className="h-8 p-0" onClick={() => toggleSort(equipSort, setEquipSort, "created_at")}>
                              Created <SortIcon field="created_at" currentSort={equipSort} />
                            </Button>
                          </TableHead>
                          {!isMobile && <TableHead>Tags</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEquipment.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.category}</Badge>
                            </TableCell>
                            {!isMobile && <TableCell>{item.manufacturer || "-"}</TableCell>}
                            {!isMobile && <TableCell>{item.model_or_part_number || "-"}</TableCell>}
                            {!isMobile && (
                              <TableCell>
                                {item.installed_date
                                  ? parseLocalDate(item.installed_date).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                            )}
                            <TableCell>
                              {new Date(item.created_at).toLocaleDateString()}
                            </TableCell>
                            {!isMobile && (
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {item.tags?.map((tag: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryPanel;
