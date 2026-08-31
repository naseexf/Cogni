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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          pinned: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          portal_name: string
          singleton: boolean
          timezone: string
          updated_at: string
          weekly_digest: boolean
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          portal_name?: string
          singleton?: boolean
          timezone?: string
          updated_at?: string
          weekly_digest?: boolean
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          portal_name?: string
          singleton?: boolean
          timezone?: string
          updated_at?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          associated_with: string | null
          content_text: string | null
          created_at: string
          created_by: string | null
          file_mime: string | null
          file_name: string | null
          id: string
          image_url: string | null
          storage_path: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          associated_with?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          file_mime?: string | null
          file_name?: string | null
          id?: string
          image_url?: string | null
          storage_path?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          associated_with?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          file_mime?: string | null
          file_name?: string | null
          id?: string
          image_url?: string | null
          storage_path?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_dm: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_dm?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_dm?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          author_id: string | null
          body: string | null
          channel_id: string
          created_at: string
          edited_at: string | null
          file_mime: string | null
          file_name: string | null
          file_size: number | null
          id: string
          reply_to_id: string | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          channel_id: string
          created_at?: string
          edited_at?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          reply_to_id?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          channel_id?: string
          created_at?: string
          edited_at?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          reply_to_id?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          college: string | null
          created_at: string
          created_by: string | null
          designation: string | null
          email: string | null
          id: string
          last_contacted: string | null
          name: string
          notes: string | null
          partnership_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          college?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          last_contacted?: string | null
          name: string
          notes?: string | null
          partnership_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          college?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          last_contacted?: string | null
          name?: string
          notes?: string | null
          partnership_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_root: boolean
          name: string
          parent_id: string | null
          section: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_root?: boolean
          name: string
          parent_id?: string | null
          section: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_root?: boolean
          name?: string
          parent_id?: string | null
          section?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          content_snapshot: string | null
          created_at: string
          created_by: string | null
          document_id: string
          file_url: string | null
          id: string
          version_note: string
        }
        Insert: {
          content_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          document_id: string
          file_url?: string | null
          id?: string
          version_note: string
        }
        Update: {
          content_snapshot?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_url?: string | null
          id?: string
          version_note?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content_text: string | null
          created_at: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          file_size: number | null
          file_url: string | null
          folder_id: string | null
          id: string
          mime_type: string | null
          partnership_id: string | null
          storage_path: string | null
          tags: string[]
          title: string
          updated_at: string
          uploaded_by: string | null
          version_note: string | null
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_size?: number | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          partnership_id?: string | null
          storage_path?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version_note?: string | null
        }
        Update: {
          content_text?: string | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_size?: number | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          partnership_id?: string | null
          storage_path?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string | null
          owner_id: string | null
          partnership_id: string | null
          starts_at: string
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          owner_id?: string | null
          partnership_id?: string | null
          starts_at: string
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          owner_id?: string | null
          partnership_id?: string | null
          starts_at?: string
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fee_records: {
        Row: {
          amount: number
          attendance_mode: string
          batch: string
          college: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          location: string
          notes: string | null
          paid: boolean
          paid_date: string | null
          payment_method: string | null
          phone: string | null
          student_name: string
          updated_at: string
          year_of_study: string | null
        }
        Insert: {
          amount?: number
          attendance_mode?: string
          batch: string
          college?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          location: string
          notes?: string | null
          paid?: boolean
          paid_date?: string | null
          payment_method?: string | null
          phone?: string | null
          student_name: string
          updated_at?: string
          year_of_study?: string | null
        }
        Update: {
          amount?: number
          attendance_mode?: string
          batch?: string
          college?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          location?: string
          notes?: string | null
          paid?: boolean
          paid_date?: string | null
          payment_method?: string | null
          phone?: string | null
          student_name?: string
          updated_at?: string
          year_of_study?: string | null
        }
        Relationships: []
      }
      initiatives: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      interns: {
        Row: {
          batch: string | null
          certificate_issued: boolean
          college: string | null
          created_at: string
          email: string | null
          end_date: string | null
          full_name: string
          id: string
          notes: string | null
          offer_letter_sent: boolean
          phone: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["intern_status"]
          updated_at: string
        }
        Insert: {
          batch?: string | null
          certificate_issued?: boolean
          college?: string | null
          created_at?: string
          email?: string | null
          end_date?: string | null
          full_name: string
          id?: string
          notes?: string | null
          offer_letter_sent?: boolean
          phone?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["intern_status"]
          updated_at?: string
        }
        Update: {
          batch?: string | null
          certificate_issued?: boolean
          college?: string | null
          created_at?: string
          email?: string | null
          end_date?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          offer_letter_sent?: boolean
          phone?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["intern_status"]
          updated_at?: string
        }
        Relationships: []
      }
      org_nodes: {
        Row: {
          created_at: string
          id: string
          label: string
          parent_id: string | null
          person_id: string | null
          position: number
          role_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          parent_id?: string | null
          person_id?: string | null
          position?: number
          role_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          parent_id?: string | null
          person_id?: string | null
          position?: number
          role_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_nodes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          partnership_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          partnership_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          partnership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_notes_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_role: string | null
          created_at: string
          created_by: string | null
          id: string
          last_activity_at: string
          name: string
          next_action: string | null
          stage: Database["public"]["Enums"]["partnership_stage"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_activity_at?: string
          name: string
          next_action?: string | null
          stage?: Database["public"]["Enums"]["partnership_stage"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_activity_at?: string
          name?: string
          next_action?: string | null
          stage?: Database["public"]["Enums"]["partnership_stage"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule_days: {
        Row: {
          activities: string[]
          created_at: string
          day_number: number
          day_type: string
          id: string
          resource_person: string
          sort_order: number
          template_name: string
          title: string | null
          updated_at: string
          updated_by: string | null
          week_number: number
        }
        Insert: {
          activities?: string[]
          created_at?: string
          day_number?: number
          day_type?: string
          id?: string
          resource_person?: string
          sort_order?: number
          template_name?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          week_number?: number
        }
        Update: {
          activities?: string[]
          created_at?: string
          day_number?: number
          day_type?: string
          id?: string
          resource_person?: string
          sort_order?: number
          template_name?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          week_number?: number
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          initiative_id: string | null
          partnership_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          initiative_id?: string | null
          partnership_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          initiative_id?: string | null
          partnership_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_mime: string | null
          file_name: string | null
          file_size: number | null
          id: string
          name: string
          storage_path: string | null
          template_type: Database["public"]["Enums"]["template_type"]
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          name: string
          storage_path?: string | null
          template_type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          name?: string
          storage_path?: string | null
          template_type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_chat_channel: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
      asset_type:
        | "poster"
        | "logo"
        | "business_card"
        | "lovable_prompt"
        | "whatsapp_template"
        | "other"
      doc_type:
        | "proposal"
        | "event_report"
        | "promotional"
        | "lovable_prompt"
        | "internal_note"
        | "other"
      event_type: "session" | "deadline" | "internal" | "college_visit"
      intern_status: "applied" | "active" | "completed" | "dropped"
      partnership_stage:
        | "prospecting"
        | "proposal_sent"
        | "under_review"
        | "negotiation"
        | "signed_active"
        | "on_hold"
      task_priority: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "in_review" | "done"
      template_type:
        | "proposal"
        | "event_report"
        | "whatsapp"
        | "business_card"
        | "other"
        | "brochure"
        | "slides"
        | "write_up"
        | "poster"
        | "visiting_card"
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
      app_role: ["admin", "member"],
      asset_type: [
        "poster",
        "logo",
        "business_card",
        "lovable_prompt",
        "whatsapp_template",
        "other",
      ],
      doc_type: [
        "proposal",
        "event_report",
        "promotional",
        "lovable_prompt",
        "internal_note",
        "other",
      ],
      event_type: ["session", "deadline", "internal", "college_visit"],
      intern_status: ["applied", "active", "completed", "dropped"],
      partnership_stage: [
        "prospecting",
        "proposal_sent",
        "under_review",
        "negotiation",
        "signed_active",
        "on_hold",
      ],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "in_review", "done"],
      template_type: [
        "proposal",
        "event_report",
        "whatsapp",
        "business_card",
        "other",
        "brochure",
        "slides",
        "write_up",
        "poster",
        "visiting_card",
      ],
    },
  },
} as const
