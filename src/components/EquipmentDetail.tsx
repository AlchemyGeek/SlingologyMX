import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Package, Calendar, Tag, ExternalLink, Building2, Pencil, Trash2 } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";

interface EquipmentDetailProps {
  equipment: any;
  onClose: () => void;
  onEdit?: (equipment: any) => void;
  onDelete?: (equipmentId: string) => void;
}

const EquipmentDetail = ({ equipment, onClose, onEdit, onDelete }: EquipmentDetailProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const links = equipment.links || [];

  const handleDelete = () => {
    if (onDelete) {
      onDelete(equipment.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(equipment)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{equipment.name}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{equipment.category}</Badge>
                {equipment.install_context && (
                  <Badge variant="outline">{equipment.install_context}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Equipment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{equipment.category}</p>
                </div>
              </div>
              {equipment.manufacturer && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Manufacturer</p>
                    <p className="font-medium">{equipment.manufacturer}</p>
                  </div>
                </div>
              )}
              {equipment.model_or_part_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Model / Part Number</p>
                  <p className="font-medium">{equipment.model_or_part_number}</p>
                </div>
              )}
              {equipment.serial_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Serial Number</p>
                  <p className="font-medium">{equipment.serial_number}</p>
                </div>
              )}
              {equipment.vendor && (
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{equipment.vendor}</p>
                </div>
              )}
              {equipment.install_context && (
                <div>
                  <p className="text-sm text-muted-foreground">Install Context</p>
                  <p className="font-medium">{equipment.install_context}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Important Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipment.purchase_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">
                      {format(parseLocalDate(equipment.purchase_date), "PPP")}
                    </p>
                  </div>
                </div>
              )}
              {equipment.installed_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Installed Date</p>
                    <p className="font-medium">
                      {format(parseLocalDate(equipment.installed_date), "PPP")}
                    </p>
                  </div>
                </div>
              )}
              {equipment.warranty_start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Warranty Start</p>
                    <p className="font-medium">
                      {format(parseLocalDate(equipment.warranty_start_date), "PPP")}
                    </p>
                  </div>
                </div>
              )}
              {equipment.warranty_expiration_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Warranty Expiration</p>
                    <p className="font-medium">
                      {format(parseLocalDate(equipment.warranty_expiration_date), "PPP")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {equipment.tags && equipment.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {equipment.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Links */}
          {links.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Links
                </h3>
                <div className="space-y-2">
                  {links.map((link: { description: string; url: string }, idx: number) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {link.description || link.url}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {equipment.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{equipment.notes}</p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {equipment.created_at
                    ? format(new Date(equipment.created_at), "PPP p")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {equipment.updated_at
                    ? format(new Date(equipment.updated_at), "PPP p")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this equipment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EquipmentDetail;
