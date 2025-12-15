import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMonths } from "date-fns";
import { X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

interface Directive {
  id: string;
  directive_code: string;
  title: string;
  directive_status: string;
  compliance_scope: string;
  initial_due_type: string | null;
  counter_type: string | null;
  repeat_hours: number | null;
  repeat_months: number | null;
  category: string;
}

interface DirectiveComplianceLink {
  id?: string;
  directive_id: string;
  directive?: Directive;
  compliance_status: string;
  compliance_date: Date | null;
  counter_type: string;
  counter_value: string;
  owner_notes: string;
  compliance_links: Array<{ description: string; url: string }>;
  isExpanded: boolean;
}

interface MaintenanceDirectiveComplianceProps {
  userId: string;
  maintenanceLogId?: string;
  complianceLinks: DirectiveComplianceLink[];
  onComplianceLinksChange: (links: DirectiveComplianceLink[]) => void;
  defaultCounters: {
    hobbs: number;
    tach: number;
    airframe_total_time: number;
    engine_total_time: number;
    prop_total_time: number;
  };
  datePerformed: Date;
  performedByName: string;
  performedByType: string;
}

const COMPLIANCE_STATUSES = ["Not Complied", "Complied"];

const getCounterValue = (counters: any, counterType: string): number => {
  switch (counterType) {
    case "Hobbs": return counters.hobbs || 0;
    case "Tach": return counters.tach || 0;
    case "Airframe TT": return counters.airframe_total_time || 0;
    case "Engine TT": return counters.engine_total_time || 0;
    case "Prop TT": return counters.prop_total_time || 0;
    default: return 0;
  }
};

const isCounterBasedDirective = (directive: Directive): boolean => {
  return directive.initial_due_type === "By Total Time (Hours)";
};

const MaintenanceDirectiveCompliance = ({
  userId,
  maintenanceLogId,
  complianceLinks,
  onComplianceLinksChange,
  defaultCounters,
  datePerformed,
  performedByName,
  performedByType,
}: MaintenanceDirectiveComplianceProps) => {
  const [availableDirectives, setAvailableDirectives] = useState<Directive[]>([]);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [pendingCompletionIndex, setPendingCompletionIndex] = useState<number | null>(null);
  const [linkInputs, setLinkInputs] = useState<Record<number, { desc: string; url: string }>>({});

  // Sync compliance dates when datePerformed changes
  useEffect(() => {
    if (complianceLinks.length > 0) {
      const updatedLinks = complianceLinks.map(link => ({
        ...link,
        compliance_date: datePerformed
      }));
      // Only update if dates actually changed
      const hasChanges = complianceLinks.some((link, i) => 
        link.compliance_date?.getTime() !== updatedLinks[i].compliance_date?.getTime()
      );
      if (hasChanges) {
        onComplianceLinksChange(updatedLinks);
      }
    }
  }, [datePerformed]);

  // Fetch non-completed directives + any already-linked directives (even if completed)
  useEffect(() => {
    const fetchDirectives = async () => {
      // Get IDs of already-linked directives
      const linkedDirectiveIds = complianceLinks
        .map(link => link.directive_id)
        .filter(Boolean);

      // Fetch non-completed directives
      const { data: activeDirectives, error: activeError } = await supabase
        .from("directives")
        .select("id, directive_code, title, directive_status, compliance_scope, initial_due_type, counter_type, repeat_hours, repeat_months, category")
        .eq("user_id", userId)
        .neq("directive_status", "Completed")
        .eq("archived", false)
        .order("directive_code");

      if (activeError) {
        console.error("Error fetching directives:", activeError);
        return;
      }

      let allDirectives = activeDirectives || [];

      // Also fetch any linked directives that may be completed (for editing existing records)
      if (linkedDirectiveIds.length > 0) {
        const { data: linkedDirectives, error: linkedError } = await supabase
          .from("directives")
          .select("id, directive_code, title, directive_status, compliance_scope, initial_due_type, counter_type, repeat_hours, repeat_months, category")
          .in("id", linkedDirectiveIds);

        if (!linkedError && linkedDirectives) {
          // Merge, avoiding duplicates
          const existingIds = new Set(allDirectives.map(d => d.id));
          for (const d of linkedDirectives) {
            if (!existingIds.has(d.id)) {
              allDirectives.push(d);
            }
          }
          // Re-sort by directive_code
          allDirectives.sort((a, b) => a.directive_code.localeCompare(b.directive_code));
        }
      }

      setAvailableDirectives(allDirectives);
    };

    fetchDirectives();
  }, [userId, complianceLinks.length]);

  const createEmptyComplianceLink = (): DirectiveComplianceLink => ({
    directive_id: "",
    compliance_status: "Complied",
    compliance_date: datePerformed,
    counter_type: "Hobbs",
    counter_value: "",
    owner_notes: "",
    compliance_links: [],
    isExpanded: true,
  });

  const handleAddDirectiveLink = () => {
    onComplianceLinksChange([...complianceLinks, createEmptyComplianceLink()]);
  };

  const handleRemoveDirectiveLink = (index: number) => {
    const newLinks = complianceLinks.filter((_, i) => i !== index);
    onComplianceLinksChange(newLinks);
  };

  const handleLinkChange = (index: number, field: keyof DirectiveComplianceLink, value: any) => {
    const newLinks = [...complianceLinks];
    
    if (field === "directive_id") {
      const directive = availableDirectives.find(d => d.id === value);
      newLinks[index] = {
        ...newLinks[index],
        directive_id: value,
        directive: directive,
        // Auto-set counter type and value for counter-based directives
        counter_type: directive?.counter_type || "Hobbs",
        counter_value: directive && isCounterBasedDirective(directive) 
          ? getCounterValue(defaultCounters, directive.counter_type || "Hobbs").toString()
          : "",
      };
    } else {
      (newLinks[index] as any)[field] = value;
    }
    
    onComplianceLinksChange(newLinks);
  };

  const toggleExpanded = (index: number) => {
    const newLinks = [...complianceLinks];
    newLinks[index].isExpanded = !newLinks[index].isExpanded;
    onComplianceLinksChange(newLinks);
  };

  const handleAddEvidenceLink = (index: number) => {
    const inputs = linkInputs[index] || { desc: "", url: "" };
    if (inputs.desc.trim() && inputs.url.trim()) {
      const newLinks = [...complianceLinks];
      newLinks[index].compliance_links = [
        ...newLinks[index].compliance_links,
        { description: inputs.desc.trim(), url: inputs.url.trim() }
      ];
      onComplianceLinksChange(newLinks);
      setLinkInputs({ ...linkInputs, [index]: { desc: "", url: "" } });
    }
  };

  const handleRemoveEvidenceLink = (complianceIndex: number, linkIndex: number) => {
    const newLinks = [...complianceLinks];
    newLinks[complianceIndex].compliance_links = newLinks[complianceIndex].compliance_links.filter((_, i) => i !== linkIndex);
    onComplianceLinksChange(newLinks);
  };

  // Get directives already selected (to exclude from dropdown)
  const selectedDirectiveIds = complianceLinks.map(link => link.directive_id).filter(Boolean);
  
  const getAvailableDirectivesForLink = (currentDirectiveId: string) => {
    return availableDirectives.filter(d => 
      d.id === currentDirectiveId || !selectedDirectiveIds.includes(d.id)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Directive Compliance</h3>
        <Button type="button" size="sm" variant="outline" onClick={handleAddDirectiveLink}>
          <Plus className="h-4 w-4 mr-1" />
          Add Directive
        </Button>
      </div>

      {complianceLinks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No directives linked. Click "Add Directive" to link this maintenance record to a directive compliance.
        </p>
      ) : (
        <div className="space-y-4">
          {complianceLinks.map((link, index) => {
            const directive = link.directive || availableDirectives.find(d => d.id === link.directive_id);
            const isCounterBased = directive && isCounterBasedDirective(directive);
            const inputs = linkInputs[index] || { desc: "", url: "" };

            return (
              <Card key={index} className="border overflow-visible">
                <CardHeader className="py-3 px-4 overflow-visible">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(index)}
                        className="p-1 h-auto"
                      >
                        {link.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <div className="flex-1">
                        <Select
                          value={link.directive_id}
                          onValueChange={(value) => handleLinkChange(index, "directive_id", value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select directive..." />
                          </SelectTrigger>
                          <SelectContent 
                            className="z-[100] max-h-[300px] overflow-y-auto bg-popover"
                            position="popper" 
                            side="bottom"
                            sideOffset={4}
                            align="start"
                          >
                            {getAvailableDirectivesForLink(link.directive_id).length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">No directives available</div>
                            ) : (
                              getAvailableDirectivesForLink(link.directive_id).map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.directive_code} - {d.title}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDirectiveLink(index)}
                      className="ml-2 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {link.isExpanded && link.directive_id && (
                  <CardContent className="pt-0 pb-4 px-4 space-y-4">
                    {/* Compliance Status */}
                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select
                        value={link.compliance_status}
                        onValueChange={(value) => handleLinkChange(index, "compliance_status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPLIANCE_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Counter fields for counter-based directives */}
                    {isCounterBased && directive?.counter_type && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Counter Type</Label>
                          <Input
                            value={directive.counter_type}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Counter Value</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={link.counter_value}
                            onChange={(e) => handleLinkChange(index, "counter_value", e.target.value)}
                            placeholder={`Current: ${getCounterValue(defaultCounters, directive.counter_type)}`}
                          />
                        </div>
                      </div>
                    )}


                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={link.owner_notes}
                        onChange={(e) => handleLinkChange(index, "owner_notes", e.target.value)}
                        placeholder="Any notes about compliance..."
                        rows={2}
                      />
                    </div>

                    {/* Evidence Links */}
                    <div className="space-y-2">
                      <Label>Compliance Evidence</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          placeholder="Description"
                          value={inputs.desc}
                          onChange={(e) => setLinkInputs({ ...linkInputs, [index]: { ...inputs, desc: e.target.value } })}
                          maxLength={200}
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="URL"
                            value={inputs.url}
                            onChange={(e) => setLinkInputs({ ...linkInputs, [index]: { ...inputs, url: e.target.value } })}
                            maxLength={500}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={() => handleAddEvidenceLink(index)}>
                            Add
                          </Button>
                        </div>
                      </div>
                      {link.compliance_links.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {link.compliance_links.map((evidenceLink, linkIdx) => (
                            <div key={linkIdx} className="flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded">
                              <a
                                href={evidenceLink.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm hover:underline flex-1 truncate"
                              >
                                {evidenceLink.description || evidenceLink.url}
                              </a>
                              <X
                                className="h-4 w-4 cursor-pointer flex-shrink-0 hover:text-destructive"
                                onClick={() => handleRemoveEvidenceLink(index, linkIdx)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MaintenanceDirectiveCompliance;
