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
      advice_note: {
        Row: {
          body: string
          cover_letter_id: string | null
          created_at: string
          id: string
          severity: Database["public"]["Enums"]["advice_severity"]
          status: Database["public"]["Enums"]["advice_status"]
          tailored_cv_id: string | null
          target: Database["public"]["Enums"]["advice_target"]
          target_ref_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          severity?: Database["public"]["Enums"]["advice_severity"]
          status?: Database["public"]["Enums"]["advice_status"]
          tailored_cv_id?: string | null
          target: Database["public"]["Enums"]["advice_target"]
          target_ref_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          severity?: Database["public"]["Enums"]["advice_severity"]
          status?: Database["public"]["Enums"]["advice_status"]
          tailored_cv_id?: string | null
          target?: Database["public"]["Enums"]["advice_target"]
          target_ref_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advice_note_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "cover_letter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advice_note_tailored_cv_id_fkey"
            columns: ["tailored_cv_id"]
            isOneToOne: false
            referencedRelation: "tailored_cv"
            referencedColumns: ["id"]
          },
        ]
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
      cover_letter: {
        Row: {
          body: string
          created_at: string
          id: string
          job_description_id: string
          pdf_path: string | null
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          job_description_id: string
          pdf_path?: string | null
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          job_description_id?: string
          pdf_path?: string | null
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letter_job_description_id_fkey"
            columns: ["job_description_id"]
            isOneToOne: false
            referencedRelation: "job_description"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          id: string
          master_pdf_path: string | null
          pinned_tailored_cv_id: string | null
          template: Database["public"]["Enums"]["cv_template"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_hex?: string
          created_at?: string
          id?: string
          master_pdf_path?: string | null
          pinned_tailored_cv_id?: string | null
          template?: Database["public"]["Enums"]["cv_template"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_hex?: string
          created_at?: string
          id?: string
          master_pdf_path?: string | null
          pinned_tailored_cv_id?: string | null
          template?: Database["public"]["Enums"]["cv_template"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_preferences_pinned_tailored_cv_id_fkey"
            columns: ["pinned_tailored_cv_id"]
            isOneToOne: false
            referencedRelation: "tailored_cv"
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
      interview_advice: {
        Row: {
          body: string
          created_at: string
          id: string
          interview_answer_id: string | null
          severity: Database["public"]["Enums"]["advice_severity"]
          status: Database["public"]["Enums"]["advice_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          interview_answer_id?: string | null
          severity?: Database["public"]["Enums"]["advice_severity"]
          status?: Database["public"]["Enums"]["advice_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          interview_answer_id?: string | null
          severity?: Database["public"]["Enums"]["advice_severity"]
          status?: Database["public"]["Enums"]["advice_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_advice_interview_answer_id_fkey"
            columns: ["interview_answer_id"]
            isOneToOne: false
            referencedRelation: "interview_answer"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_answer: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_description: {
        Row: {
          company: string | null
          created_at: string
          extracted: Json | null
          id: string
          raw_text: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          extracted?: Json | null
          id?: string
          raw_text: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          extracted?: Json | null
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
          created_at: string
          id: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
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
          created_at: string
          id: string
          job_description_id: string
          pdf_path: string | null
          profile_snapshot: Json
          sections: Json
          slug: string
          status: Database["public"]["Enums"]["cv_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_description_id: string
          pdf_path?: string | null
          profile_snapshot: Json
          sections?: Json
          slug: string
          status?: Database["public"]["Enums"]["cv_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_description_id?: string
          pdf_path?: string | null
          profile_snapshot?: Json
          sections?: Json
          slug?: string
          status?: Database["public"]["Enums"]["cv_status"]
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
      advice_severity: "info" | "weak" | "gap"
      advice_status: "open" | "applied" | "dismissed"
      advice_target:
        | "summary"
        | "experience"
        | "projects"
        | "skills"
        | "education"
        | "certs"
        | "languages"
        | "global"
      cv_status: "draft" | "final"
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
      advice_severity: ["info", "weak", "gap"],
      advice_status: ["open", "applied", "dismissed"],
      advice_target: [
        "summary",
        "experience",
        "projects",
        "skills",
        "education",
        "certs",
        "languages",
        "global",
      ],
      cv_status: ["draft", "final"],
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
