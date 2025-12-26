import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MaintenanceLogList from "./MaintenanceLogList";
import MaintenanceLogForm from "./MaintenanceLogForm";
import MaintenanceLogDetail from "./MaintenanceLogDetail";
import { AircraftCounters } from "@/hooks/useAircraftCounters";

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
  vendor_name: string | null;
  invoice_number: string | null;
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
  onUpdateGlobalCounters?: (updates: CounterUpdates) => Promise<void>;
  onRecordChanged?: () => void;
}

const MaintenanceLogsPanel = ({ userId, aircraftId, counters, onUpdateGlobalCounters, onRecordChanged }: MaintenanceLogsPanelProps) => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .order("date_performed", { ascending: false });

      if (error) throw error;
      setLogs((data as unknown as MaintenanceLog[]) || []);
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

  const handleDelete = async (logId: string) => {
    try {
      // Delete linked notifications that haven't been modified by user
      await supabase
        .from("notifications")
        .delete()
        .eq("maintenance_log_id", logId)
        .eq("user_modified", false);
      
      // Delete linked compliance records
      await supabase
        .from("maintenance_directive_compliance")
        .delete()
        .eq("maintenance_log_id", logId);
      
      const { error } = await supabase
        .from("maintenance_logs")
        .delete()
        .eq("id", logId);

      if (error) throw error;
      toast.success("Maintenance log deleted");
      setSelectedLog(null);
      fetchLogs();
      onRecordChanged?.();
    } catch (error) {
      console.error("Error deleting maintenance log:", error);
      toast.error("Failed to delete maintenance log");
    }
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
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Maintenance Logs</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Log Entry
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
