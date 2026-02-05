// Community Service Bulletins Types

export interface CommunitySB {
  id: string;
  maintainer_id: string;
  
  // Core SB fields
  directive_type: string;
  severity: string;
  directive_status: string;
  category: string;
  compliance_scope: string;
  
  directive_code: string;
  title: string;
  issuing_authority: string | null;
  revision: string | null;
  
  issue_date: string | null;
  effective_date: string | null;
  
  // Initial due settings
  initial_due_type: string | null;
  initial_due_hours: number | null;
  initial_due_months: number | null;
  
  // Recurrence settings
  repeat_hours: number | null;
  repeat_months: number | null;
  counter_type: string | null;
  
  // Applicability (generic)
  applicable_serial_range: string | null;
  applicability_notes: string | null;
  
  // Equipment reference (generic)
  equipment_model: string | null;
  
  // Version info
  software_version: string | null;
  database_version: string | null;
  
  // Action details
  action_types: string[] | null;
  terminating_action_exists: boolean;
  terminating_action_summary: string | null;
  requires_log_entry: boolean;
  
  // Source links
  source_links: Array<{ description: string; url: string }> | null;
  
  // Community metadata
  description: string | null;
  version_notes: string | null;
  version_number: number;
  
  // Timestamps
  created_at: string | null;
  updated_at: string | null;
}

export interface CommunitySBWithMaintainer extends CommunitySB {
  maintainer_display_name: string | null;
  upvotes: number;
  downvotes: number;
  user_vote: number | null; // -1, 0, or 1
}

export interface CommunitySBFeedback {
  id: string;
  community_sb_id: string;
  user_id: string;
  vote_type: number; // -1 or 1
  reason: string | null;
  maintainer_status: 'Incorporated' | 'Acknowledged' | null;
  maintainer_response_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CommunitySBUsage {
  id: string;
  community_sb_id: string;
  local_directive_id: string;
  user_id: string;
  used_version_number: number;
  is_modified: boolean;
  last_seen_version: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CommunitySBUpdateNotification {
  id: string;
  user_id: string;
  community_sb_id: string;
  local_directive_id: string | null;
  old_version_number: number;
  new_version_number: number;
  version_notes: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string | null;
}
