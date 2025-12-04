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
}

const HistoryPanel = ({ userId }: HistoryPanelProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const [notificationsRes, logsRes] = await Promise.all([
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
          .order("date_performed", { ascending: false })
      ]);

      if (notificationsRes.error) throw notificationsRes.error;
      if (logsRes.error) throw logsRes.error;
      
      setNotifications(notificationsRes.data || []);
      setMaintenanceLogs(logsRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const hasHistory = notifications.length > 0 || maintenanceLogs.length > 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>All completed notifications and maintenance records</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasHistory ? (
          <p className="text-muted-foreground">No history items yet.</p>
        ) : (
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList>
              <TabsTrigger value="notifications">Notifications ({notifications.length})</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance ({maintenanceLogs.length})</TabsTrigger>
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
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryPanel;