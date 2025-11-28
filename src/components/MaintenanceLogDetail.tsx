import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

interface MaintenanceLogDetailProps {
  log: any;
  onClose: () => void;
  onEdit: (log: any) => void;
  onDelete: (logId: string) => void;
}

const MaintenanceLogDetail = ({ log, onClose, onEdit, onDelete }: MaintenanceLogDetailProps) => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(log)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to delete this maintenance log?")) {
                onDelete(log.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>{log.entry_title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Badge>{log.category}</Badge>
              <Badge variant="secondary">{log.subcategory}</Badge>
              {log.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground">
              Performed on {format(new Date(log.date_performed), "MMMM dd, yyyy")}
            </p>
          </CardContent>
        </Card>

        {/* Time & Usage */}
        {(log.hobbs_at_event || log.tach_at_event || log.airframe_total_time || log.engine_total_time || log.prop_total_time) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Time & Usage</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {log.hobbs_at_event && (
                <div>
                  <p className="text-sm text-muted-foreground">Hobbs at Event</p>
                  <p className="font-medium">{log.hobbs_at_event}</p>
                </div>
              )}
              {log.tach_at_event && (
                <div>
                  <p className="text-sm text-muted-foreground">Tach at Event</p>
                  <p className="font-medium">{log.tach_at_event}</p>
                </div>
              )}
              {log.airframe_total_time && (
                <div>
                  <p className="text-sm text-muted-foreground">Airframe Total Time</p>
                  <p className="font-medium">{log.airframe_total_time}</p>
                </div>
              )}
              {log.engine_total_time && (
                <div>
                  <p className="text-sm text-muted-foreground">Engine Total Time</p>
                  <p className="font-medium">{log.engine_total_time}</p>
                </div>
              )}
              {log.prop_total_time && (
                <div>
                  <p className="text-sm text-muted-foreground">Prop Total Time</p>
                  <p className="font-medium">{log.prop_total_time}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Compliance */}
        {log.has_compliance_item && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Type</p>
                <p className="font-medium">{log.compliance_type}</p>
              </div>
              {log.compliance_reference && (
                <div>
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="font-medium">{log.compliance_reference}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Recurring</p>
                <p className="font-medium">{log.recurring_compliance ? "Yes" : "No"}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next-Due Tracking */}
        {log.is_recurring_task && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next-Due Tracking</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Interval Type</p>
                <p className="font-medium">{log.interval_type}</p>
              </div>
              {log.interval_hours && (
                <div>
                  <p className="text-sm text-muted-foreground">Interval Hours</p>
                  <p className="font-medium">{log.interval_hours}</p>
                </div>
              )}
              {log.interval_months && (
                <div>
                  <p className="text-sm text-muted-foreground">Interval Months</p>
                  <p className="font-medium">{log.interval_months}</p>
                </div>
              )}
              {log.next_due_hours && (
                <div>
                  <p className="text-sm text-muted-foreground">Next Due Hours</p>
                  <p className="font-medium">{log.next_due_hours}</p>
                </div>
              )}
              {log.next_due_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Next Due Date</p>
                  <p className="font-medium">{format(new Date(log.next_due_date), "MMM dd, yyyy")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Performed By */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performed By</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{log.performed_by_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{log.performed_by_name}</p>
            </div>
            {log.organization && (
              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-medium">{log.organization}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Information */}
        {(log.parts_cost || log.labor_cost || log.other_cost || log.total_cost) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {log.parts_cost && (
                <div>
                  <p className="text-sm text-muted-foreground">Parts Cost</p>
                  <p className="font-medium">${log.parts_cost.toFixed(2)}</p>
                </div>
              )}
              {log.labor_cost && (
                <div>
                  <p className="text-sm text-muted-foreground">Labor Cost</p>
                  <p className="font-medium">${log.labor_cost.toFixed(2)}</p>
                </div>
              )}
              {log.other_cost && (
                <div>
                  <p className="text-sm text-muted-foreground">Other Cost</p>
                  <p className="font-medium">${log.other_cost.toFixed(2)}</p>
                </div>
              )}
              {log.total_cost && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="font-medium">${log.total_cost.toFixed(2)}</p>
                </div>
              )}
              {log.vendor_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{log.vendor_name}</p>
                </div>
              )}
              {log.invoice_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Invoice #</p>
                  <p className="font-medium">{log.invoice_number}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {log.attachment_urls && log.attachment_urls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {log.attachment_urls.map((attachment: { url: string; description?: string }, index: number) => (
                  <li key={index} className="border-b last:border-b-0 pb-2 last:pb-0">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm font-medium block"
                    >
                      {attachment.url}
                    </a>
                    {attachment.description && (
                      <p className="text-sm text-muted-foreground mt-1">{attachment.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Internal Notes */}
        {log.internal_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{log.internal_notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MaintenanceLogDetail;
