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
      maintenance_logs: {
        Row: {
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
            foreignKeyName: "maintenance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          completed_at: string | null
          component: Database["public"]["Enums"]["component_type"]
          created_at: string | null
          description: string
          id: string
          initial_date: string
          is_completed: boolean | null
          notes: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          component: Database["public"]["Enums"]["component_type"]
          created_at?: string | null
          description: string
          id?: string
          initial_date: string
          is_completed?: boolean | null
          notes?: string | null
          recurrence: Database["public"]["Enums"]["recurrence_type"]
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          component?: Database["public"]["Enums"]["component_type"]
          created_at?: string | null
          description?: string
          id?: string
          initial_date?: string
          is_completed?: boolean | null
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["recurrence_type"]
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      compliance_type: "None" | "AD" | "SB" | "SL" | "KAS" | "ASB" | "Other"
      component_type: "Airframe" | "Propeller" | "Avionics" | "Other"
      interval_type: "Hours" | "Calendar" | "Mixed" | "None"
      maintenance_category:
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
      notification_type: "Maintenance" | "Subscription"
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
      compliance_type: ["None", "AD", "SB", "SL", "KAS", "ASB", "Other"],
      component_type: ["Airframe", "Propeller", "Avionics", "Other"],
      interval_type: ["Hours", "Calendar", "Mixed", "None"],
      maintenance_category: [
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
      notification_type: ["Maintenance", "Subscription"],
      performed_by_type: ["Owner", "A&P", "LSRM", "Repairman", "Shop", "Other"],
      recurrence_type: [
        "Weekly",
        "Bi-Monthly",
        "Monthly",
        "Quarterly",
        "Semi-Annual",
        "Yearly",
      ],
    },
  },
} as const
