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
import { X } from "lucide-react";
import { TagInput } from "@/components/ui/tag-input";
import type { Database, Json } from "@/integrations/supabase/types";

type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
type DirectiveCategory = Database["public"]["Enums"]["directive_category"];
type InstallContext = Database["public"]["Enums"]["install_context"];

const CATEGORIES: DirectiveCategory[] = ["Airframe", "Appliance", "Avionics", "Engine", "Other", "Propeller", "System"];
const INSTALL_CONTEXTS: InstallContext[] = ["Installed", "Portable", "Tool", "Other"];

interface EquipmentFormProps {
  userId: string;
  aircraftId: string;
  onSuccess: () => void;
  onCancel: () => void;
  editingEquipment?: Equipment | null;
}

const EquipmentForm = ({ userId, aircraftId, onSuccess, onCancel, editingEquipment }: EquipmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editingEquipment?.name || "",
    category: (editingEquipment?.category || "Airframe") as DirectiveCategory,
    manufacturer: editingEquipment?.manufacturer || "",
    model_or_part_number: editingEquipment?.model_or_part_number || "",
    serial_number: editingEquipment?.serial_number || "",
    notes: editingEquipment?.notes || "",
    install_context: (editingEquipment?.install_context || "") as InstallContext | "",
    tags: editingEquipment?.tags || ([] as string[]),
    purchase_date: editingEquipment?.purchase_date
      ? parseLocalDate(editingEquipment.purchase_date)
      : (null as Date | null),
    installed_date: editingEquipment?.installed_date
      ? parseLocalDate(editingEquipment.installed_date)
      : (null as Date | null),
    warranty_start_date: editingEquipment?.warranty_start_date
      ? parseLocalDate(editingEquipment.warranty_start_date)
      : (null as Date | null),
    warranty_expiration_date: editingEquipment?.warranty_expiration_date
      ? parseLocalDate(editingEquipment.warranty_expiration_date)
      : (null as Date | null),
    vendor: editingEquipment?.vendor || "",
    links:
      (editingEquipment?.links as unknown as Array<{ url: string; description: string }> | null) ||
      ([] as Array<{ url: string; description: string }>),
  });

  const [linkDescInput, setLinkDescInput] = useState("");
  const [linkUrlInput, setLinkUrlInput] = useState("");

  const handleAddLink = () => {
    if (linkUrlInput.trim()) {
      try {
        new URL(linkUrlInput.trim());
        setFormData({
          ...formData,
          links: [...formData.links, { url: linkUrlInput.trim(), description: linkDescInput.trim() }],
        });
        setLinkDescInput("");
        setLinkUrlInput("");
      } catch {
        toast.error("Please enter a valid URL");
      }
    }
  };

  const handleRemoveLink = (index: number) => {
    setFormData({ ...formData, links: formData.links.filter((_, i) => i !== index) });
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

    setLoading(true);

    try {
      const equipmentData = {
        user_id: userId,
        aircraft_id: aircraftId,
        name: formData.name,
        category: formData.category,
        manufacturer: formData.manufacturer || null,
        model_or_part_number: formData.model_or_part_number || null,
        serial_number: formData.serial_number || null,
        notes: formData.notes || null,
        install_context: formData.install_context || null,
        tags: formData.tags,
        purchase_date: formData.purchase_date ? format(formData.purchase_date, "yyyy-MM-dd") : null,
        installed_date: formData.installed_date ? format(formData.installed_date, "yyyy-MM-dd") : null,
        warranty_start_date: formData.warranty_start_date ? format(formData.warranty_start_date, "yyyy-MM-dd") : null,
        warranty_expiration_date: formData.warranty_expiration_date
          ? format(formData.warranty_expiration_date, "yyyy-MM-dd")
          : null,
        vendor: formData.vendor || null,
        links: formData.links as unknown as Json,
      };

      const hasWarrantyExpiration = !!formData.warranty_expiration_date;
      const warrantyExpirationStr = formData.warranty_expiration_date
        ? format(formData.warranty_expiration_date, "yyyy-MM-dd")
        : null;

      if (editingEquipment) {
        const { error } = await supabase.from("equipment").update(equipmentData).eq("id", editingEquipment.id);

        if (error) throw error;

        // Handle linked notification for warranty expiration
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("equipment_id", editingEquipment.id)
          .maybeSingle();

        if (hasWarrantyExpiration) {
          const notificationData = {
            description: `Warranty Expiration: ${formData.name}`,
            notes: formData.notes || null,
            type: "Other" as const,
            initial_date: warrantyExpirationStr!,
            recurrence: "None" as const,
            alert_days: 30,
            notification_basis: "Date" as const,
          };

          if (existingNotif) {
            // Update existing notification
            await supabase
              .from("notifications")
              .update(notificationData)
              .eq("equipment_id", editingEquipment.id);
          } else {
            // Create new notification
            await supabase.from("notifications").insert([{
              user_id: userId,
              aircraft_id: aircraftId,
              equipment_id: editingEquipment.id,
              ...notificationData,
            }]);
            toast.info("A warranty expiration notification has been created.");
          }
        } else if (existingNotif) {
          // Delete notification if warranty date removed
          await supabase
            .from("notifications")
            .delete()
            .eq("equipment_id", editingEquipment.id);
        }

        toast.success("Equipment updated successfully!");
      } else {
        // Create equipment
        const { data: newEquipment, error } = await supabase
          .from("equipment")
          .insert([equipmentData])
          .select()
          .single();

        if (error) throw error;

        // Create linked notification if warranty expiration is set
        if (hasWarrantyExpiration && newEquipment) {
          await supabase.from("notifications").insert([{
            user_id: userId,
            aircraft_id: aircraftId,
            equipment_id: newEquipment.id,
            description: `Warranty Expiration: ${formData.name}`,
            notes: formData.notes || null,
            type: "Other" as const,
            initial_date: warrantyExpirationStr!,
            recurrence: "None" as const,
            alert_days: 30,
            notification_basis: "Date" as const,
          }]);
          toast.success("Equipment created with warranty expiration notification!");
        } else {
          toast.success("Equipment created successfully!");
        }
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
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
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
            <Label>Tags</Label>
            <TagInput
              userId={userId}
              tags={formData.tags}
              onTagsChange={(tags) => setFormData({ ...formData, tags })}
              source="equipment"
            />
          </div>
        </div>

        {/* Lifecycle & Warranty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Label>Links</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="link_desc_input" className="text-sm">
                Description (optional)
              </Label>
              <Input
                id="link_desc_input"
                value={linkDescInput}
                onChange={(e) => setLinkDescInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLink())}
                maxLength={100}
                placeholder="Manual, datasheet, etc."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="link_url_input" className="text-sm">
                URL Link
              </Label>
              <Input
                id="link_url_input"
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLink())}
                maxLength={255}
                placeholder="https://example.com/manual.pdf"
              />
            </div>
          </div>
          <Button type="button" onClick={handleAddLink} size="sm" className="mt-2">
            Add Link
          </Button>
          <div className="space-y-1 mt-2">
            {formData.links.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline block truncate"
                  >
                    {link.description || link.url}
                  </a>
                </div>
                <X
                  className="h-4 w-4 cursor-pointer flex-shrink-0 hover:text-destructive"
                  onClick={() => handleRemoveLink(index)}
                />
              </div>
            ))}
          </div>
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
