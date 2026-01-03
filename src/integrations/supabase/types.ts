export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          counter: number
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          code: string
          counter?: number
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          code?: string
          counter?: number
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      admin_notification_status: {
        Row: {
          created_at: string | null
          id: string
          last_seen_at: string
          notification_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_seen_at?: string
          notification_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_seen_at?: string
          notification_type?: string
          user_id?: string
        }
        Relationships: []
      }
      aircraft: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean
          model_make: string | null
          registration: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          model_make?: string | null
          registration: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          model_make?: string | null
          registration?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_counter_history: {
        Row: {
          aircraft_id: string
          airframe_total_time: number | null
          change_date: string
          created_at: string | null
          engine_total_time: number | null
          hobbs: number | null
          id: string
          prop_total_time: number | null
          source: string
          tach: number | null
          user_id: string
        }
        Insert: {
          aircraft_id: string
          airframe_total_time?: number | null
          change_date?: string
          created_at?: string | null
          engine_total_time?: number | null
          hobbs?: number | null
          id?: string
          prop_total_time?: number | null
          source: string
          tach?: number | null
          user_id: string
        }
        Update: {
          aircraft_id?: string
          airframe_total_time?: number | null
          change_date?: string
          created_at?: string | null
          engine_total_time?: number | null
          hobbs?: number | null
          id?: string
          prop_total_time?: number | null
          source?: string
          tach?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_counter_history_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_counter_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_counter_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_counters: {
        Row: {
          aircraft_id: string
          airframe_total_time: number | null
          created_at: string | null
          engine_total_time: number | null
          hobbs: number | null
          id: string
          prop_total_time: number | null
          tach: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aircraft_id: string
          airframe_total_time?: number | null
          created_at?: string | null
          engine_total_time?: number | null
          hobbs?: number | null
          id?: string
          prop_total_time?: number | null
          tach?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aircraft_id?: string
          airframe_total_time?: number | null
          created_at?: string | null
          engine_total_time?: number | null
          hobbs?: number | null
          id?: string
          prop_total_time?: number | null
          tach?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_counters_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: true
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft_directive_status: {
        Row: {
          aircraft_id: string
          applicability_reason: string | null
          applicability_status: Database["public"]["Enums"]["applicability_status"]
          archived: boolean
          compliance_links: Json | null
          compliance_status: Database["public"]["Enums"]["db_compliance_status"]
          created_at: string | null
          directive_id: string
          first_compliance_date: string | null
          first_compliance_tach: number | null
          id: string
          last_compliance_date: string | null
          last_compliance_tach: number | null
          next_due_basis: string | null
          next_due_counter_type: string | null
          next_due_date: string | null
          next_due_tach: number | null
          owner_notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aircraft_id: string
          applicability_reason?: string | null
          applicability_status?: Database["public"]["Enums"]["applicability_status"]
          archived?: boolean
          compliance_links?: Json | null
          compliance_status?: Database["public"]["Enums"]["db_compliance_status"]
          created_at?: string | null
          directive_id: string
          first_compliance_date?: string | null
          first_compliance_tach?: number | null
          id?: string
          last_compliance_date?: string | null
          last_compliance_tach?: number | null
          next_due_basis?: string | null
          next_due_counter_type?: string | null
          next_due_date?: string | null
          next_due_tach?: number | null
          owner_notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aircraft_id?: string
          applicability_reason?: string | null
          applicability_status?: Database["public"]["Enums"]["applicability_status"]
          archived?: boolean
          compliance_links?: Json | null
          compliance_status?: Database["public"]["Enums"]["db_compliance_status"]
          created_at?: string | null
          directive_id?: string
          first_compliance_date?: string | null
          first_compliance_tach?: number | null
          id?: string
          last_compliance_date?: string | null
          last_compliance_tach?: number | null
          next_due_basis?: string | null
          next_due_counter_type?: string | null
          next_due_date?: string | null
          next_due_tach?: number | null
          owner_notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_directive_status_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_directive_status_directive_id_fkey"
            columns: ["directive_id"]
            isOneToOne: false
            referencedRelation: "directives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_directive_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aircraft_directive_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          actual_result: string
          assigned_to: string | null
          attachment_url: string | null
          browser: string | null
          category: Database["public"]["Enums"]["bug_category"]
          created_at: string
          description: string
          device_type: Database["public"]["Enums"]["device_type"] | null
          expected_result: string | null
          id: string
          internal_notes: string | null
          operating_system: string | null
          priority: Database["public"]["Enums"]["bug_priority"]
          resolution_summary: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["bug_severity"]
          status: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_result: string
          assigned_to?: string | null
          attachment_url?: string | null
          browser?: string | null
          category: Database["public"]["Enums"]["bug_category"]
          created_at?: string
          description: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          expected_result?: string | null
          id?: string
          internal_notes?: string | null
          operating_system?: string | null
          priority?: Database["public"]["Enums"]["bug_priority"]
          resolution_summary?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity: Database["public"]["Enums"]["bug_severity"]
          status?: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_result?: string
          assigned_to?: string | null
          attachment_url?: string | null
          browser?: string | null
          category?: Database["public"]["Enums"]["bug_category"]
          created_at?: string
          description?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          expected_result?: string | null
          id?: string
          internal_notes?: string | null
          operating_system?: string | null
          priority?: Database["public"]["Enums"]["bug_priority"]
          resolution_summary?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["bug_severity"]
          status?: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      directive_history: {
        Row: {
          action_type: string
          aircraft_id: string
          compliance_status: string | null
          created_at: string
          directive_code: string
          directive_id: string | null
          directive_title: string
          first_compliance_date: string | null
          id: string
          last_compliance_date: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          aircraft_id: string
          compliance_status?: string | null
          created_at?: string
          directive_code: string
          directive_id?: string | null
          directive_title: string
          first_compliance_date?: string | null
          id?: string
          last_compliance_date?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          aircraft_id?: string
          compliance_status?: string | null
          created_at?: string
          directive_code?: string
          directive_id?: string | null
          directive_title?: string
          first_compliance_date?: string | null
          id?: string
          last_compliance_date?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directive_history_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      directives: {
        Row: {
          action_types: string[] | null
          aircraft_id: string
          applicability_category: string | null
          applicability_model: string | null
          applicability_notes: string | null
          applicability_reason: string | null
          applicability_status: string | null
          applicable_serial_range: string | null
          archived: boolean
          category: Database["public"]["Enums"]["directive_category"]
          compliance_scope: Database["public"]["Enums"]["compliance_scope"]
          counter_type: string | null
          created_at: string | null
          directive_code: string
          directive_status: Database["public"]["Enums"]["directive_status"]
          directive_type: Database["public"]["Enums"]["directive_type"]
          effective_date: string | null
          equipment_id: string | null
          equipment_model: string | null
          equipment_name: string | null
          equipment_serial_number: string | null
          id: string
          initial_due_date: string | null
          initial_due_hours: number | null
          initial_due_months: number | null
          initial_due_type:
            | Database["public"]["Enums"]["initial_due_type"]
            | null
          issue_date: string | null
          issuing_authority: string | null
          repeat_hours: number | null
          repeat_months: number | null
          requires_log_entry: boolean
          revision: string | null
          severity: Database["public"]["Enums"]["directive_severity"]
          source_links: Json | null
          terminating_action_exists: boolean
          terminating_action_summary: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_types?: string[] | null
          aircraft_id: string
          applicability_category?: string | null
          applicability_model?: string | null
          applicability_notes?: string | null
          applicability_reason?: string | null
          applicability_status?: string | null
          applicable_serial_range?: string | null
          archived?: boolean
          category: Database["public"]["Enums"]["directive_category"]
          compliance_scope: Database["public"]["Enums"]["compliance_scope"]
          counter_type?: string | null
          created_at?: string | null
          directive_code: string
          directive_status?: Database["public"]["Enums"]["directive_status"]
          directive_type: Database["public"]["Enums"]["directive_type"]
          effective_date?: string | null
          equipment_id?: string | null
          equipment_model?: string | null
          equipment_name?: string | null
          equipment_serial_number?: string | null
          id?: string
          initial_due_date?: string | null
          initial_due_hours?: number | null
          initial_due_months?: number | null
          initial_due_type?:
            | Database["public"]["Enums"]["initial_due_type"]
            | null
          issue_date?: string | null
          issuing_authority?: string | null
          repeat_hours?: number | null
          repeat_months?: number | null
          requires_log_entry?: boolean
          revision?: string | null
          severity: Database["public"]["Enums"]["directive_severity"]
          source_links?: Json | null
          terminating_action_exists?: boolean
          terminating_action_summary?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_types?: string[] | null
          aircraft_id?: string
          applicability_category?: string | null
          applicability_model?: string | null
          applicability_notes?: string | null
          applicability_reason?: string | null
          applicability_status?: string | null
          applicable_serial_range?: string | null
          archived?: boolean
          category?: Database["public"]["Enums"]["directive_category"]
          compliance_scope?: Database["public"]["Enums"]["compliance_scope"]
          counter_type?: string | null
          created_at?: string | null
          directive_code?: string
          directive_status?: Database["public"]["Enums"]["directive_status"]
          directive_type?: Database["public"]["Enums"]["directive_type"]
          effective_date?: string | null
          equipment_id?: string | null
          equipment_model?: string | null
          equipment_name?: string | null
          equipment_serial_number?: string | null
          id?: string
          initial_due_date?: string | null
          initial_due_hours?: number | null
          initial_due_months?: number | null
          initial_due_type?:
            | Database["public"]["Enums"]["initial_due_type"]
            | null
          issue_date?: string | null
          issuing_authority?: string | null
          repeat_hours?: number | null
          repeat_months?: number | null
          requires_log_entry?: boolean
          revision?: string | null
          severity?: Database["public"]["Enums"]["directive_severity"]
          source_links?: Json | null
          terminating_action_exists?: boolean
          terminating_action_summary?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "directives_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directives_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          aircraft_id: string
          category: Database["public"]["Enums"]["directive_category"]
          created_at: string | null
          id: string
          install_context: Database["public"]["Enums"]["install_context"] | null
          installed_date: string | null
          links: Json | null
          manufacturer: string | null
          model_or_part_number: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          vendor: string | null
          warranty_expiration_date: string | null
          warranty_start_date: string | null
        }
        Insert: {
          aircraft_id: string
          category: Database["public"]["Enums"]["directive_category"]
          created_at?: string | null
          id?: string
          install_context?:
            | Database["public"]["Enums"]["install_context"]
            | null
          installed_date?: string | null
          links?: Json | null
          manufacturer?: string | null
          model_or_part_number?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          vendor?: string | null
          warranty_expiration_date?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          aircraft_id?: string
          category?: Database["public"]["Enums"]["directive_category"]
          created_at?: string | null
          id?: string
          install_context?:
            | Database["public"]["Enums"]["install_context"]
            | null
          installed_date?: string | null
          links?: Json | null
          manufacturer?: string | null
          model_or_part_number?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          vendor?: string | null
          warranty_expiration_date?: string | null
          warranty_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_comment: string | null
          created_at: string | null
          description: string
          id: string
          status: Database["public"]["Enums"]["feature_status"]
          title: string
          updated_at: string | null
          user_id: string | null
          vote_count: number | null
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string | null
          description: string
          id?: string
          status?: Database["public"]["Enums"]["feature_status"]
          title: string
          updated_at?: string | null
          user_id?: string | null
          vote_count?: number | null
        }
        Update: {
          admin_comment?: string | null
          created_at?: string | null
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["feature_status"]
          title?: string
          updated_at?: string | null
          user_id?: string | null
          vote_count?: number | null
        }
        Relationships: []
      }
      feature_votes: {
        Row: {
          created_at: string | null
          feature_id: string
          id: string
          user_id: string
          vote_type: number
        }
        Insert: {
          created_at?: string | null
          feature_id: string
          id?: string
          user_id: string
          vote_type: number
        }
        Update: {
          created_at?: string | null
          feature_id?: string
          id?: string
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_votes_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_directive_compliance: {
        Row: {
          aircraft_id: string
          compliance_date: string
          compliance_links: Json | null
          compliance_status: string
          counter_type: string | null
          counter_value: number | null
          created_at: string | null
          directive_id: string
          id: string
          maintenance_log_id: string | null
          owner_notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aircraft_id: string
          compliance_date?: string
          compliance_links?: Json | null
          compliance_status?: string
          counter_type?: string | null
          counter_value?: number | null
          created_at?: string | null
          directive_id: string
          id?: string
          maintenance_log_id?: string | null
          owner_notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aircraft_id?: string
          compliance_date?: string
          compliance_links?: Json | null
          compliance_status?: string
          counter_type?: string | null
          counter_value?: number | null
          created_at?: string | null
          directive_id?: string
          id?: string
          maintenance_log_id?: string | null
          owner_notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_directive_compliance_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_directive_compliance_directive_id_fkey"
            columns: ["directive_id"]
            isOneToOne: false
            referencedRelation: "directives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_directive_compliance_maintenance_log_id_fkey"
            columns: ["maintenance_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_directive_compliance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_directive_compliance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          aircraft_id: string
          airframe_total_time: number | null
          attachment_urls: Json | null
          category: Database["public"]["Enums"]["maintenance_category"]
          compliance_reference: string | null
          compliance_type: Database["public"]["Enums"]["compliance_type"] | null
          created_at: string | null
          date_performed: string
          engine_total_time: number | null
          entry_title: string
          has_compliance_item: boolean | null
          hobbs_at_event: number | null
          id: string
          internal_notes: string | null
          interval_hours: number | null
          interval_months: number | null
          interval_type: Database["public"]["Enums"]["interval_type"] | null
          invoice_number: string | null
          is_recurring_task: boolean | null
          labor_cost: number | null
          next_due_date: string | null
          next_due_hours: number | null
          organization: string | null
          other_cost: number | null
          parts_cost: number | null
          performed_by_name: string
          performed_by_type: Database["public"]["Enums"]["performed_by_type"]
          prop_total_time: number | null
          recurrence_counter_increment: number | null
          recurrence_counter_type: string | null
          recurring_compliance: boolean | null
          subcategory: Database["public"]["Enums"]["maintenance_subcategory"]
          tach_at_event: number | null
          tags: string[] | null
          total_cost: number | null
          updated_at: string | null
          user_id: string
          vendor_name: string | null
        }
        Insert: {
          aircraft_id: string
          airframe_total_time?: number | null
          attachment_urls?: Json | null
          category: Database["public"]["Enums"]["maintenance_category"]
          compliance_reference?: string | null
          compliance_type?:
            | Database["public"]["Enums"]["compliance_type"]
            | null
          created_at?: string | null
          date_performed: string
          engine_total_time?: number | null
          entry_title: string
          has_compliance_item?: boolean | null
          hobbs_at_event?: number | null
          id?: string
          internal_notes?: string | null
          interval_hours?: number | null
          interval_months?: number | null
          interval_type?: Database["public"]["Enums"]["interval_type"] | null
          invoice_number?: string | null
          is_recurring_task?: boolean | null
          labor_cost?: number | null
          next_due_date?: string | null
          next_due_hours?: number | null
          organization?: string | null
          other_cost?: number | null
          parts_cost?: number | null
          performed_by_name: string
          performed_by_type: Database["public"]["Enums"]["performed_by_type"]
          prop_total_time?: number | null
          recurrence_counter_increment?: number | null
          recurrence_counter_type?: string | null
          recurring_compliance?: boolean | null
          subcategory: Database["public"]["Enums"]["maintenance_subcategory"]
          tach_at_event?: number | null
          tags?: string[] | null
          total_cost?: number | null
          updated_at?: string | null
          user_id: string
          vendor_name?: string | null
        }
        Update: {
          aircraft_id?: string
          airframe_total_time?: number | null
          attachment_urls?: Json | null
          category?: Database["public"]["Enums"]["maintenance_category"]
          compliance_reference?: string | null
          compliance_type?:
            | Database["public"]["Enums"]["compliance_type"]
            | null
          created_at?: string | null
          date_performed?: string
          engine_total_time?: number | null
          entry_title?: string
          has_compliance_item?: boolean | null
          hobbs_at_event?: number | null
          id?: string
          internal_notes?: string | null
          interval_hours?: number | null
          interval_months?: number | null
          interval_type?: Database["public"]["Enums"]["interval_type"] | null
          invoice_number?: string | null
          is_recurring_task?: boolean | null
          labor_cost?: number | null
          next_due_date?: string | null
          next_due_hours?: number | null
          organization?: string | null
          other_cost?: number | null
          parts_cost?: number | null
          performed_by_name?: string
          performed_by_type?: Database["public"]["Enums"]["performed_by_type"]
          prop_total_time?: number | null
          recurrence_counter_increment?: number | null
          recurrence_counter_type?: string | null
          recurring_compliance?: boolean | null
          subcategory?: Database["public"]["Enums"]["maintenance_subcategory"]
          tach_at_event?: number | null
          tags?: string[] | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          aircraft_id: string
          alert_days: number | null
          alert_hours: number | null
          completed_at: string | null
          counter_step: number | null
          counter_type: Database["public"]["Enums"]["counter_type"] | null
          created_at: string | null
          description: string
          directive_id: string | null
          equipment_id: string | null
          id: string
          initial_counter_value: number | null
          initial_date: string
          is_completed: boolean | null
          maintenance_log_id: string | null
          notes: string | null
          notification_basis: Database["public"]["Enums"]["notification_basis"]
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          subscription_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string | null
          user_id: string
          user_modified: boolean
        }
        Insert: {
          aircraft_id: string
          alert_days?: number | null
          alert_hours?: number | null
          completed_at?: string | null
          counter_step?: number | null
          counter_type?: Database["public"]["Enums"]["counter_type"] | null
          created_at?: string | null
          description: string
          directive_id?: string | null
          equipment_id?: string | null
          id?: string
          initial_counter_value?: number | null
          initial_date: string
          is_completed?: boolean | null
          maintenance_log_id?: string | null
          notes?: string | null
          notification_basis?: Database["public"]["Enums"]["notification_basis"]
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          subscription_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id: string
          user_modified?: boolean
        }
        Update: {
          aircraft_id?: string
          alert_days?: number | null
          alert_hours?: number | null
          completed_at?: string | null
          counter_step?: number | null
          counter_type?: Database["public"]["Enums"]["counter_type"] | null
          created_at?: string | null
          description?: string
          directive_id?: string | null
          equipment_id?: string | null
          id?: string
          initial_counter_value?: number | null
          initial_date?: string
          is_completed?: boolean | null
          maintenance_log_id?: string | null
          notes?: string | null
          notification_basis?: Database["public"]["Enums"]["notification_basis"]
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          subscription_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id?: string
          user_modified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notifications_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_directive_id_fkey"
            columns: ["directive_id"]
            isOneToOne: false
            referencedRelation: "directives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_maintenance_log_id_fkey"
            columns: ["maintenance_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_code: string | null
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          membership_status: Database["public"]["Enums"]["membership_status"]
          name: string | null
          plane_model_make: string | null
          plane_registration: string | null
          state_prefecture: string | null
        }
        Insert: {
          access_code?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          membership_status?: Database["public"]["Enums"]["membership_status"]
          name?: string | null
          plane_model_make?: string | null
          plane_registration?: string | null
          state_prefecture?: string | null
        }
        Update: {
          access_code?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          membership_status?: Database["public"]["Enums"]["membership_status"]
          name?: string | null
          plane_model_make?: string | null
          plane_registration?: string | null
          state_prefecture?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          aircraft_id: string
          cost: number | null
          created_at: string | null
          final_date: string | null
          id: string
          initial_date: string
          last_transaction_date: string | null
          notes: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          subscription_name: string
          type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aircraft_id: string
          cost?: number | null
          created_at?: string | null
          final_date?: string | null
          id?: string
          initial_date: string
          last_transaction_date?: string | null
          notes?: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          subscription_name: string
          type: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aircraft_id?: string
          cost?: number | null
          created_at?: string | null
          final_date?: string | null
          id?: string
          initial_date?: string
          last_transaction_date?: string | null
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          subscription_name?: string
          type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_aircraft_id_fkey"
            columns: ["aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          aircraft_id: string
          allocate_over_time: boolean
          allocation_end_date: string | null
          allocation_method:
            | Database["public"]["Enums"]["allocation_method"]
            | null
          allocation_period_unit:
            | Database["public"]["Enums"]["allocation_period_unit"]
            | null
          allocation_period_value: number | null
          allocation_start_date: string | null
          amount: number
          attachment_urls: Json | null
          block_time_hours: number | null
          category: Database["public"]["Enums"]["transaction_category"]
          counter_end_value: number | null
          counter_start_value: number | null
          counter_type_for_hour_allocation:
            | Database["public"]["Enums"]["counter_type_for_hour_allocation"]
            | null
          created_at: string | null
          currency: string
          cycles: number | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          flight_time_hours: number | null
          generated_for_period: string | null
          hobbs_hours: number | null
          id: string
          include_in_cash_flow: boolean
          include_in_cost_per_hour: boolean
          include_in_ownership_total: boolean
          intent: Database["public"]["Enums"]["transaction_intent"]
          notes: string | null
          reference_id: string | null
          reference_type: Database["public"]["Enums"]["reference_type"] | null
          source: Database["public"]["Enums"]["transaction_source"]
          status: Database["public"]["Enums"]["transaction_status"]
          tach_hours: number | null
          tags: string[] | null
          title: string
          transaction_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aircraft_id: string
          allocate_over_time?: boolean
          allocation_end_date?: string | null
          allocation_method?:
            | Database["public"]["Enums"]["allocation_method"]
            | null
          allocation_period_unit?:
            | Database["public"]["Enums"]["allocation_period_unit"]
            | null
          allocation_period_value?: number | null
          allocation_start_date?: string | null
          amount: number
          attachment_urls?: Json | null
          block_time_hours?: number | null
          category: Database["public"]["Enums"]["transaction_category"]
          counter_end_value?: number | null
          counter_start_value?: number | null
          counter_type_for_hour_allocation?:
            | Database["public"]["Enums"]["counter_type_for_hour_allocation"]
            | null
          created_at?: string | null
          currency?: string
          cycles?: number | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          flight_time_hours?: number | null
          generated_for_period?: string | null
          hobbs_hours?: number | null
          id?: string
          include_in_cash_flow?: boolean
          include_in_cost_per_hour?: boolean
          include_in_ownership_total?: boolean
          intent: Database["public"]["Enums"]["transaction_intent"]
          notes?: string | null
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["reference_type"] | null
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          tach_hours?: number | null
          tags?: string[] | null
          title: string
          transaction_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aircraft_id?: string
          allocate_over_time?: boolean
          allocation_end_date?: string | null
          allocation_method?:
            | Database["public"]["Enums"]["allocation_method"]
            | null
          allocation_period_unit?:
            | Database["public"]["Enums"]["allocation_period_unit"]
            | null
          allocation_period_value?: number | null
          allocation_start_date?: string | null
          amount?: number
          attachment_urls?: Json | null
          block_time_hours?: number | null
          category?: Database["public"]["Enums"]["transaction_category"]
          counter_end_value?: number | null
          counter_start_value?: number | null
          counter_type_for_hour_allocation?:
            | Database["public"]["Enums"]["counter_type_for_hour_allocation"]
            | null
          created_at?: string | null
          currency?: string
          cycles?: number | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          flight_time_hours?: number | null
          generated_for_period?: string | null
          hobbs_hours?: number | null
          id?: string
          include_in_cash_flow?: boolean
          include_in_cost_per_hour?: boolean
          include_in_ownership_total?: boolean
          intent?: Database["public"]["Enums"]["transaction_intent"]
          notes?: string | null
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["reference_type"] | null
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          tach_hours?: number | null
          tags?: string[] | null
          title?: string
          transaction_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          display_name: string | null
          id: string | null
        }
        Insert: {
          display_name?: string | null
          id?: string | null
        }
        Update: {
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_commitment_transactions: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      allocation_method: "Straight-line" | "By Flight Hours" | "Custom"
      allocation_period_unit: "Days" | "Months"
      app_role: "admin" | "user"
      applicability_status: "Applies" | "Does Not Apply" | "Unsure"
      bug_category:
        | "Dashboard"
        | "Maintenance Logs"
        | "AD / Service Bulletins"
        | "Profile / Account"
        | "Data Export"
        | "Notifications"
        | "Other"
        | "Authentication"
        | "Directives"
        | "Subscriptions"
        | "Calendar"
        | "Counters"
        | "Profile"
        | "UI/Display"
        | "Performance"
        | "Data"
        | "Equipment"
      bug_priority: "Low" | "Medium" | "High" | "Urgent"
      bug_severity: "Minor" | "Moderate" | "Major" | "Critical"
      bug_status:
        | "New"
        | "In Progress"
        | "Waiting for User"
        | "Resolved"
        | "Closed (Won't Fix)"
        | "Closed (Duplicate)"
      compliance_scope:
        | "One-Time"
        | "Recurring"
        | "Conditional"
        | "Informational Only"
      compliance_type: "None" | "AD" | "SB" | "SL" | "KAS" | "ASB" | "Other"
      component_type: "Airframe" | "Propeller" | "Avionics" | "Other"
      counter_type: "Hobbs" | "Tach" | "Airframe TT" | "Engine TT" | "Prop TT"
      counter_type_for_hour_allocation:
        | "Tach"
        | "Hobbs"
        | "EngineHours"
        | "AirframeHours"
        | "FlightTime"
        | "BlockTime"
      db_compliance_status:
        | "Not Reviewed"
        | "Not Complied"
        | "Complied Once"
        | "Recurring (Current)"
        | "Overdue"
        | "Not Applicable"
      device_type: "Desktop" | "Laptop" | "Tablet" | "Phone" | "Other"
      directive_category:
        | "Airframe"
        | "Engine"
        | "Propeller"
        | "Avionics"
        | "System"
        | "Appliance"
        | "Other"
      directive_performed_by_role:
        | "Owner/Builder"
        | "Owner/Pilot"
        | "A&P"
        | "IA"
        | "Rotax IRMT"
        | "Maintenance Shop"
        | "Other"
      directive_severity:
        | "Emergency"
        | "Mandatory"
        | "Recommended"
        | "Informational"
      directive_status:
        | "Active"
        | "Superseded"
        | "Withdrawn"
        | "Proposed"
        | "Completed"
        | "Resolved"
      directive_type:
        | "FAA Airworthiness Directive"
        | "Manufacturer Alert"
        | "Manufacturer Mandatory"
        | "Service Bulletin"
        | "Service Instruction"
        | "Information Bulletin"
        | "Other"
      feature_status: "open" | "completed" | "duplicate" | "closed"
      initial_due_type:
        | "Before Next Flight"
        | "By Date"
        | "By Total Time (Hours)"
        | "By Calendar (Months)"
        | "At Next Inspection"
        | "Other"
      install_context: "Installed" | "Portable" | "Tool" | "Other"
      interval_type: "Hours" | "Calendar" | "Mixed" | "None"
      maintenance_category:
        | "Airplane"
        | "Airframe"
        | "Engine"
        | "Propeller"
        | "Avionics"
        | "Electrical"
        | "Interior"
        | "Exterior"
        | "Accessories"
        | "Other"
      maintenance_subcategory:
        | "Inspection"
        | "Repair"
        | "Replacement"
        | "Modification"
        | "Software Update"
        | "Compliance"
        | "Troubleshooting"
        | "Scheduled Maintenance"
        | "Other"
      membership_status: "Applied" | "Approved" | "Suspended"
      notification_basis: "Date" | "Counter"
      notification_type: "Maintenance" | "Subscription" | "Directives" | "Other"
      performed_by_type:
        | "Owner"
        | "A&P"
        | "LSRM"
        | "Repairman"
        | "Shop"
        | "Other"
      recurrence_type:
        | "Weekly"
        | "Bi-Monthly"
        | "Monthly"
        | "Quarterly"
        | "Semi-Annual"
        | "Yearly"
        | "None"
      reference_type:
        | "Commitment"
        | "Maintenance"
        | "Directive"
        | "Compliance"
        | "Equipment"
        | "Trip"
        | "Other"
      subscription_type:
        | "EFB & Flight Planning"
        | "Avionics Subscriptions"
        | "Aircraft Maintenance, Tracking, & Record Services"
        | "Proficiency & Safety Tools"
        | "Aviation Community Memberships"
        | "Weather Tools"
        | "Magazine Subscription"
        | "Aircraft Operations & Financial Tools"
        | "Hardware-Related Annual Fees"
        | "Insurance Related Add-Ons"
        | "Other"
        | "Facilities & Storage"
        | "Insurance"
        | "Navigation, Charts & Flight Planning"
        | "Avionics Data & Services"
        | "Maintenance, Compliance & Records"
        | "Training, Proficiency & Safety"
        | "Memberships & Associations"
        | "Publications & Media"
        | "Operations & Administration"
        | "Hardware-Related Services"
      transaction_category:
        | "Fuel"
        | "Oil & Consumables"
        | "Hangar / Tie-Down"
        | "Insurance"
        | "Avionics"
        | "Maintenance Labor"
        | "Maintenance Parts"
        | "Training"
        | "Travel"
        | "Tools & Equipment"
        | "Other"
      transaction_direction: "Debit" | "Credit"
      transaction_intent:
        | "Ownership"
        | "Operation"
        | "Maintenance"
        | "Compliance"
        | "Capital"
        | "Training"
        | "Travel"
        | "Other"
      transaction_source: "Manual" | "Commitment" | "Imported"
      transaction_status: "Pending" | "Posted" | "Skipped" | "Voided"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      allocation_method: ["Straight-line", "By Flight Hours", "Custom"],
      allocation_period_unit: ["Days", "Months"],
      app_role: ["admin", "user"],
      applicability_status: ["Applies", "Does Not Apply", "Unsure"],
      bug_category: [
        "Dashboard",
        "Maintenance Logs",
        "AD / Service Bulletins",
        "Profile / Account",
        "Data Export",
        "Notifications",
        "Other",
        "Authentication",
        "Directives",
        "Subscriptions",
        "Calendar",
        "Counters",
        "Profile",
        "UI/Display",
        "Performance",
        "Data",
        "Equipment",
      ],
      bug_priority: ["Low", "Medium", "High", "Urgent"],
      bug_severity: ["Minor", "Moderate", "Major", "Critical"],
      bug_status: [
        "New",
        "In Progress",
        "Waiting for User",
        "Resolved",
        "Closed (Won't Fix)",
        "Closed (Duplicate)",
      ],
      compliance_scope: [
        "One-Time",
        "Recurring",
        "Conditional",
        "Informational Only",
      ],
      compliance_type: ["None", "AD", "SB", "SL", "KAS", "ASB", "Other"],
      component_type: ["Airframe", "Propeller", "Avionics", "Other"],
      counter_type: ["Hobbs", "Tach", "Airframe TT", "Engine TT", "Prop TT"],
      counter_type_for_hour_allocation: [
        "Tach",
        "Hobbs",
        "EngineHours",
        "AirframeHours",
        "FlightTime",
        "BlockTime",
      ],
      db_compliance_status: [
        "Not Reviewed",
        "Not Complied",
        "Complied Once",
        "Recurring (Current)",
        "Overdue",
        "Not Applicable",
      ],
      device_type: ["Desktop", "Laptop", "Tablet", "Phone", "Other"],
      directive_category: [
        "Airframe",
        "Engine",
        "Propeller",
        "Avionics",
        "System",
        "Appliance",
        "Other",
      ],
      directive_performed_by_role: [
        "Owner/Builder",
        "Owner/Pilot",
        "A&P",
        "IA",
        "Rotax IRMT",
        "Maintenance Shop",
        "Other",
      ],
      directive_severity: [
        "Emergency",
        "Mandatory",
        "Recommended",
        "Informational",
      ],
      directive_status: [
        "Active",
        "Superseded",
        "Withdrawn",
        "Proposed",
        "Completed",
        "Resolved",
      ],
      directive_type: [
        "FAA Airworthiness Directive",
        "Manufacturer Alert",
        "Manufacturer Mandatory",
        "Service Bulletin",
        "Service Instruction",
        "Information Bulletin",
        "Other",
      ],
      feature_status: ["open", "completed", "duplicate", "closed"],
      initial_due_type: [
        "Before Next Flight",
        "By Date",
        "By Total Time (Hours)",
        "By Calendar (Months)",
        "At Next Inspection",
        "Other",
      ],
      install_context: ["Installed", "Portable", "Tool", "Other"],
      interval_type: ["Hours", "Calendar", "Mixed", "None"],
      maintenance_category: [
        "Airplane",
        "Airframe",
        "Engine",
        "Propeller",
        "Avionics",
        "Electrical",
        "Interior",
        "Exterior",
        "Accessories",
        "Other",
      ],
      maintenance_subcategory: [
        "Inspection",
        "Repair",
        "Replacement",
        "Modification",
        "Software Update",
        "Compliance",
        "Troubleshooting",
        "Scheduled Maintenance",
        "Other",
      ],
      membership_status: ["Applied", "Approved", "Suspended"],
      notification_basis: ["Date", "Counter"],
      notification_type: ["Maintenance", "Subscription", "Directives", "Other"],
      performed_by_type: ["Owner", "A&P", "LSRM", "Repairman", "Shop", "Other"],
      recurrence_type: [
        "Weekly",
        "Bi-Monthly",
        "Monthly",
        "Quarterly",
        "Semi-Annual",
        "Yearly",
        "None",
      ],
      reference_type: [
        "Commitment",
        "Maintenance",
        "Directive",
        "Compliance",
        "Equipment",
        "Trip",
        "Other",
      ],
      subscription_type: [
        "EFB & Flight Planning",
        "Avionics Subscriptions",
        "Aircraft Maintenance, Tracking, & Record Services",
        "Proficiency & Safety Tools",
        "Aviation Community Memberships",
        "Weather Tools",
        "Magazine Subscription",
        "Aircraft Operations & Financial Tools",
        "Hardware-Related Annual Fees",
        "Insurance Related Add-Ons",
        "Other",
        "Facilities & Storage",
        "Insurance",
        "Navigation, Charts & Flight Planning",
        "Avionics Data & Services",
        "Maintenance, Compliance & Records",
        "Training, Proficiency & Safety",
        "Memberships & Associations",
        "Publications & Media",
        "Operations & Administration",
        "Hardware-Related Services",
      ],
      transaction_category: [
        "Fuel",
        "Oil & Consumables",
        "Hangar / Tie-Down",
        "Insurance",
        "Avionics",
        "Maintenance Labor",
        "Maintenance Parts",
        "Training",
        "Travel",
        "Tools & Equipment",
        "Other",
      ],
      transaction_direction: ["Debit", "Credit"],
      transaction_intent: [
        "Ownership",
        "Operation",
        "Maintenance",
        "Compliance",
        "Capital",
        "Training",
        "Travel",
        "Other",
      ],
      transaction_source: ["Manual", "Commitment", "Imported"],
      transaction_status: ["Pending", "Posted", "Skipped", "Voided"],
    },
  },
} as const
