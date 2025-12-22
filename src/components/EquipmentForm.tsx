import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Database, Json } from "@/integrations/supabase/types";

type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
type DirectiveCategory = Database["public"]["Enums"]["directive_category"];
type InstallContext = Database["public"]["Enums"]["install_context"];

const CATEGORIES: DirectiveCategory[] = [
  "Airframe",
  "Appliance",
  "Avionics",
  "Engine",
  "Other",
  "Propeller",
  "System",
];
const INSTALL_CONTEXTS: InstallContext[] = ["Installed", "Portable", "Tool", "Other"];

interface Link {
  url: string;
  description: string;
}

interface EquipmentFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingEquipment?: Equipment | null;
}

const EquipmentForm = ({ userId, onSuccess, onCancel, editingEquipment }: EquipmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editingEquipment?.name || "",
    category: (editingEquipment?.category || "Airframe") as DirectiveCategory,
    manufacturer: editingEquipment?.manufacturer || "",
    model_or_part_number: editingEquipment?.model_or_part_number || "",
    serial_number: editingEquipment?.serial_number || "",
    notes: editingEquipment?.notes || "",
    install_context: (editingEquipment?.install_context || "") as InstallContext | "",
    tags: editingEquipment?.tags?.join(", ") || "",
    purchase_date: editingEquipment?.purchase_date ? parseLocalDate(editingEquipment.purchase_date) : null as Date | null,
    installed_date: editingEquipment?.installed_date ? parseLocalDate(editingEquipment.installed_date) : null as Date | null,
    warranty_start_date: editingEquipment?.warranty_start_date ? parseLocalDate(editingEquipment.warranty_start_date) : null as Date | null,
    warranty_expiration_date: editingEquipment?.warranty_expiration_date ? parseLocalDate(editingEquipment.warranty_expiration_date) : null as Date | null,
    vendor: editingEquipment?.vendor || "",
  });

  const [links, setLinks] = useState<Link[]>(
    (editingEquipment?.links as unknown as Link[] | null) || []
  );

  const handleAddLink = () => {
    setLinks([...links, { url: "", description: "" }]);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: keyof Link, value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name.length > 200) {
      toast.error("Name must be 200 characters or less");
      return;
    }

    if (formData.notes.length > 1000) {
      toast.error("Notes must be 1000 characters or less");
      return;
    }

    // Validate links
    const validLinks = links.filter((link) => link.url.trim() !== "");
    for (const link of validLinks) {
      try {
        new URL(link.url);
      } catch {
        toast.error(`Invalid URL: ${link.url}`);
        return;
      }
    }

    setLoading(true);

    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const equipmentData = {
        user_id: userId,
        name: formData.name,
        category: formData.category,
        manufacturer: formData.manufacturer || null,
        model_or_part_number: formData.model_or_part_number || null,
        serial_number: formData.serial_number || null,
        notes: formData.notes || null,
        install_context: formData.install_context || null,
        tags: tagsArray,
        purchase_date: formData.purchase_date ? format(formData.purchase_date, "yyyy-MM-dd") : null,
        installed_date: formData.installed_date ? format(formData.installed_date, "yyyy-MM-dd") : null,
        warranty_start_date: formData.warranty_start_date ? format(formData.warranty_start_date, "yyyy-MM-dd") : null,
        warranty_expiration_date: formData.warranty_expiration_date ? format(formData.warranty_expiration_date, "yyyy-MM-dd") : null,
        vendor: formData.vendor || null,
        links: validLinks as unknown as Json,
      };

      if (editingEquipment) {
        const { error } = await supabase
          .from("equipment")
          .update(equipmentData)
          .eq("id", editingEquipment.id);

        if (error) throw error;
        toast.success("Equipment updated successfully!");
      } else {
        const { error } = await supabase.from("equipment").insert([equipmentData]);

        if (error) throw error;
        toast.success("Equipment created successfully!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-muted/50">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Required Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter equipment name..."
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{formData.name.length}/200 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as DirectiveCategory })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Optional Identity Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              placeholder="e.g., Garmin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_or_part_number">Model / Part Number</Label>
            <Input
              id="model_or_part_number"
              value={formData.model_or_part_number}
              onChange={(e) => setFormData({ ...formData, model_or_part_number: e.target.value })}
              placeholder="e.g., GNX 375"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="e.g., 12345678"
            />
          </div>
        </div>

        {/* Context & Classification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="install_context">Install Context</Label>
            <Select
              value={formData.install_context}
              onValueChange={(value) => setFormData({ ...formData, install_context: value as InstallContext })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select context..." />
              </SelectTrigger>
              <SelectContent>
                {INSTALL_CONTEXTS.map((ctx) => (
                  <SelectItem key={ctx} value={ctx}>
                    {ctx}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., avionics, navigation, required"
            />
          </div>
        </div>

        {/* Lifecycle & Warranty */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchase_date">Purchase Date</Label>
            <DateInput
              id="purchase_date"
              value={formData.purchase_date}
              onChange={(date) => setFormData({ ...formData, purchase_date: date })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="installed_date">Installed Date</Label>
            <DateInput
              id="installed_date"
              value={formData.installed_date}
              onChange={(date) => setFormData({ ...formData, installed_date: date })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warranty_start_date">Warranty Start</Label>
            <DateInput
              id="warranty_start_date"
              value={formData.warranty_start_date}
              onChange={(date) => setFormData({ ...formData, warranty_start_date: date })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warranty_expiration_date">Warranty Expiration</Label>
            <DateInput
              id="warranty_expiration_date"
              value={formData.warranty_expiration_date}
              onChange={(date) => setFormData({ ...formData, warranty_expiration_date: date })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input
            id="vendor"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            placeholder="e.g., Aircraft Spruce"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            maxLength={1000}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">{formData.notes.length}/1000 characters</p>
        </div>

        {/* Links */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Links</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>
              <Plus className="h-4 w-4 mr-1" />
              Add Link
            </Button>
          </div>
          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((link, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, "url", e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Input
                    value={link.description}
                    onChange={(e) => handleLinkChange(index, "description", e.target.value)}
                    placeholder="Description"
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLink(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading
              ? editingEquipment
                ? "Updating..."
                : "Creating..."
              : editingEquipment
                ? "Update Equipment"
                : "Create Equipment"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default EquipmentForm;
