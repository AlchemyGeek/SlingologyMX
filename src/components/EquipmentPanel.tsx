import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EquipmentForm from "./EquipmentForm";
import EquipmentList from "./EquipmentList";
import EquipmentDetail from "./EquipmentDetail";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Equipment = Database["public"]["Tables"]["equipment"]["Row"];

interface EquipmentPanelProps {
  userId: string;
  aircraftId: string;
  onRecordChanged?: () => void;
}

const EquipmentPanel = ({ userId, aircraftId, onRecordChanged }: EquipmentPanelProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("user_id", userId)
        .eq("aircraft_id", aircraftId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error: any) {
      toast.error("Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aircraftId) fetchEquipment();
  }, [userId, aircraftId]);

  const handleEquipmentCreated = () => {
    setShowForm(false);
    setEditingEquipment(null);
    fetchEquipment();
    onRecordChanged?.();
  };

  const handleEdit = (item: Equipment) => {
    setSelectedEquipment(null);
    setEditingEquipment(item);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEquipment(null);
  };

  const handleSelect = (item: Equipment) => {
    setSelectedEquipment(item);
  };

  const handleCloseDetail = () => {
    setSelectedEquipment(null);
  };

  const handleDelete = async (equipmentId: string) => {
    try {
      await supabase.from("notifications").delete().eq("equipment_id", equipmentId);
      const { error } = await supabase.from("equipment").delete().eq("id", equipmentId);
      if (error) throw error;
      toast.success("Equipment deleted");
      setSelectedEquipment(null);
      fetchEquipment();
      onRecordChanged?.();
    } catch (error: any) {
      toast.error("Failed to delete equipment");
    }
  };

  // Show detail view
  if (selectedEquipment) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EquipmentDetail
            equipment={selectedEquipment}
            onClose={handleCloseDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
            <CardTitle>Manage Equipment</CardTitle>
            <CardDescription>Track and manage your aircraft equipment and tools</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Equipment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <EquipmentForm
            userId={userId}
            aircraftId={aircraftId}
            onSuccess={handleEquipmentCreated}
            onCancel={handleCancelForm}
            editingEquipment={editingEquipment}
          />
        ) : (
          <EquipmentList
            equipment={equipment}
            loading={loading}
            onUpdate={() => {
              fetchEquipment();
              onRecordChanged?.();
            }}
            onEdit={handleEdit}
            onSelect={handleSelect}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentPanel;
