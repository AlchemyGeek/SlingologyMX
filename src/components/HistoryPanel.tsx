import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/utils";

interface HistoryPanelProps {
  userId: string;
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

const HistoryPanel = ({ userId, refreshKey }: HistoryPanelProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [directiveHistory, setDirectiveHistory] = useState<DirectiveHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const [notificationsRes, logsRes, directiveHistoryRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .eq("is_completed", true)
          .order("completed_at", { ascending: false }),
        supabase
          .from("maintenance_logs")
          .select("*")
          .eq("user_id", userId)
          .order("date_performed", { ascending: false }),
        supabase
          .from("directive_history")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      ]);

      if (notificationsRes.error) throw notificationsRes.error;
      if (logsRes.error) throw logsRes.error;
      if (directiveHistoryRes.error) throw directiveHistoryRes.error;
      
      setNotifications(notificationsRes.data || []);
      setMaintenanceLogs(logsRes.data || []);
      setDirectiveHistory(directiveHistoryRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId, refreshKey]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const hasHistory = notifications.length > 0 || maintenanceLogs.length > 0 || directiveHistory.length > 0;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>All completed notifications, maintenance records, and directive history</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasHistory ? (
          <p className="text-muted-foreground">No history items yet.</p>
        ) : (
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList>
              <TabsTrigger value="notifications">Notifications ({notifications.length})</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance ({maintenanceLogs.length})</TabsTrigger>
              <TabsTrigger value="directives">Directives ({directiveHistory.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="notifications" className="mt-4">
              {notifications.length === 0 ? (
                <p className="text-muted-foreground">No completed notifications yet.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Initial Date</TableHead>
                        <TableHead>Completed Date</TableHead>
                        <TableHead>Recurrence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell className="font-medium">{notification.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{notification.type}</Badge>
                          </TableCell>
                          <TableCell>{notification.component}</TableCell>
                          <TableCell>{parseLocalDate(notification.initial_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {notification.completed_at
                              ? new Date(notification.completed_at).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell>{notification.recurrence}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="maintenance" className="mt-4">
              {maintenanceLogs.length === 0 ? (
                <p className="text-muted-foreground">No maintenance records yet.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Subcategory</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Date Performed</TableHead>
                        <TableHead>Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maintenanceLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.entry_title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{log.category}</Badge>
                          </TableCell>
                          <TableCell>{log.subcategory}</TableCell>
                          <TableCell>{log.performed_by_name}</TableCell>
                          <TableCell>{parseLocalDate(log.date_performed).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {log.tags?.map((tag: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="directives" className="mt-4">
              {directiveHistory.length === 0 ? (
                <p className="text-muted-foreground">No directive history yet.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Compliance Status</TableHead>
                        <TableHead>First Compliance</TableHead>
                        <TableHead>Last Compliance</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {directiveHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.directive_code}</TableCell>
                          <TableCell>{entry.directive_title}</TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(entry.action_type)}>
                              {entry.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.compliance_status || "-"}</TableCell>
                          <TableCell>
                            {entry.first_compliance_date
                              ? parseLocalDate(entry.first_compliance_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {entry.last_compliance_date
                              ? parseLocalDate(entry.last_compliance_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {new Date(entry.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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