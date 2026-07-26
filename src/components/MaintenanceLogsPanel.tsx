import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MaintenanceLogList from "./MaintenanceLogList";
import MaintenanceLogForm from "./MaintenanceLogForm";
import MaintenanceLogDetail from "./MaintenanceLogDetail";
import { AircraftCounters } from "@/hooks/useAircraftCounters";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { voidMaintenanceTransactions } from "@/hooks/useMaintenanceTransactions";
import { useUndoDelete } from "@/hooks/useUndoDelete";

interface MaintenanceLog {
  id: string;
  entry_title: string;
  category: string;
  subcategory: string;
  tags: string[];
  date_performed: string;
  hobbs_at_event: number | null;
  tach_at_event: number | null;
  airframe_total_time: number | null;
  engine_total_time: number | null;
  prop_total_time: number | null;
  has_compliance_item: boolean;
  has_linked_compliance?: boolean; // Added to track linked compliance records
  compliance_type: string;
  compliance_reference: string | null;
  recurring_compliance: boolean;
  is_recurring_task: boolean;
  interval_type: string;
  interval_hours: number | null;
  interval_months: number | null;
  next_due_hours: number | null;
  next_due_date: string | null;
  performed_by_type: string;
  performed_by_name: string;
  organization: string | null;
  parts_cost: number | null;
  labor_cost: number | null;
  other_cost: number | null;
  total_cost: number | null;
  attachment_urls: Array<{ url: string; description?: string }>;
  internal_notes: string | null;
}

interface CounterUpdates {
  hobbs?: number;
  tach?: number;
  airframe_total_time?: number;
  engine_total_time?: number;
  prop_total_time?: number;
}

interface MaintenanceLogsPanelProps {
  userId: string;
  aircraftId: string;
  counters: AircraftCounters;
  onUpdateGlobalCounters?: (updates: CounterUpdates, changeDate?: Date, allCounterValues?: CounterUpdates) => Promise<void>;
  onRecordChanged?: () => void;
}

const MaintenanceLogsPanel = ({ userId, aircraftId, counters, onUpdateGlobalCounters, onRecordChanged }: MaintenanceLogsPanelProps) => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [loading, setLoading] = useState(true);
  const { currency: userCurrency } = useUserCurrency(userId);

  const fetchLogs = async () => {
    try {
      // Fetch maintenance logs
      const { data: logsData, error: logsError } = await supabase
        .from("maintenance_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .order("date_performed", { ascending: false });

      if (logsError) throw logsError;

      // Fetch linked compliance records to check which logs have compliance
      const { data: complianceData, error: complianceError } = await supabase
        .from("maintenance_directive_compliance")
        .select("maintenance_log_id")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId);

      if (complianceError) throw complianceError;

      // Create a set of log IDs that have linked compliance records
      const logsWithCompliance = new Set(
        complianceData?.map(c => c.maintenance_log_id).filter(Boolean) || []
      );

      // Enrich logs with has_linked_compliance flag
      const enrichedLogs = (logsData || []).map(log => ({
        ...log,
        has_linked_compliance: logsWithCompliance.has(log.id)
      }));

      setLogs(enrichedLogs as unknown as MaintenanceLog[]);
    } catch (error) {
      console.error("Error fetching maintenance logs:", error);
      toast.error("Failed to load maintenance logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aircraftId) fetchLogs();
  }, [userId, aircraftId]);

  const handleLogCreated = () => {
    setShowForm(false);
    setEditingLog(null);
    fetchLogs();
    onRecordChanged?.();
    toast.success(editingLog ? "Maintenance log updated" : "Maintenance log created");
  };

  const handleEdit = (log: MaintenanceLog) => {
    setEditingLog(log);
    setSelectedLog(null);
    setShowForm(true);
  };

  let cascadedNotifications: any[] = [];
  let cascadedCompliance: any[] = [];
  let voidedTransactionIds: string[] = [];

  const { deleteWithUndo } = useUndoDelete({
    tableName: "maintenance_logs",
    onBeforeDelete: async (id) => {
      // Snapshot notifications before deleting
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("maintenance_log_id", id)
        .eq("user_modified", false);
      cascadedNotifications = notifData || [];

      // Snapshot compliance records before deleting
      const { data: compData } = await supabase
        .from("maintenance_directive_compliance")
        .select("*")
        .eq("maintenance_log_id", id);
      cascadedCompliance = compData || [];

      // Snapshot which transactions will be voided (to unvoid on restore)
      const { data: txData } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference_id", id)
        .eq("reference_type", "Maintenance")
        .eq("user_id", userId)
        .neq("status", "Voided");
      voidedTransactionIds = (txData || []).map(t => t.id);

      await voidMaintenanceTransactions(id, userId);
      await supabase
        .from("notifications")
        .delete()
        .eq("maintenance_log_id", id)
        .eq("user_modified", false);
      await supabase
        .from("maintenance_directive_compliance")
        .delete()
        .eq("maintenance_log_id", id);
    },
    onAfterDelete: () => {
      setSelectedLog(null);
      fetchLogs();
      onRecordChanged?.();
    },
    onAfterRestore: async () => {
      // Unvoid transactions
      if (voidedTransactionIds.length > 0) {
        await supabase
          .from("transactions")
          .update({ status: "Pending" as any })
          .in("id", voidedTransactionIds);
        voidedTransactionIds = [];
      }
      // Restore notifications
      if (cascadedNotifications.length > 0) {
        await supabase.from("notifications").insert(cascadedNotifications);
        cascadedNotifications = [];
      }
      // Restore compliance records
      if (cascadedCompliance.length > 0) {
        await supabase.from("maintenance_directive_compliance").insert(cascadedCompliance);
        cascadedCompliance = [];
      }
      fetchLogs();
      onRecordChanged?.();
    },
  });

  const handleDelete = async (logId: string) => {
    const snapshot = logs.find(l => l.id === logId);
    if (!snapshot) return;
    // Remove the enriched field before snapshot
    const { has_linked_compliance, ...cleanSnapshot } = snapshot as any;
    await deleteWithUndo(logId, cleanSnapshot);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingLog(null);
  };

  const handleViewDetail = (log: MaintenanceLog) => {
    setSelectedLog(log);
  };

  const handleCloseDetail = () => {
    setSelectedLog(null);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (selectedLog) {
    return (
      <MaintenanceLogDetail
        log={selectedLog}
        onClose={handleCloseDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        userCurrency={userCurrency}
      />
    );
  }

  if (showForm) {
    return (
      <MaintenanceLogForm
        userId={userId}
        aircraftId={aircraftId}
        editingLog={editingLog}
        defaultCounters={counters}
        onSuccess={handleLogCreated}
        onCancel={handleCancelForm}
        onUpdateGlobalCounters={onUpdateGlobalCounters}
        userCurrency={userCurrency}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Maintenance Logs</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">New Maintenance Log</span>
        </Button>
      </div>
      <MaintenanceLogList
        logs={logs}
        onViewDetail={handleViewDetail}
      />
    </div>
  );
};

export default MaintenanceLogsPanel;
