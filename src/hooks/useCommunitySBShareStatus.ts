import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Directive } from "@/components/DirectivesPanel";

interface CommunitySBData {
  id: string;
  version_number: number;
  directive_code: string;
  directive_type: string;
  severity: string;
  category: string;
  compliance_scope: string;
  title: string;
  issuing_authority: string | null;
  revision: string | null;
  issue_date: string | null;
  effective_date: string | null;
  initial_due_type: string | null;
  initial_due_hours: number | null;
  initial_due_months: number | null;
  repeat_hours: number | null;
  repeat_months: number | null;
  counter_type: string | null;
  applicable_serial_range: string | null;
  applicability_notes: string | null;
  applicability_category: string | null;
  applicability_model: string | null;
  equipment_name: string | null;
  equipment_model: string | null;
  software_version: string | null;
  database_version: string | null;
  action_types: string[] | null;
  terminating_action_exists: boolean;
  terminating_action_summary: string | null;
  requires_log_entry: boolean;
  source_links: any;
}

// Fields that are synced between directive and community SB
const COMPARABLE_FIELDS: (keyof CommunitySBData)[] = [
  "directive_type",
  "severity",
  "category",
  "compliance_scope",
  "title",
  "issuing_authority",
  "revision",
  "issue_date",
  "effective_date",
  "initial_due_type",
  "initial_due_hours",
  "initial_due_months",
  "repeat_hours",
  "repeat_months",
  "counter_type",
  "applicable_serial_range",
  "applicability_notes",
  "applicability_category",
  "applicability_model",
  "equipment_name",
  "equipment_model",
  "software_version",
  "database_version",
  "action_types",
  "terminating_action_exists",
  "terminating_action_summary",
  "requires_log_entry",
  "source_links",
];

// Deep comparison for arrays and objects
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }
  
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }
  
  return false;
};

const hasChanges = (directive: Directive, communitySB: CommunitySBData): boolean => {
  for (const field of COMPARABLE_FIELDS) {
    const directiveValue = (directive as any)[field];
    const communityValue = communitySB[field];
    
    // Handle arrays and objects
    if (Array.isArray(directiveValue) || typeof directiveValue === "object") {
      if (!deepEqual(directiveValue, communityValue)) {
        return true;
      }
    } else if (directiveValue !== communityValue) {
      return true;
    }
  }
  return false;
};

interface ShareStatus {
  isShared: boolean;
  hasChanges: boolean;
  loading: boolean;
  communitySB: CommunitySBData | null;
}

export const useCommunitySBShareStatus = (
  directive: Directive,
  userId: string
): ShareStatus => {
  const [status, setStatus] = useState<ShareStatus>({
    isShared: false,
    hasChanges: false,
    loading: true,
    communitySB: null,
  });

  useEffect(() => {
    if (!userId || !directive.directive_code) {
      setStatus({ isShared: false, hasChanges: false, loading: false, communitySB: null });
      return;
    }

    const checkShareStatus = async () => {
      setStatus((prev) => ({ ...prev, loading: true }));
      try {
        const { data, error } = await supabase
          .from("community_service_bulletins")
          .select("*")
          .eq("maintainer_id", userId)
          .eq("directive_code", directive.directive_code)
          .order("version_number", { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const communitySB = data[0] as CommunitySBData;
          const changesExist = hasChanges(directive, communitySB);
          setStatus({
            isShared: true,
            hasChanges: changesExist,
            loading: false,
            communitySB,
          });
        } else {
          setStatus({
            isShared: false,
            hasChanges: false,
            loading: false,
            communitySB: null,
          });
        }
      } catch (err) {
        console.error("Error checking community SB status:", err);
        setStatus({ isShared: false, hasChanges: false, loading: false, communitySB: null });
      }
    };

    checkShareStatus();
  }, [userId, directive.directive_code, directive.updated_at]);

  return status;
};
