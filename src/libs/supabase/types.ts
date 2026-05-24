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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievement_log_entry: {
        Row: {
          created_at: string
          id: string
          integrated_at: string | null
          normalized_text: string | null
          raw_text: string
          status: Database["public"]["Enums"]["achievement_status"]
          target_section:
            | Database["public"]["Enums"]["achievement_section"]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          integrated_at?: string | null
          normalized_text?: string | null
          raw_text: string
          status?: Database["public"]["Enums"]["achievement_status"]
          target_section?:
            | Database["public"]["Enums"]["achievement_section"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          integrated_at?: string | null
          normalized_text?: string | null
          raw_text?: string
          status?: Database["public"]["Enums"]["achievement_status"]
          target_section?:
            | Database["public"]["Enums"]["achievement_section"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certification: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          link: string | null
          name: string
          position: number
          profile_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          link?: string | null
          name: string
          position?: number
          profile_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          link?: string | null
          name?: string
          position?: number
          profile_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_session"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_session: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      cv_preferences: {
        Row: {
          accent_hex: string
          certification_date_format: Database["public"]["Enums"]["cv_date_format"]
          created_at: string
          education_date_format: Database["public"]["Enums"]["cv_date_format"]
          id: string
          last_active_session_id: string | null
          last_previewed_kind: string | null
          last_previewed_ref_id: string | null
          master_pdf_path: string | null
          template: Database["public"]["Enums"]["cv_template"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_hex?: string
          certification_date_format?: Database["public"]["Enums"]["cv_date_format"]
          created_at?: string
          education_date_format?: Database["public"]["Enums"]["cv_date_format"]
          id?: string
          last_active_session_id?: string | null
          last_previewed_kind?: string | null
          last_previewed_ref_id?: string | null
          master_pdf_path?: string | null
          template?: Database["public"]["Enums"]["cv_template"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_hex?: string
          certification_date_format?: Database["public"]["Enums"]["cv_date_format"]
          created_at?: string
          education_date_format?: Database["public"]["Enums"]["cv_date_format"]
          id?: string
          last_active_session_id?: string | null
          last_previewed_kind?: string | null
          last_previewed_ref_id?: string | null
          master_pdf_path?: string | null
          template?: Database["public"]["Enums"]["cv_template"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_preferences_last_active_session_id_fkey"
            columns: ["last_active_session_id"]
            isOneToOne: false
            referencedRelation: "chat_session"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string
          degree: string | null
          end_date: string | null
          field: string | null
          id: string
          institution: string
          position: number
          profile_id: string
          start_date: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree?: string | null
          end_date?: string | null
          field?: string | null
          id?: string
          institution: string
          position?: number
          profile_id: string
          start_date?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string | null
          end_date?: string | null
          field?: string | null
          id?: string
          institution?: string
          position?: number
          profile_id?: string
          start_date?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      experience: {
        Row: {
          bullets: Json
          company: string
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          location: string | null
          position: number
          profile_id: string
          role: string
          stack: Json
          start_date: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bullets?: Json
          company: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          position?: number
          profile_id: string
          role: string
          stack?: Json
          start_date?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bullets?: Json
          company?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          position?: number
          profile_id?: string
          role?: string
          stack?: Json
          start_date?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      job_description: {
        Row: {
          company: string | null
          created_at: string
          id: string
          raw_text: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: string
          raw_text: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: string
          raw_text?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      language: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          proficiency:
            | Database["public"]["Enums"]["language_proficiency"]
            | null
          profile_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          proficiency?:
            | Database["public"]["Enums"]["language_proficiency"]
            | null
          profile_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          proficiency?:
            | Database["public"]["Enums"]["language_proficiency"]
            | null
          profile_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          type: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Relationships: []
      }
      profile: {
        Row: {
          contact_email: string | null
          created_at: string
          full_name: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          summary: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      project: {
        Row: {
          bullets: Json
          created_at: string
          description: string | null
          id: string
          link: string | null
          name: string
          position: number
          profile_id: string
          stack: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          bullets?: Json
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          name: string
          position?: number
          profile_id: string
          stack?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          bullets?: Json
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          name?: string
          position?: number
          profile_id?: string
          stack?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      skill: {
        Row: {
          category: string | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["skill_level"] | null
          name: string
          position: number
          profile_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["skill_level"] | null
          name: string
          position?: number
          profile_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["skill_level"] | null
          name?: string
          position?: number
          profile_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      tailored_cv: {
        Row: {
          accent_hex: string | null
          created_at: string
          id: string
          job_description_id: string | null
          pdf_path: string | null
          sections: Json
          source_profile_snapshot: Json
          summary: string | null
          template: Database["public"]["Enums"]["cv_template"] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_hex?: string | null
          created_at?: string
          id?: string
          job_description_id?: string | null
          pdf_path?: string | null
          sections?: Json
          source_profile_snapshot: Json
          summary?: string | null
          template?: Database["public"]["Enums"]["cv_template"] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_hex?: string | null
          created_at?: string
          id?: string
          job_description_id?: string | null
          pdf_path?: string | null
          sections?: Json
          source_profile_snapshot?: Json
          summary?: string | null
          template?: Database["public"]["Enums"]["cv_template"] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tailored_cv_job_description_id_fkey"
            columns: ["job_description_id"]
            isOneToOne: false
            referencedRelation: "job_description"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          full_name: string | null
          id: string
          payment_method: Json | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id: string
          payment_method?: Json | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id?: string
          payment_method?: Json | null
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
      achievement_section:
        | "summary"
        | "experience"
        | "project"
        | "skill"
        | "education"
        | "certification"
        | "language"
      achievement_status: "pending" | "integrated" | "dismissed"
      cv_date_format: "year" | "mm_yyyy" | "mon_yyyy" | "mon_d_yyyy"
      cv_template: "single-column" | "two-column"
      language_proficiency:
        | "beginner"
        | "elementary"
        | "intermediate"
        | "upper_intermediate"
        | "advanced"
        | "native"
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      skill_level: "beginner" | "intermediate" | "advanced" | "expert"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
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
      achievement_section: [
        "summary",
        "experience",
        "project",
        "skill",
        "education",
        "certification",
        "language",
      ],
      achievement_status: ["pending", "integrated", "dismissed"],
      cv_date_format: ["year", "mm_yyyy", "mon_yyyy", "mon_d_yyyy"],
      cv_template: ["single-column", "two-column"],
      language_proficiency: [
        "beginner",
        "elementary",
        "intermediate",
        "upper_intermediate",
        "advanced",
        "native",
      ],
      pricing_plan_interval: ["day", "week", "month", "year"],
      pricing_type: ["one_time", "recurring"],
      skill_level: ["beginner", "intermediate", "advanced", "expert"],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
        "paused",
      ],
    },
  },
} as const
