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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_setting: {
        Row: {
          first_followup_min: number
          id: number
          max_nudges: number
          quiet_end: string
          quiet_start: string
          reply_delay_max_sec: number
          reply_delay_min_sec: number
          required_pillars: Json
          stall_nudge_hours: number
          timezone: string
          vertical_questions: Json
        }
        Insert: {
          first_followup_min?: number
          id?: number
          max_nudges?: number
          quiet_end?: string
          quiet_start?: string
          reply_delay_max_sec?: number
          reply_delay_min_sec?: number
          required_pillars: Json
          stall_nudge_hours?: number
          timezone?: string
          vertical_questions: Json
        }
        Update: {
          first_followup_min?: number
          id?: number
          max_nudges?: number
          quiet_end?: string
          quiet_start?: string
          reply_delay_max_sec?: number
          reply_delay_min_sec?: number
          required_pillars?: Json
          stall_nudge_hours?: number
          timezone?: string
          vertical_questions?: Json
        }
        Relationships: []
      }
      blip_config_item: {
        Row: {
          area: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          area: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          area?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      blip_correction: {
        Row: {
          alyx_actual: string
          blip_draft: string
          blip_release_id: string | null
          created_at: string
          id: string
          kind: string
          lead_id: string | null
          message_id: string | null
          resolved_at: string | null
        }
        Insert: {
          alyx_actual: string
          blip_draft: string
          blip_release_id?: string | null
          created_at?: string
          id?: string
          kind: string
          lead_id?: string | null
          message_id?: string | null
          resolved_at?: string | null
        }
        Update: {
          alyx_actual?: string
          blip_draft?: string
          blip_release_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string | null
          message_id?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blip_correction_blip_release_id_fkey"
            columns: ["blip_release_id"]
            isOneToOne: false
            referencedRelation: "blip_release"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blip_correction_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blip_correction_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message"
            referencedColumns: ["id"]
          },
        ]
      }
      blip_correction_learning: {
        Row: {
          area: string
          correction_id: string
          id: string
          status: string
        }
        Insert: {
          area: string
          correction_id: string
          id?: string
          status?: string
        }
        Update: {
          area?: string
          correction_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "blip_correction_learning_correction_id_fkey"
            columns: ["correction_id"]
            isOneToOne: false
            referencedRelation: "blip_correction"
            referencedColumns: ["id"]
          },
        ]
      }
      blip_release: {
        Row: {
          app_version: string | null
          compiled_prompts: Json
          config_snapshot: Json
          created_at: string
          id: string
          knowledge_snapshot: Json
          notes: string | null
          number: number
          parent_release_id: string | null
          promoted_at: string | null
          status: string
        }
        Insert: {
          app_version?: string | null
          compiled_prompts: Json
          config_snapshot: Json
          created_at?: string
          id?: string
          knowledge_snapshot: Json
          notes?: string | null
          number: number
          parent_release_id?: string | null
          promoted_at?: string | null
          status?: string
        }
        Update: {
          app_version?: string | null
          compiled_prompts?: Json
          config_snapshot?: Json
          created_at?: string
          id?: string
          knowledge_snapshot?: Json
          notes?: string | null
          number?: number
          parent_release_id?: string | null
          promoted_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "blip_release_parent_release_id_fkey"
            columns: ["parent_release_id"]
            isOneToOne: false
            referencedRelation: "blip_release"
            referencedColumns: ["id"]
          },
        ]
      }
      blip_replay_run: {
        Row: {
          conversation_count: number
          created_at: string
          id: string
          metrics: Json
          release_id: string
        }
        Insert: {
          conversation_count: number
          created_at?: string
          id?: string
          metrics: Json
          release_id: string
        }
        Update: {
          conversation_count?: number
          created_at?: string
          id?: string
          metrics?: Json
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blip_replay_run_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "blip_release"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          kind: string
          lead_id: string | null
          starts_at: string
          title: string | null
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          kind: string
          lead_id?: string | null
          starts_at: string
          title?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          kind?: string
          lead_id?: string | null
          starts_at?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead"
            referencedColumns: ["id"]
          },
        ]
      }
      client: {
        Row: {
          contact: string | null
          created_at: string
          ends_at: string | null
          id: string
          lead_id: string | null
          name: string
          plan_id: string | null
          sent_number: string | null
          sent_subaccount_id: string | null
          started_at: string
          status: string
          term: string
          tier: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          lead_id?: string | null
          name: string
          plan_id?: string | null
          sent_number?: string | null
          sent_subaccount_id?: string | null
          started_at: string
          status?: string
          term?: string
          tier: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          plan_id?: string | null
          sent_number?: string | null
          sent_subaccount_id?: string | null
          started_at?: string
          status?: string
          term?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
        ]
      }
      client_customer_payment: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          currency: string
          id: string
          kind: string
          occurred_at: string
          status: string
          stripe_account_id: string
          stripe_object_id: string
        }
        Insert: {
          amount_cents?: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          kind: string
          occurred_at?: string
          status?: string
          stripe_account_id: string
          stripe_object_id: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          occurred_at?: string
          status?: string
          stripe_account_id?: string
          stripe_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_customer_payment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payment_connection: {
        Row: {
          client_id: string
          connected_at: string | null
          connection_status: string
          created_at: string
          disconnected_at: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          provider: string
          scope: string
          stripe_account_id: string
          stripe_business_name: string | null
          stripe_last4: string | null
        }
        Insert: {
          client_id: string
          connected_at?: string | null
          connection_status?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          scope?: string
          stripe_account_id: string
          stripe_business_name?: string | null
          stripe_last4?: string | null
        }
        Update: {
          client_id?: string
          connected_at?: string | null
          connection_status?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          scope?: string
          stripe_account_id?: string
          stripe_business_name?: string | null
          stripe_last4?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payment_connection_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      client_usage: {
        Row: {
          client_id: string
          id: string
          overage_segments: number
          period_start: string
          segments_used: number
          warned_at_80: string | null
          warned_email_at: string | null
        }
        Insert: {
          client_id: string
          id?: string
          overage_segments?: number
          period_start: string
          segments_used?: number
          warned_at_80?: string | null
          warned_email_at?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          overage_segments?: number
          period_start?: string
          segments_used?: number
          warned_at_80?: string | null
          warned_email_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      event_log: {
        Row: {
          action: string
          app_version: string | null
          created_at: string
          detail: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          app_version?: string | null
          created_at?: string
          detail?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          app_version?: string | null
          created_at?: string
          detail?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      lead: {
        Row: {
          automation_state: string
          business: string
          call_requested_at: string | null
          consent_at: string | null
          contact: string | null
          created_at: string
          email: string | null
          engagement_state: string
          id: string
          last_inbound_at: string | null
          last_outbound_at: string | null
          nudge_count: number
          opted_out_at: string | null
          phone: string | null
          pillars: Json
          qualification_state: string
          screening_state: string
          source: string | null
          stage: string
          tags: string[]
          vertical: string | null
        }
        Insert: {
          automation_state?: string
          business: string
          call_requested_at?: string | null
          consent_at?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          engagement_state?: string
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          nudge_count?: number
          opted_out_at?: string | null
          phone?: string | null
          pillars?: Json
          qualification_state?: string
          screening_state?: string
          source?: string | null
          stage?: string
          tags?: string[]
          vertical?: string | null
        }
        Update: {
          automation_state?: string
          business?: string
          call_requested_at?: string | null
          consent_at?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          engagement_state?: string
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          nudge_count?: number
          opted_out_at?: string | null
          phone?: string | null
          pillars?: Json
          qualification_state?: string
          screening_state?: string
          source?: string | null
          stage?: string
          tags?: string[]
          vertical?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          business: string | null
          business_type: string | null
          created_at: string
          id: string
          message: string | null
          name: string | null
          phone: string | null
        }
        Insert: {
          business?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
        }
        Update: {
          business?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      link_group: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          position: number
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          position?: number
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "link_group_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "link_group"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempt: {
        Row: {
          created_at: string
          email_key: string
          id: string
          ip: string | null
          succeeded: boolean
        }
        Insert: {
          created_at?: string
          email_key: string
          id?: string
          ip?: string | null
          succeeded?: boolean
        }
        Update: {
          created_at?: string
          email_key?: string
          id?: string
          ip?: string | null
          succeeded?: boolean
        }
        Relationships: []
      }
      message: {
        Row: {
          app_version: string | null
          authored_by: string
          blip_release_id: string | null
          body: string
          created_at: string
          direction: string
          held_reason: string | null
          id: string
          lead_id: string
          provider_id: string | null
          segments: number
          send_after: string | null
          sent_at: string | null
          status: string
          validation_retries: number
        }
        Insert: {
          app_version?: string | null
          authored_by?: string
          blip_release_id?: string | null
          body: string
          created_at?: string
          direction: string
          held_reason?: string | null
          id?: string
          lead_id: string
          provider_id?: string | null
          segments?: number
          send_after?: string | null
          sent_at?: string | null
          status?: string
          validation_retries?: number
        }
        Update: {
          app_version?: string | null
          authored_by?: string
          blip_release_id?: string | null
          body?: string
          created_at?: string
          direction?: string
          held_reason?: string | null
          id?: string
          lead_id?: string
          provider_id?: string | null
          segments?: number
          send_after?: string | null
          sent_at?: string | null
          status?: string
          validation_retries?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_blip_release_id_fkey"
            columns: ["blip_release_id"]
            isOneToOne: false
            referencedRelation: "blip_release"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead"
            referencedColumns: ["id"]
          },
        ]
      }
      plan: {
        Row: {
          blip_release_id: string | null
          closing: string | null
          created_at: string
          expires_at: string | null
          headline: string | null
          id: string
          lead_id: string
          monthly: number
          override_reason: string | null
          pricing_ruleset_version: number
          problems: Json | null
          ready_at: string | null
          reason: string
          sent_at: string | null
          setup: number
          situation: string | null
          slug: string | null
          status: string
          tier: string
          views: number
        }
        Insert: {
          blip_release_id?: string | null
          closing?: string | null
          created_at?: string
          expires_at?: string | null
          headline?: string | null
          id?: string
          lead_id: string
          monthly: number
          override_reason?: string | null
          pricing_ruleset_version: number
          problems?: Json | null
          ready_at?: string | null
          reason: string
          sent_at?: string | null
          setup: number
          situation?: string | null
          slug?: string | null
          status?: string
          tier: string
          views?: number
        }
        Update: {
          blip_release_id?: string | null
          closing?: string | null
          created_at?: string
          expires_at?: string | null
          headline?: string | null
          id?: string
          lead_id?: string
          monthly?: number
          override_reason?: string | null
          pricing_ruleset_version?: number
          problems?: Json | null
          ready_at?: string | null
          reason?: string
          sent_at?: string | null
          setup?: number
          situation?: string | null
          slug?: string | null
          status?: string
          tier?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_blip_release_id_fkey"
            columns: ["blip_release_id"]
            isOneToOne: false
            referencedRelation: "blip_release"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_ruleset: {
        Row: {
          created_at: string
          effective_from: string
          features: Json
          id: string
          number: number
          tag_floors: Json
          tiers: Json
        }
        Insert: {
          created_at?: string
          effective_from?: string
          features: Json
          id?: string
          number: number
          tag_floors: Json
          tiers: Json
        }
        Update: {
          created_at?: string
          effective_from?: string
          features?: Json
          id?: string
          number?: number
          tag_floors?: Json
          tiers?: Json
        }
        Relationships: []
      }
      retainer_payment: {
        Row: {
          amount_cents: number
          client_id: string | null
          created_at: string
          currency: string
          customer_email: string | null
          description: string | null
          id: string
          kind: string
          matched_at: string | null
          occurred_at: string
          status: string
          stripe_object_id: string
        }
        Insert: {
          amount_cents?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          description?: string | null
          id?: string
          kind: string
          matched_at?: string | null
          occurred_at?: string
          status?: string
          stripe_object_id: string
        }
        Update: {
          amount_cents?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          description?: string | null
          id?: string
          kind?: string
          matched_at?: string | null
          occurred_at?: string
          status?: string
          stripe_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retainer_payment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_state: {
        Row: {
          autonomy_level: string
          id: number
          kill_switch: boolean
          updated_at: string
        }
        Insert: {
          autonomy_level?: string
          id?: number
          kill_switch?: boolean
          updated_at?: string
        }
        Update: {
          autonomy_level?: string
          id?: number
          kill_switch?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      stripe_oauth_state: {
        Row: {
          client_id: string
          consumed_at: string | null
          expires_at: string
          nonce: string
          scope: string
        }
        Insert: {
          client_id: string
          consumed_at?: string | null
          expires_at: string
          nonce: string
          scope: string
        }
        Update: {
          client_id?: string
          consumed_at?: string | null
          expires_at?: string
          nonce?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_oauth_state_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_link: {
        Row: {
          clicks: number
          created_at: string
          destination: string
          forms: number
          group_id: string | null
          id: string
          label: string
          real_clicks: number
          slug: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          destination: string
          forms?: number
          group_id?: string | null
          id?: string
          label: string
          real_clicks?: number
          slug: string
        }
        Update: {
          clicks?: number
          created_at?: string
          destination?: string
          forms?: number
          group_id?: string | null
          id?: string
          label?: string
          real_clicks?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_link_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "link_group"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_event: {
        Row: {
          account_id: string | null
          event_id: string
          processed_at: string | null
          received_at: string
          source: string
        }
        Insert: {
          account_id?: string | null
          event_id: string
          processed_at?: string | null
          received_at?: string
          source: string
        }
        Update: {
          account_id?: string | null
          event_id?: string
          processed_at?: string | null
          received_at?: string
          source?: string
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
      app_role: "admin" | "staff" | "user"
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
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
