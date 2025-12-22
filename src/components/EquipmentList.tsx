import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Equipment = Database["public"]["Tables"]["equipment"]["Row"];

interface EquipmentListProps {
  equipment: Equipment[];
  loading: boolean;
  onUpdate: () => void;
  onEdit: (equipment: Equipment) => void;
}

const CATEGORIES = [
  "Airframe",
  "Appliance",
  "Avionics",
  "Engine",
  "Other",
  "Propeller",
  "System",
] as const;

const INSTALL_CONTEXTS = ["Installed", "Portable", "Tool", "Other"] as const;

const getContextColor = (context: string | null) => {
  switch (context) {
    case "Installed":
      return "default";
    case "Portable":
      return "secondary";
    case "Tool":
      return "outline";
    case "Other":
      return "secondary";
    default:
      return "outline";
  }
};

const EquipmentList = ({ equipment, loading, onUpdate, onEdit }: EquipmentListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [contextFilter, setContextFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "category" | "date">("name");

  const handleDelete = async (id: string) => {
    try {
      // Delete linked notification first (if any)
      await supabase.from("notifications").delete().eq("equipment_id", id);
      
      // Delete the equipment
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

  const filteredAndSortedEquipment = equipment
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (item.model_or_part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesContext = contextFilter === "all" || item.install_context === contextFilter;
      return matchesSearch && matchesCategory && matchesContext;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "category") {
        return a.category.localeCompare(b.category);
      }
      if (sortBy === "date") {
        const dateA = a.created_at || "";
        const dateB = b.created_at || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      return 0;
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search by name, manufacturer, model, or serial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={contextFilter} onValueChange={setContextFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contexts</SelectItem>
            {INSTALL_CONTEXTS.map((ctx) => (
              <SelectItem key={ctx} value={ctx}>
                {ctx}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: "name" | "category" | "date") => setSortBy(value)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="category">Sort by Category</SelectItem>
            <SelectItem value="date">Sort by Date Added</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hide-at-900">Context</TableHead>
              <TableHead className="hide-at-700">Manufacturer</TableHead>
              <TableHead className="hide-at-700">Model/Part #</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No equipment found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="hide-at-900">
                    {item.install_context ? (
                      <Badge variant={getContextColor(item.install_context) as any}>
                        {item.install_context}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hide-at-700">{item.manufacturer || "—"}</TableCell>
                  <TableCell className="hide-at-700">{item.model_or_part_number || "—"}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EquipmentList;
