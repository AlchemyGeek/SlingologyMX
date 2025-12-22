import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";

type Equipment = Database["public"]["Tables"]["equipment"]["Row"];

interface EquipmentListProps {
  equipment: Equipment[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (equipment: Equipment) => void;
}

const EquipmentList = ({ equipment, loading, onUpdate, onEdit }: EquipmentListProps) => {
  const isMobile = useIsMobile();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
      toast.success("Equipment deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete equipment");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading equipment...</p>;
  }

  if (equipment.length === 0) {
    return <p className="text-muted-foreground">No equipment yet. Add your first one!</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <div className="min-w-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              {!isMobile && <TableHead>Context</TableHead>}
              {!isMobile && <TableHead>Manufacturer</TableHead>}
              {!isMobile && <TableHead>Model/Part #</TableHead>}
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                {!isMobile && <TableCell>{item.install_context || "—"}</TableCell>}
                {!isMobile && <TableCell>{item.manufacturer || "—"}</TableCell>}
                {!isMobile && <TableCell>{item.model_or_part_number || "—"}</TableCell>}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EquipmentList;
