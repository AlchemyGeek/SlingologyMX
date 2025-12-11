import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Download, Upload, FileJson, Check, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExportData {
  version: string;
  exportDate: string;
  tables: {
    aircraft_counters: any[];
    aircraft_counter_history: any[];
    subscriptions: any[];
    notifications: any[];
    maintenance_logs: any[];
    directives: any[];
    aircraft_directive_status: any[];
    directive_history: any[];
    maintenance_directive_compliance: any[];
  };
}

interface RecordCounts {
  aircraft_counters: number;
  aircraft_counter_history: number;
  subscriptions: number;
  notifications: number;
  maintenance_logs: number;
  directives: number;
  aircraft_directive_status: number;
  directive_history: number;
  maintenance_directive_compliance: number;
}

const tableDisplayNames: Record<string, string> = {
  aircraft_counters: "Aircraft Counters",
  aircraft_counter_history: "Counter History",
  subscriptions: "Subscriptions",
  notifications: "Notifications",
  maintenance_logs: "Maintenance Logs",
  directives: "Directives",
  aircraft_directive_status: "Directive Status",
  directive_history: "Directive History",
  maintenance_directive_compliance: "Compliance Records",
};

const DataManagement = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportCounts, setExportCounts] = useState<RecordCounts | null>(null);
  const [importCounts, setImportCounts] = useState<RecordCounts | null>(null);
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: RecordCounts; skipped: RecordCounts } | null>(null);
  const [activeTab, setActiveTab] = useState("export");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleExport = async () => {
    if (!user?.id) return;

    setExporting(true);
    try {
      // Fetch all user data from each table
      const [
        countersRes,
        counterHistoryRes,
        subscriptionsRes,
        notificationsRes,
        maintenanceLogsRes,
        directivesRes,
        directiveStatusRes,
        directiveHistoryRes,
        complianceRes,
      ] = await Promise.all([
        supabase.from("aircraft_counters").select("*").eq("user_id", user.id),
        supabase.from("aircraft_counter_history").select("*").eq("user_id", user.id),
        supabase.from("subscriptions").select("*").eq("user_id", user.id),
        supabase.from("notifications").select("*").eq("user_id", user.id),
        supabase.from("maintenance_logs").select("*").eq("user_id", user.id),
        supabase.from("directives").select("*").eq("user_id", user.id),
        supabase.from("aircraft_directive_status").select("*").eq("user_id", user.id),
        supabase.from("directive_history").select("*").eq("user_id", user.id),
        supabase.from("maintenance_directive_compliance").select("*").eq("user_id", user.id),
      ]);

      // Remove user_id from exported data (will be replaced on import)
      const sanitizeRecords = (records: any[]) => 
        records.map(({ user_id, ...rest }) => rest);

      const exportData: ExportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        tables: {
          aircraft_counters: sanitizeRecords(countersRes.data || []),
          aircraft_counter_history: sanitizeRecords(counterHistoryRes.data || []),
          subscriptions: sanitizeRecords(subscriptionsRes.data || []),
          notifications: sanitizeRecords(notificationsRes.data || []),
          maintenance_logs: sanitizeRecords(maintenanceLogsRes.data || []),
          directives: sanitizeRecords(directivesRes.data || []),
          aircraft_directive_status: sanitizeRecords(directiveStatusRes.data || []),
          directive_history: sanitizeRecords(directiveHistoryRes.data || []),
          maintenance_directive_compliance: sanitizeRecords(complianceRes.data || []),
        },
      };

      // Set counts for display
      const counts: RecordCounts = {
        aircraft_counters: exportData.tables.aircraft_counters.length,
        aircraft_counter_history: exportData.tables.aircraft_counter_history.length,
        subscriptions: exportData.tables.subscriptions.length,
        notifications: exportData.tables.notifications.length,
        maintenance_logs: exportData.tables.maintenance_logs.length,
        directives: exportData.tables.directives.length,
        aircraft_directive_status: exportData.tables.aircraft_directive_status.length,
        directive_history: exportData.tables.directive_history.length,
        maintenance_directive_compliance: exportData.tables.maintenance_directive_compliance.length,
      };
      setExportCounts(counts);

      // Download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `slingologymx-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ExportData;
        
        // Validate structure
        if (!data.version || !data.tables) {
          toast.error("Invalid file format");
          return;
        }

        setImportPreview(data);
        
        // Calculate counts
        const counts: RecordCounts = {
          aircraft_counters: data.tables.aircraft_counters?.length || 0,
          aircraft_counter_history: data.tables.aircraft_counter_history?.length || 0,
          subscriptions: data.tables.subscriptions?.length || 0,
          notifications: data.tables.notifications?.length || 0,
          maintenance_logs: data.tables.maintenance_logs?.length || 0,
          directives: data.tables.directives?.length || 0,
          aircraft_directive_status: data.tables.aircraft_directive_status?.length || 0,
          directive_history: data.tables.directive_history?.length || 0,
          maintenance_directive_compliance: data.tables.maintenance_directive_compliance?.length || 0,
        };
        setImportCounts(counts);
        setImportResult(null);
      } catch (error) {
        console.error("Parse error:", error);
        toast.error("Failed to parse file");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user?.id || !importPreview) return;

    setImporting(true);
    setShowImportConfirm(false);

    try {
      const inserted: RecordCounts = {
        aircraft_counters: 0,
        aircraft_counter_history: 0,
        subscriptions: 0,
        notifications: 0,
        maintenance_logs: 0,
        directives: 0,
        aircraft_directive_status: 0,
        directive_history: 0,
        maintenance_directive_compliance: 0,
      };

      const skipped: RecordCounts = {
        aircraft_counters: 0,
        aircraft_counter_history: 0,
        subscriptions: 0,
        notifications: 0,
        maintenance_logs: 0,
        directives: 0,
        aircraft_directive_status: 0,
        directive_history: 0,
        maintenance_directive_compliance: 0,
      };

      // Import order matters due to foreign key relationships
      // 1. Aircraft counters (standalone)
      for (const record of importPreview.tables.aircraft_counters || []) {
        const { data: existing } = await supabase
          .from("aircraft_counters")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          // Update existing counter record
          await supabase
            .from("aircraft_counters")
            .update({ ...record, user_id: user.id })
            .eq("id", existing.id);
          skipped.aircraft_counters++;
        } else {
          const { error } = await supabase
            .from("aircraft_counters")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.aircraft_counters++;
          else skipped.aircraft_counters++;
        }
      }

      // 2. Counter history (standalone)
      for (const record of importPreview.tables.aircraft_counter_history || []) {
        const { data: existing } = await supabase
          .from("aircraft_counter_history")
          .select("id")
          .eq("id", record.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("aircraft_counter_history")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.aircraft_counter_history++;
          else skipped.aircraft_counter_history++;
        } else {
          skipped.aircraft_counter_history++;
        }
      }

      // 3. Subscriptions (before notifications due to foreign key)
      for (const record of importPreview.tables.subscriptions || []) {
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("id", record.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("subscriptions")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.subscriptions++;
          else skipped.subscriptions++;
        } else {
          skipped.subscriptions++;
        }
      }

      // 4. Directives (before directive_status and compliance)
      for (const record of importPreview.tables.directives || []) {
        const { data: existing } = await supabase
          .from("directives")
          .select("id")
          .eq("id", record.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("directives")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.directives++;
          else skipped.directives++;
        } else {
          skipped.directives++;
        }
      }

      // 5. Maintenance logs (before notifications and compliance)
      for (const record of importPreview.tables.maintenance_logs || []) {
        const { data: existing } = await supabase
          .from("maintenance_logs")
          .select("id")
          .eq("id", record.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("maintenance_logs")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.maintenance_logs++;
          else skipped.maintenance_logs++;
        } else {
          skipped.maintenance_logs++;
        }
      }

      // 6. Notifications (after subscriptions, maintenance_logs, directives)
      for (const record of importPreview.tables.notifications || []) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("id", record.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("notifications")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.notifications++;
          else skipped.notifications++;
        } else {
          skipped.notifications++;
        }
      }

      // 7. Aircraft directive status (after directives)
      for (const record of importPreview.tables.aircraft_directive_status || []) {
        const { data: existing } = await supabase
          .from("aircraft_directive_status")
          .select("id")
          .eq("id", record.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("aircraft_directive_status")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.aircraft_directive_status++;
          else skipped.aircraft_directive_status++;
        } else {
          skipped.aircraft_directive_status++;
        }
      }

      // 8. Directive history (standalone with directive reference)
      for (const record of importPreview.tables.directive_history || []) {
        const { data: existing } = await supabase
          .from("directive_history")
          .select("id")
          .eq("id", record.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("directive_history")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.directive_history++;
          else skipped.directive_history++;
        } else {
          skipped.directive_history++;
        }
      }

      // 9. Maintenance directive compliance (after directives and maintenance_logs)
      for (const record of importPreview.tables.maintenance_directive_compliance || []) {
        const { data: existing } = await supabase
          .from("maintenance_directive_compliance")
          .select("id")
          .eq("id", record.id)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("maintenance_directive_compliance")
            .insert({ ...record, user_id: user.id });
          if (!error) inserted.maintenance_directive_compliance++;
          else skipped.maintenance_directive_compliance++;
        } else {
          skipped.maintenance_directive_compliance++;
        }
      }

      setImportResult({ inserted, skipped });
      toast.success("Data imported successfully!");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import data");
    } finally {
      setImporting(false);
    }
  };

  const getTotalRecords = (counts: RecordCounts) => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <FileJson className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Data Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Your Data
                </CardTitle>
                <CardDescription>
                  Download all your maintenance records, notifications, subscriptions, directives, 
                  and counter data as a JSON file. This file can be used to backup your data or 
                  share it with another user.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">What's included:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Aircraft counters and counter history</li>
                    <li>• Subscriptions and notifications</li>
                    <li>• Maintenance logs and compliance records</li>
                    <li>• Directives, directive status, and history</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-3">
                    <strong>Not included:</strong> Bug reports, feature requests, and profile information.
                  </p>
                </div>

                <Button onClick={handleExport} disabled={exporting} className="w-full">
                  {exporting ? "Exporting..." : "Export Data as JSON"}
                </Button>

                {exportCounts && (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Export Complete
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Table</TableHead>
                            <TableHead className="text-right">Records Exported</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(exportCounts).map(([table, count]) => (
                            <TableRow key={table}>
                              <TableCell>{tableDisplayNames[table]}</TableCell>
                              <TableCell className="text-right font-mono">{count}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold border-t-2">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right font-mono">
                              {getTotalRecords(exportCounts)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Data
                </CardTitle>
                <CardDescription>
                  Import data from a previously exported JSON file. Duplicate records 
                  (matching by ID) will be skipped to prevent conflicts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-700 dark:text-amber-400">Important</h4>
                      <p className="text-sm text-muted-foreground">
                        Records with existing IDs will be skipped. Counter data will update 
                        your current values if you already have counter records.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-file">Select JSON File</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>

                {importPreview && importCounts && (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">File Preview</CardTitle>
                      <CardDescription>
                        Exported on {new Date(importPreview.exportDate).toLocaleDateString()} 
                        (Version {importPreview.version})
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Table</TableHead>
                            <TableHead className="text-right">Records to Import</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(importCounts).map(([table, count]) => (
                            <TableRow key={table}>
                              <TableCell>{tableDisplayNames[table]}</TableCell>
                              <TableCell className="text-right font-mono">{count}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold border-t-2">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right font-mono">
                              {getTotalRecords(importCounts)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>

                      <Button
                        onClick={() => setShowImportConfirm(true)}
                        disabled={importing}
                        className="w-full mt-4"
                      >
                        {importing ? "Importing..." : "Import Data"}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {importResult && (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Import Complete
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Table</TableHead>
                            <TableHead className="text-right">Inserted</TableHead>
                            <TableHead className="text-right">Skipped</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.keys(importResult.inserted).map((table) => (
                            <TableRow key={table}>
                              <TableCell>{tableDisplayNames[table]}</TableCell>
                              <TableCell className="text-right font-mono text-primary">
                                {importResult.inserted[table as keyof RecordCounts]}
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                {importResult.skipped[table as keyof RecordCounts]}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold border-t-2">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right font-mono text-primary">
                              {getTotalRecords(importResult.inserted)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {getTotalRecords(importResult.skipped)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to import {getTotalRecords(importCounts!)} records. 
              Existing records with matching IDs will be skipped. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>
              Import Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataManagement;
