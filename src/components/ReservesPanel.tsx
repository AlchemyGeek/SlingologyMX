import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ReserveForm from "./ReserveForm";
import ReserveList from "./ReserveList";
import ReserveDetail from "./ReserveDetail";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { toast } from "sonner";

export interface Reserve {
  id: string;
  user_id: string;
  aircraft_id: string;
  title: string;
  reserve_type: "Engine" | "Propeller" | "Gearbox" | "Parachute" | "Battery" | "Avionics" | "Other";
  basis_type: "Calendar" | "Hours" | "Cycles";
  interval_value: number | null;
  interval_unit: "Months" | "Years" | null;
  start_date: string | null;
  limit_hours: number | null;
  counter_type: string | null;
  start_counter_value: number | null;
  limit_cycles: number | null;
  start_cycle_count: number | null;
  expected_cost: number | null;
  currency: string;
  cost_estimate_date: string | null;
  cost_source_notes: string | null;
  accrual_method: "Straight-line" | "None";
  include_in_cost_per_hour: boolean;
  status: "Active" | "Paused" | "Retired";
  equipment_id: string | null;
  maintenance_log_id: string | null;
  notes: string | null;
  links: Array<{ url: string; description: string }> | null;
  created_at: string;
  updated_at: string;
}

interface ReservesPanelProps {
  userId: string;
  aircraftId: string;
  currentCounters?: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
  onRecordChanged?: () => void;
}

const ReservesPanel = ({ userId, aircraftId, currentCounters, onRecordChanged }: ReservesPanelProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingReserve, setEditingReserve] = useState<Reserve | null>(null);
  const [selectedReserve, setSelectedReserve] = useState<Reserve | null>(null);
  const [reserves, setReserves] = useState<Reserve[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency: userCurrency } = useUserCurrency(userId);

  const fetchReserves = async () => {
    if (!aircraftId) return;

    try {
      const { data, error } = await supabase
        .from("reserves" as any)
        .select("*")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReserves((data as unknown as Reserve[]) || []);
    } catch (error: any) {
      toast.error("Failed to load reserves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReserves();
  }, [userId, aircraftId]);

  const handleReserveCreated = () => {
    setShowForm(false);
    setEditingReserve(null);
    fetchReserves();
    onRecordChanged?.();
  };

  const handleEdit = (reserve: Reserve) => {
    setSelectedReserve(null);
    setEditingReserve(reserve);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingReserve(null);
  };

  const handleSelect = (reserve: Reserve) => {
    setSelectedReserve(reserve);
  };

  const handleCloseDetail = () => {
    setSelectedReserve(null);
  };

  const handleDelete = async (reserveId: string) => {
    try {
      const { error } = await supabase.from("reserves" as any).delete().eq("id", reserveId);
      if (error) throw error;
      toast.success("Reserve deleted");
      setSelectedReserve(null);
      fetchReserves();
      onRecordChanged?.();
    } catch (error: any) {
      toast.error("Failed to delete reserve");
    }
  };

  // Show detail view
  if (selectedReserve) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ReserveDetail
            reserve={selectedReserve}
            onClose={handleCloseDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            userCurrency={userCurrency}
            currentCounters={currentCounters}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Reserves</CardTitle>
            <CardDescription>Track future major expenses like overhauls and replacements</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Reserve
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <ReserveForm
            userId={userId}
            aircraftId={aircraftId}
            onSuccess={handleReserveCreated}
            onCancel={handleCancelForm}
            editingReserve={editingReserve}
            userCurrency={userCurrency}
          />
        ) : (
          <ReserveList
            reserves={reserves}
            loading={loading}
            onUpdate={() => {
              fetchReserves();
              onRecordChanged?.();
            }}
            onEdit={handleEdit}
            onSelect={handleSelect}
            userCurrency={userCurrency}
            currentCounters={currentCounters}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ReservesPanel;
