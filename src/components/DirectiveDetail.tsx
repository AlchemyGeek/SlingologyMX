import { useState, useEffect } from "react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Directive } from "./DirectivesPanel";
import DirectiveComplianceForm from "./DirectiveComplianceForm";

interface DirectiveDetailProps {
  directive: Directive;
  userId: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

interface ComplianceStatus {
  id: string;
  applicability_status: string;
  applicability_reason: string | null;
  compliance_status: string;
  first_compliance_date: string | null;
  first_compliance_tach: number | null;
  last_compliance_date: string | null;
  last_compliance_tach: number | null;
  next_due_date: string | null;
  next_due_tach: number | null;
  performed_by_name: string | null;
  performed_by_role: string | null;
  owner_notes: string | null;
  compliance_links: Array<{ description: string; url: string }> | null;
  labor_hours_actual: number | null;
  labor_rate: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  maintenance_provider_name: string | null;
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

const DirectiveDetail = ({ directive, userId, onClose, onEdit, onDelete, onUpdate }: DirectiveDetailProps) => {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [showComplianceForm, setShowComplianceForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComplianceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("aircraft_directive_status")
        .select("*")
        .eq("user_id", userId)
        .eq("directive_id", directive.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setComplianceStatus({
          ...data,
          compliance_links: data.compliance_links as Array<{ description: string; url: string }> | null
        } as ComplianceStatus);
      } else {
        setComplianceStatus(null);
      }
    } catch (error: any) {
      console.error("Error fetching compliance status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceStatus();
  }, [directive.id, userId]);

  const handleComplianceUpdated = () => {
    setShowComplianceForm(false);
    fetchComplianceStatus();
    onUpdate();
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case "Complied Once":
      case "Recurring (Current)":
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

  if (showComplianceForm) {
    return (
      <DirectiveComplianceForm
        directive={directive}
        userId={userId}
        existingStatus={complianceStatus}
        onSuccess={handleComplianceUpdated}
        onCancel={() => setShowComplianceForm(false)}
      />
    );
  }

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
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
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
        <CardContent className="space-y-6">
          {/* Core Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{directive.directive_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{directive.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compliance Scope</p>
              <p className="font-medium">{directive.compliance_scope}</p>
            </div>
            {directive.issuing_authority && (
              <div>
                <p className="text-sm text-muted-foreground">Issuing Authority</p>
                <p className="font-medium">{directive.issuing_authority}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {directive.issue_date && (
              <div>
                <p className="text-sm text-muted-foreground">Issue Date</p>
                <p className="font-medium">{format(parseLocalDate(directive.issue_date), "MMM dd, yyyy")}</p>
              </div>
            )}
            {directive.effective_date && (
              <div>
                <p className="text-sm text-muted-foreground">Effective Date</p>
                <p className="font-medium">{format(parseLocalDate(directive.effective_date), "MMM dd, yyyy")}</p>
              </div>
            )}
            {directive.revision && (
              <div>
                <p className="text-sm text-muted-foreground">Revision</p>
                <p className="font-medium">{directive.revision}</p>
              </div>
            )}
          </div>

          {/* Applicability */}
          {(directive.aircraft_make_model_filter || directive.engine_model_filter || directive.prop_model_filter || directive.applicable_serial_range) && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Applicability</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {directive.aircraft_make_model_filter && (
                    <div>
                      <p className="text-sm text-muted-foreground">Aircraft Models</p>
                      <p className="font-medium">{directive.aircraft_make_model_filter}</p>
                    </div>
                  )}
                  {directive.engine_model_filter && (
                    <div>
                      <p className="text-sm text-muted-foreground">Engine Models</p>
                      <p className="font-medium">{directive.engine_model_filter}</p>
                    </div>
                  )}
                  {directive.prop_model_filter && (
                    <div>
                      <p className="text-sm text-muted-foreground">Propeller Models</p>
                      <p className="font-medium">{directive.prop_model_filter}</p>
                    </div>
                  )}
                  {directive.applicable_serial_range && (
                    <div>
                      <p className="text-sm text-muted-foreground">Serial Range</p>
                      <p className="font-medium">{directive.applicable_serial_range}</p>
                    </div>
                  )}
                </div>
                {directive.applicability_notes && (
                  <p className="text-sm text-muted-foreground mt-2">{directive.applicability_notes}</p>
                )}
              </div>
            </>
          )}

          {/* Compliance Requirements */}
          <Separator />
          <div>
            <h4 className="font-medium mb-3">Compliance Requirements</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {directive.initial_due_type && (
                <div>
                  <p className="text-sm text-muted-foreground">Initial Due</p>
                  <p className="font-medium">{directive.initial_due_type}</p>
                </div>
              )}
              {directive.initial_due_hours && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Hours</p>
                  <p className="font-medium">{directive.initial_due_hours} hrs</p>
                </div>
              )}
              {directive.initial_due_months && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Months</p>
                  <p className="font-medium">{directive.initial_due_months} months</p>
                </div>
              )}
              {directive.initial_due_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{format(parseLocalDate(directive.initial_due_date), "MMM dd, yyyy")}</p>
                </div>
              )}
              {directive.repeat_hours && (
                <div>
                  <p className="text-sm text-muted-foreground">Repeat Every</p>
                  <p className="font-medium">{directive.repeat_hours} hrs</p>
                </div>
              )}
              {directive.repeat_months && (
                <div>
                  <p className="text-sm text-muted-foreground">Repeat Every</p>
                  <p className="font-medium">{directive.repeat_months} months</p>
                </div>
              )}
            </div>
            {directive.action_types && directive.action_types.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-1">Action Types</p>
                <div className="flex gap-1 flex-wrap">
                  {directive.action_types.map((action, index) => (
                    <Badge key={index} variant="secondary">{action}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-4 mt-3 text-sm">
              <span className={directive.requires_log_entry ? "text-primary" : "text-muted-foreground"}>
                {directive.requires_log_entry ? "✓" : "✗"} Logbook Entry Required
              </span>
              <span className={directive.terminating_action_exists ? "text-primary" : "text-muted-foreground"}>
                {directive.terminating_action_exists ? "✓" : "✗"} Terminating Action Available
              </span>
            </div>
            {directive.terminating_action_summary && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Terminating Action:</strong> {directive.terminating_action_summary}
              </p>
            )}
          </div>

          {/* Source Links */}
          {directive.source_links && directive.source_links.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Source Documents</h4>
                <ul className="space-y-2">
                  {directive.source_links.map((link, index) => (
                    <li key={index}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {link.description || link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Compliance Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">My Aircraft Compliance Status</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowComplianceForm(true)}>
              {complianceStatus ? "Update Status" : "Set Status"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : complianceStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Applicability</p>
                  <Badge variant={complianceStatus.applicability_status === "Applies" ? "default" : "secondary"}>
                    {complianceStatus.applicability_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Compliance Status</p>
                  <Badge variant={getComplianceStatusColor(complianceStatus.compliance_status) as any}>
                    {complianceStatus.compliance_status}
                  </Badge>
                </div>
                {complianceStatus.last_compliance_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Complied</p>
                    <p className="font-medium">{format(parseLocalDate(complianceStatus.last_compliance_date), "MMM dd, yyyy")}</p>
                  </div>
                )}
                {complianceStatus.next_due_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Next Due</p>
                    <p className="font-medium">{format(parseLocalDate(complianceStatus.next_due_date), "MMM dd, yyyy")}</p>
                  </div>
                )}
              </div>
              {complianceStatus.owner_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{complianceStatus.owner_notes}</p>
                </div>
              )}
              {complianceStatus.compliance_links && complianceStatus.compliance_links.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Evidence</p>
                  <ul className="space-y-1">
                    {complianceStatus.compliance_links.map((link, index) => (
                      <li key={index}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {link.description || link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No compliance status set for this directive. Click "Set Status" to track your compliance.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectiveDetail;
