import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EquipmentForm from "./EquipmentForm";
import EquipmentList from "./EquipmentList";
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
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("user_id", userId)
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
    fetchEquipment();
  }, [userId]);

  const handleEquipmentCreated = () => {
    setShowForm(false);
    setEditingEquipment(null);
    fetchEquipment();
    onRecordChanged?.();
  };

  const handleEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEquipment(null);
  };

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
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentPanel;
