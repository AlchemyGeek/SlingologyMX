import { useState } from "react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  ThumbsUp,
  ThumbsDown,
  User,
  ExternalLink,
  Calendar,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CommunitySBWithMaintainer } from "@/types/communitySB";
import { useCommunitySBFeedback } from "@/hooks/useCommunitySBs";

interface CommunitySBDetailProps {
  sb: CommunitySBWithMaintainer;
  userId: string;
  aircraftId: string;
  onClose: () => void;
  onUsed: () => void;
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

const CommunitySBDetail = ({
  sb,
  userId,
  aircraftId,
  onClose,
  onUsed,
}: CommunitySBDetailProps) => {
  const { feedback, userVote, submitVote, refetch } = useCommunitySBFeedback(sb.id, userId);
  const [showDownvoteDialog, setShowDownvoteDialog] = useState(false);
  const [downvoteReason, setDownvoteReason] = useState("");
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  const upvoteCount = feedback.filter((f) => f.vote_type === 1).length;
  const downvoteCount = feedback.filter((f) => f.vote_type === -1).length;

  const handleUpvote = () => {
    submitVote(1);
  };

  const handleDownvote = () => {
    if (userVote === -1) {
      // Remove downvote
      submitVote(-1);
    } else {
      // Show reason dialog
      setShowDownvoteDialog(true);
    }
  };

  const submitDownvote = () => {
    submitVote(-1, downvoteReason || undefined);
    setShowDownvoteDialog(false);
    setDownvoteReason("");
  };

  const handleUseSB = async () => {
    if (!aircraftId) {
      toast.error("Please select an aircraft first");
      return;
    }

    setImporting(true);
    try {
      // Create a local directive from the community SB
      const { data: newDirective, error: directiveError } = await supabase
        .from("directives")
        .insert({
          user_id: userId,
          aircraft_id: aircraftId,
          directive_type: sb.directive_type as any,
          severity: sb.severity as any,
          directive_status: sb.directive_status as any,
          category: sb.category as any,
          compliance_scope: sb.compliance_scope as any,
          directive_code: sb.directive_code,
          title: sb.title,
          issuing_authority: sb.issuing_authority,
          revision: sb.revision,
          issue_date: sb.issue_date,
          effective_date: sb.effective_date,
          initial_due_type: sb.initial_due_type as any,
          initial_due_hours: sb.initial_due_hours,
          initial_due_months: sb.initial_due_months,
          repeat_hours: sb.repeat_hours,
          repeat_months: sb.repeat_months,
          counter_type: sb.counter_type,
          applicable_serial_range: sb.applicable_serial_range,
          applicability_notes: sb.applicability_notes,
          applicability_model: sb.applicability_model,
          equipment_name: sb.equipment_name,
          equipment_model: sb.equipment_model,
          software_version: sb.software_version,
          database_version: sb.database_version,
          action_types: sb.action_types,
          terminating_action_exists: sb.terminating_action_exists,
          terminating_action_summary: sb.terminating_action_summary,
          requires_log_entry: sb.requires_log_entry,
          source_links: sb.source_links as any,
          applicability_status: "Unsure",
        })
        .select("id")
        .single();

      if (directiveError) throw directiveError;

      // Create usage tracking record
      const { error: usageError } = await supabase.from("community_sb_usage").insert({
        community_sb_id: sb.id,
        local_directive_id: newDirective.id,
        user_id: userId,
        used_version_number: sb.version_number,
        last_seen_version: sb.version_number,
        is_modified: false,
      } as any);

      if (usageError) {
        console.error("Failed to create usage record:", usageError);
        // Don't fail the operation for this
      }

      toast.success("Community SB added to your directives!");
      setShowUseDialog(false);
      onUsed();
    } catch (err: any) {
      console.error("Error using community SB:", err);
      toast.error("Failed to add community SB to your directives");
    } finally {
      setImporting(false);
    }
  };

  // Get maintainer feedback for display
  const downvoteReasons = feedback
    .filter((f) => f.vote_type === -1 && f.reason)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Community SBs
        </Button>
        <Button onClick={() => setShowUseDialog(true)}>
          <Download className="h-4 w-4 mr-2" />
          Use This SB
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="bg-accent border border-border rounded-lg p-3 text-sm flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Interpretation only:</strong> This is a community-contributed
          interpretation. Always verify against original manufacturer documentation before making
          compliance decisions.
        </p>
      </div>

      {/* Community Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-mono text-muted-foreground">{sb.directive_code}</p>
              <CardTitle className="text-xl mt-1">{sb.title}</CardTitle>
            </div>
            <Badge variant={getSeverityColor(sb.severity) as any}>{sb.severity}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Maintainer & Version Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Maintained by: </span>
              <span className="font-medium text-foreground">
                {sb.maintainer_display_name || "Unknown"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Version {sb.version_number}
                {sb.updated_at && (
                  <> • Updated {format(new Date(sb.updated_at), "MMM dd, yyyy")}</>
                )}
              </span>
            </div>
          </div>

          {/* Voting Section */}
          <Separator />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Community Feedback:</span>
            <div className="flex items-center gap-2">
              <Button
                variant={userVote === 1 ? "default" : "outline"}
                size="sm"
                onClick={handleUpvote}
                className="gap-1"
              >
                <ThumbsUp className="h-4 w-4" />
                {upvoteCount}
              </Button>
              <Button
                variant={userVote === -1 ? "destructive" : "outline"}
                size="sm"
                onClick={handleDownvote}
                className="gap-1"
              >
                <ThumbsDown className="h-4 w-4" />
                {downvoteCount}
              </Button>
            </div>
          </div>

          {/* Show some feedback reasons if available */}
          {downvoteReasons.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Recent feedback:</p>
              {downvoteReasons.map((f) => (
                <div
                  key={f.id}
                  className="text-xs bg-background rounded p-2 border flex items-start justify-between"
                >
                  <span className="text-muted-foreground">{f.reason}</span>
                  {f.maintainer_status && (
                    <Badge variant="outline" className="text-xs">
                      {f.maintainer_status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Maintainer's description */}
          {sb.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Maintainer's Notes:</p>
                <p className="text-sm text-muted-foreground">{sb.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SB Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Service Bulletin Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Core Info Row */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>{" "}
              <span className="font-medium">{sb.directive_type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Category:</span>{" "}
              <span className="font-medium">{sb.category}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Scope:</span>{" "}
              <span className="font-medium">{sb.compliance_scope}</span>
            </div>
            {sb.issuing_authority && (
              <div>
                <span className="text-muted-foreground">Authority:</span>{" "}
                <span className="font-medium">{sb.issuing_authority}</span>
              </div>
            )}
            {sb.issue_date && (
              <div>
                <span className="text-muted-foreground">Issued:</span>{" "}
                <span className="font-medium">
                  {format(parseLocalDate(sb.issue_date), "MMM dd, yyyy")}
                </span>
              </div>
            )}
            {sb.effective_date && (
              <div>
                <span className="text-muted-foreground">Effective:</span>{" "}
                <span className="font-medium">
                  {format(parseLocalDate(sb.effective_date), "MMM dd, yyyy")}
                </span>
              </div>
            )}
            {sb.revision && (
              <div>
                <span className="text-muted-foreground">Revision:</span>{" "}
                <span className="font-medium">{sb.revision}</span>
              </div>
            )}
          </div>

          {/* Equipment Info */}
          {(sb.equipment_name || sb.equipment_model) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-t pt-3">
              <span className="font-medium text-muted-foreground">Equipment:</span>
              {sb.equipment_name && (
                <span>
                  <span className="text-muted-foreground">Name:</span> {sb.equipment_name}
                </span>
              )}
              {sb.equipment_model && (
                <span>
                  <span className="text-muted-foreground">Model:</span> {sb.equipment_model}
                </span>
              )}
            </div>
          )}

          {/* Applicability */}
          {(sb.applicability_model || sb.applicable_serial_range || sb.applicability_notes) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-t pt-3">
              <span className="font-medium text-muted-foreground">Applicability:</span>
              {sb.applicability_model && (
                <span>
                  <span className="text-muted-foreground">Model:</span> {sb.applicability_model}
                </span>
              )}
              {sb.applicable_serial_range && (
                <span>
                  <span className="text-muted-foreground">S/N Range:</span>{" "}
                  {sb.applicable_serial_range}
                </span>
              )}
              {sb.applicability_notes && (
                <span className="basis-full text-muted-foreground text-xs mt-1">
                  {sb.applicability_notes}
                </span>
              )}
            </div>
          )}

          {/* Version Info */}
          {(sb.software_version || sb.database_version) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-t pt-3">
              <span className="font-medium text-muted-foreground">Version Info:</span>
              {sb.software_version && (
                <span>
                  <span className="text-muted-foreground">Software:</span> {sb.software_version}
                </span>
              )}
              {sb.database_version && (
                <span>
                  <span className="text-muted-foreground">Database:</span> {sb.database_version}
                </span>
              )}
            </div>
          )}

          {/* Compliance Requirements */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-t pt-3">
            <span className="font-medium text-muted-foreground">Compliance:</span>
            {sb.initial_due_type && (
              <span>
                <span className="text-muted-foreground">Initial:</span>{" "}
                <span className="font-medium">{sb.initial_due_type}</span>
              </span>
            )}
            {sb.initial_due_hours && (
              <span>
                <span className="text-muted-foreground">Due:</span>{" "}
                <span className="font-medium">{sb.initial_due_hours} hrs</span>
              </span>
            )}
            {sb.initial_due_months && (
              <span>
                <span className="text-muted-foreground">Due:</span>{" "}
                <span className="font-medium">{sb.initial_due_months} mo</span>
              </span>
            )}
            {sb.repeat_hours && (
              <span>
                <span className="text-muted-foreground">Repeat:</span>{" "}
                <span className="font-medium">{sb.repeat_hours} hrs</span>
              </span>
            )}
            {sb.repeat_months && (
              <span>
                <span className="text-muted-foreground">Repeat:</span>{" "}
                <span className="font-medium">{sb.repeat_months} mo</span>
              </span>
            )}
          </div>

          {/* Source Links */}
          {sb.source_links && sb.source_links.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-muted-foreground mb-2">Source Links:</p>
              <div className="flex flex-wrap gap-2">
                {sb.source_links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {link.description || link.url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Downvote Reason Dialog */}
      <Dialog open={showDownvoteDialog} onOpenChange={setShowDownvoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
            <DialogDescription>
              Please share why this SB could be improved. This helps the maintainer make updates.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., unclear instructions, outdated references, missing information..."
            value={downvoteReason}
            onChange={(e) => setDownvoteReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownvoteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitDownvote}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use SB Confirmation Dialog */}
      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Community Service Bulletin</DialogTitle>
            <DialogDescription>
              This will create a local copy of this SB in your directives. You can modify it freely
              without affecting the community version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-accent rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">What happens next:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>A copy is added to your local directives</li>
                <li>You can edit it to add aircraft-specific details</li>
                <li>You'll be notified if the maintainer publishes updates</li>
                <li>Your local changes are never affected automatically</li>
              </ul>
            </div>
            <div className="bg-accent rounded-lg p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-muted-foreground">
                Remember to verify all compliance requirements against official manufacturer
                documentation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUseSB} disabled={importing}>
              {importing ? "Adding..." : "Add to My Directives"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunitySBDetail;
