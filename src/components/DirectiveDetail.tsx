import { useState, useEffect } from "react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, ExternalLink, Bell, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Directive } from "./DirectivesPanel";

interface DirectiveDetailProps {
  directive: Directive;
  userId: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

interface ComplianceEvent {
  id: string;
  compliance_status: string;
  compliance_date: string;
  counter_type: string | null;
  counter_value: number | null;
  owner_notes: string | null;
  compliance_links: Array<{ description: string; url: string }> | null;
  maintenance_log_id: string | null;
  created_at: string | null;
}

interface PendingNotification {
  id: string;
  description: string;
  initial_date: string;
  notification_basis: string;
  counter_type: string | null;
  initial_counter_value: number | null;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Emergency":
      return "destructive";
    case "Mandatory":
      return "default";
    case "Recommended":
      return "secondary";
    case "Informational":
      return "outline";
    default:
      return "secondary";
  }
};

const getComplianceStatusColor = (status: string) => {
  switch (status) {
    case "Complied Once":
    case "Recurring (Current)":
    case "Complied":
      return "default";
    case "Not Complied":
    case "Overdue":
      return "destructive";
    case "Not Applicable":
      return "secondary";
    default:
      return "outline";
  }
};

// Map database status to display status
const getDisplayStatus = (status: string) => {
  if (status === "Complied Once" || status === "Recurring (Current)") {
    return "Complied";
  }
  if (status === "Not Complied" || status === "Not Reviewed" || status === "Overdue") {
    return "Not Complied";
  }
  return status;
};

const DirectiveDetail = ({ directive, userId, onClose, onEdit, onDelete, onUpdate }: DirectiveDetailProps) => {
  const [complianceEvents, setComplianceEvents] = useState<ComplianceEvent[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComplianceEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("maintenance_directive_compliance")
        .select("*")
        .eq("user_id", userId)
        .eq("directive_id", directive.id)
        .order("compliance_date", { ascending: false });

      if (error) throw error;
      setComplianceEvents((data || []).map(item => ({
        ...item,
        compliance_links: item.compliance_links as Array<{ description: string; url: string }> | null
      })) as ComplianceEvent[]);
    } catch (error: any) {
      console.error("Error fetching compliance events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, description, initial_date, notification_basis, counter_type, initial_counter_value")
        .eq("user_id", userId)
        .eq("directive_id", directive.id)
        .eq("is_completed", false);

      if (error) throw error;
      setPendingNotifications(data || []);
    } catch (error: any) {
      console.error("Error fetching pending notifications:", error);
    }
  };

  useEffect(() => {
    fetchComplianceEvents();
    fetchPendingNotifications();
  }, [directive.id, userId]);

  // Calculate analysis summary data
  const complianceAnalysis = (() => {
    const compliedEvents = complianceEvents.filter(
      e => e.compliance_status === "Complied Once" || 
           e.compliance_status === "Recurring (Current)" ||
           e.compliance_status === "Complied"
    );
    
    if (compliedEvents.length === 0) {
      return null;
    }

    const eventDates = compliedEvents
      .map(e => e.compliance_date)
      .filter((d): d is string => d !== null)
      .sort();

    const firstComplianceDate = eventDates.length > 0 ? eventDates[0] : null;
    const lastComplianceDate = eventDates.length > 0 ? eventDates[eventDates.length - 1] : null;

    // Get counter info from the most recent complied event
    const isCounterBased = directive.initial_due_type === "By Total Time (Hours)";
    let lastCounterType: string | null = null;
    let lastCounterValue: number | null = null;

    if (isCounterBased && compliedEvents.length > 0) {
      // Find most recent event with counter data
      const eventWithCounter = compliedEvents.find(e => e.counter_value !== null);
      if (eventWithCounter) {
        lastCounterType = eventWithCounter.counter_type;
        lastCounterValue = eventWithCounter.counter_value;
      }
    }

    return {
      firstComplianceDate,
      lastComplianceDate,
      isCounterBased,
      lastCounterType,
      lastCounterValue,
      totalCompliedEvents: compliedEvents.length
    };
  })();


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Directive Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Directive</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this directive? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Analysis Summary Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Compliance Analysis
            </span>
            <Badge variant={directive.directive_status === "Active" ? "default" : "secondary"}>
              {directive.directive_status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Compliance Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">First Compliance</p>
              <p className="font-medium">
                {complianceAnalysis?.firstComplianceDate
                  ? format(parseLocalDate(complianceAnalysis.firstComplianceDate), "MMM dd, yyyy")
                  : "Not yet complied"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Compliance</p>
              <p className="font-medium">
                {complianceAnalysis?.lastComplianceDate
                  ? format(parseLocalDate(complianceAnalysis.lastComplianceDate), "MMM dd, yyyy")
                  : "Not yet complied"}
              </p>
            </div>
            {complianceAnalysis?.isCounterBased && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Counter Type</p>
                  <p className="font-medium">
                    {complianceAnalysis.lastCounterType || directive.initial_due_type === "By Total Time (Hours)" ? "Hours-based" : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Counter Value</p>
                  <p className="font-medium">
                    {complianceAnalysis.lastCounterValue !== null
                      ? `${complianceAnalysis.lastCounterValue} hrs`
                      : "Not recorded"}
                  </p>
                </div>
              </>
            )}
            {complianceAnalysis && (
              <div>
                <p className="text-sm text-muted-foreground">Total Compliance Events</p>
                <p className="font-medium">{complianceAnalysis.totalCompliedEvents}</p>
              </div>
            )}
          </div>

          {/* Pending Notifications */}
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Pending Notifications</p>
            </div>
            {pendingNotifications.length > 0 ? (
              <div className="space-y-2">
                {pendingNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between p-2 rounded-md bg-background border text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{notification.description}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {notification.notification_basis === "Date" ? (
                        <span>Due: {format(parseLocalDate(notification.initial_date), "MMM dd, yyyy")}</span>
                      ) : (
                        <span>
                          Due at {notification.initial_counter_value} hrs
                          {notification.counter_type && ` (${notification.counter_type})`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pending notifications for this directive.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Directive Info Card - Condensed View */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-mono text-muted-foreground">{directive.directive_code}</p>
              <CardTitle className="text-xl mt-1">{directive.title}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge variant={getSeverityColor(directive.severity) as any}>{directive.severity}</Badge>
              <Badge variant="outline">{directive.directive_status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Core Info Row */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>{" "}
              <span className="font-medium">{directive.directive_type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Category:</span>{" "}
              <span className="font-medium">{directive.category}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Scope:</span>{" "}
              <span className="font-medium">{directive.compliance_scope}</span>
            </div>
            {directive.issuing_authority && (
              <div>
                <span className="text-muted-foreground">Authority:</span>{" "}
                <span className="font-medium">{directive.issuing_authority}</span>
              </div>
            )}
            {directive.issue_date && (
              <div>
                <span className="text-muted-foreground">Issued:</span>{" "}
                <span className="font-medium">{format(parseLocalDate(directive.issue_date), "MMM dd, yyyy")}</span>
              </div>
            )}
            {directive.effective_date && (
              <div>
                <span className="text-muted-foreground">Effective:</span>{" "}
                <span className="font-medium">{format(parseLocalDate(directive.effective_date), "MMM dd, yyyy")}</span>
              </div>
            )}
            {directive.revision && (
              <div>
                <span className="text-muted-foreground">Revision:</span>{" "}
                <span className="font-medium">{directive.revision}</span>
              </div>
            )}
          </div>

          {/* Applicability Row - inline */}
          {((directive as any).applicability_category || (directive as any).applicability_model || directive.applicable_serial_range || directive.applicability_status) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-t pt-3">
              <span className="font-medium text-muted-foreground">Applicability:</span>
              {directive.applicability_status && (
                <Badge variant={directive.applicability_status === "Applies" ? "default" : "secondary"} className="text-xs">
                  {directive.applicability_status}
                </Badge>
              )}
              {directive.applicability_reason && (
                <span className="text-muted-foreground">({directive.applicability_reason})</span>
              )}
              {(directive as any).applicability_category && (
                <span>
                  <span className="text-muted-foreground">Category:</span> {(directive as any).applicability_category}
                </span>
              )}
              {(directive as any).applicability_model && (
                <span>
                  <span className="text-muted-foreground">Model:</span> {(directive as any).applicability_model}
                </span>
              )}
              {directive.applicable_serial_range && (
                <span>
                  <span className="text-muted-foreground">S/N:</span> {directive.applicable_serial_range}
                </span>
              )}
              {directive.applicability_notes && (
                <span className="basis-full text-muted-foreground text-xs mt-1">{directive.applicability_notes}</span>
              )}
            </div>
          )}

          {/* Compliance Requirements Row - inline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-t pt-3">
            <span className="font-medium text-muted-foreground">Compliance:</span>
            {directive.initial_due_type && (
              <span>
                <span className="text-muted-foreground">Initial:</span>{" "}
                <span className="font-medium">{directive.initial_due_type}</span>
              </span>
            )}
            {directive.initial_due_hours && (
              <span>
                <span className="text-muted-foreground">Due:</span>{" "}
                <span className="font-medium">{directive.initial_due_hours} hrs</span>
              </span>
            )}
            {directive.initial_due_months && (
              <span>
                <span className="text-muted-foreground">Due:</span>{" "}
                <span className="font-medium">{directive.initial_due_months} mo</span>
              </span>
            )}
            {directive.initial_due_date && (
              <span>
                <span className="text-muted-foreground">Due:</span>{" "}
                <span className="font-medium">{format(parseLocalDate(directive.initial_due_date), "MMM dd, yyyy")}</span>
              </span>
            )}
            {(directive.repeat_hours || directive.repeat_months) && (
              <span>
                <span className="text-muted-foreground">Repeat:</span>{" "}
                <span className="font-medium">
                  {directive.repeat_hours ? `${directive.repeat_hours} hrs` : `${directive.repeat_months} mo`}
                </span>
              </span>
            )}
            <span className={directive.requires_log_entry ? "text-primary" : "text-muted-foreground"}>
              {directive.requires_log_entry ? "✓" : "✗"} Logbook
            </span>
            <span className={directive.terminating_action_exists ? "text-primary" : "text-muted-foreground"}>
              {directive.terminating_action_exists ? "✓" : "✗"} Terminating
            </span>
          </div>

          {/* Action Types & Terminating Summary - only if present */}
          {(directive.action_types?.length > 0 || directive.terminating_action_summary) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {directive.action_types && directive.action_types.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Actions:</span>
                  {directive.action_types.map((action, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">{action}</Badge>
                  ))}
                </div>
              )}
              {directive.terminating_action_summary && (
                <span className="text-muted-foreground">
                  <strong>Terminating:</strong> {directive.terminating_action_summary}
                </span>
              )}
            </div>
          )}

          {/* Source Links - compact */}
          {directive.source_links && directive.source_links.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm border-t pt-3">
              <span className="text-muted-foreground">Sources:</span>
              {directive.source_links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.description || "Link"}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Events Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Aircraft Compliance Status</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Compliance events are managed through maintenance records.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : complianceEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Counter</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Badge variant={getComplianceStatusColor(event.compliance_status) as any}>
                        {getDisplayStatus(event.compliance_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.compliance_date
                        ? format(parseLocalDate(event.compliance_date), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {event.counter_value ? (
                        <span>
                          {event.counter_value} hrs
                          {event.counter_type && (
                            <span className="text-muted-foreground text-xs block">
                              {event.counter_type}
                            </span>
                          )}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {event.owner_notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">
              No compliance events recorded. Create a maintenance record and link this directive to record compliance.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectiveDetail;
