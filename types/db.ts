export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  position: string
  address: string
  city: string
  postal_code: string
  country: string
  timezone: string
  language: string
  bio: string
  avatar_url: string | null
}

export interface SecuritySettings {
  user_id: string
  two_factor_enabled: boolean
  password_last_changed: string
  login_notifications: boolean
}

export interface NotificationSettings {
  user_id: string
  email_notifications: boolean
  sms_notifications: boolean
  review_alerts: boolean
  weekly_reports: boolean
  marketing_emails: boolean
  notification_email: string | null // New field for notification email
  reply_email: string | null // New field for reply email
}

export interface ReviewLink {
  id: string
  user_id: string
  company_name: string
  review_url: string
  review_qr_code: string
  company_logo_url: string | null
  primary_color: string
  secondary_color: string
  show_badge: boolean
  rating_page_content: string
  redirect_message: string
  internal_notification_message: string
  video_upload_message: string
  google_review_link: string | null
  trustpilot_review_link: string | null
  facebook_review_link: string | null
  enabled_platforms: string[]
  background_color: string
  text_color: string
  button_text_color: string
  button_style: string
  font: string
  links: any[]
  header_settings: any
  initial_view_settings: any
  negative_settings: any
  video_upload_settings: any
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  customer_name: string
  customer_email: string
  rating: number
  title: string
  comment: string
  platform: string
  status: string
  response: string | null
  helpful_count: number
  verified: boolean
  created_at: string
  updated_at: string
  user_id: string
  google_review_id?: string | null
  author_url?: string | null
  profile_photo_url?: string | null
}

export interface AutomationSettings {
  user_id: string
  automation_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
}

export interface TriggerSettings {
  user_id: string
  sending_time: string
  timezone: string
  delay_days: number
  follow_up_days: number
}

export interface EmailTemplate {
  user_id: string
  subject: string
  content: string
  from_email?: string
  sequence?: string // JSON string of workflow steps
  initial_trigger?: "immediate" | "wait"
  initial_wait_days?: number
  created_at?: string
  updated_at?: string
}

export interface SMSTemplate {
  user_id: string
  content: string
  sender_name?: string
  sequence?: string // JSON string of workflow steps
  initial_trigger?: "immediate" | "wait"
  initial_wait_days?: number
  created_at?: string
  updated_at?: string
}

export interface CampaignSettings {
  user_id: string
  automation_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface Workflow {
  id: string
  user_id: string
  name: string
  trigger_event: string
  delay_value: number
  delay_unit: string // e.g., 'days'
  channel: string
  status: "active" | "paused"
  sent_count: number
  opened_count: number
  clicked_count: number
  created_at: string
}

export interface BrandingSettings {
  user_id: string
  company_logo_url: string | null
  sms_sender_name: string
  email_sender_name: string
  title_color: string
}

export interface MessageSettings {
  user_id: string
  rating_page_content: string
  redirect_text: string
  notification_text: string
  skip_redirect: boolean
}

export interface RedirectSettings {
  user_id: string
  base_url: string
  custom_id: string
  full_url: string
}

export interface Integration {
  id: string
  user_id: string
  name: string
  description: string
  icon: string
  status: "connected" | "disconnected"
  last_sync: string | null
  review_count: number
  category: string
  config?: Record<string, any> // For specific integration configurations
  google_place_id?: string // For Google integrations
  google_address?: string // For Google business address
  google_business_name?: string // For Google business name
}

export interface WebhookConfig {
  user_id: string
  webhook_url: string | null
  secret_key: string | null
}

export interface ApiKey {
  id: string
  user_id: string
  key_value: string
  type: "production" | "test"
  created_at: string
  last_used_at: string | null
}

export interface Subscription {
  user_id: string
  plan_name: string
  status: "active" | "canceled" | "trialing"
  start_date: string
  end_date: string | null
  price: number
  currency: string
  features: string[]
}

export interface Invoice {
  id: string
  user_id: string
  invoice_number: string
  amount: number
  currency: string
  issue_date: string
  due_date: string
  status: "paid" | "pending" | "overdue"
  download_url: string
}

// New interfaces for Get Reviews tab functionality
export interface ReviewRequest {
  id: string
  user_id: string
  customer_name: string | null
  customer_contact: string // email or phone number
  contact_type: "email" | "sms"
  message_content: string
  sent_at: string
  status: "sent" | "failed" | "clicked" | "reviewed"
  template_id: string | null // Reference to the template used
}

export interface TemplateSetting {
  id: string
  user_id: string
  type:
    | "sms_template"
    | "email_template"
    | "sms_reminder_3"
    | "sms_reminder_7"
    | "email_reminder_3"
    | "email_reminder_7"
  sender_name?: string | null // For SMS
  sender_email?: string | null // For Email
  subject?: string | null // For Email
  content: string
  enabled?: boolean // For reminders
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      automation_workflows: {
        Row: {
          created_at: string
          delay_days: number | null
          email_template_id: string | null
          id: string
          is_active: boolean | null
          name: string
          sms_template_id: string | null
          trigger_event: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delay_days?: number | null
          email_template_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sms_template_id?: string | null
          trigger_event: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delay_days?: number | null
          email_template_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sms_template_id?: string | null
          trigger_event?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "review_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_workflows_sms_template_id_fkey"
            columns: ["sms_template_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "review_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_workflows_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customization_settings: {
        Row: {
          branding_logo_url: string | null
          branding_primary_color: string | null
          branding_secondary_color: string | null
          created_at: string
          id: string
          redirect_delay_seconds: number | null
          redirect_platform_url: string | null
          thank_you_message_body: string | null
          thank_you_message_title: string | null
          updated_at: string | null
          user_id: string
          welcome_message_body: string | null
          welcome_message_title: string | null
        }
        Insert: {
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          branding_secondary_color?: string | null
          created_at?: string
          id?: string
          redirect_delay_seconds?: number | null
          redirect_platform_url?: string | null
          thank_you_message_body?: string | null
          thank_you_message_title?: string | null
          updated_at?: string | null
          user_id: string
          welcome_message_body?: string | null
          welcome_message_title?: string | null
        }
        Update: {
          branding_logo_url?: string | null
          branding_primary_color?: string | null
          branding_secondary_color?: string | null
          created_at?: string
          id?: string
          redirect_delay_seconds?: number | null
          redirect_platform_url?: string | null
          thank_you_message_body?: string | null
          thank_you_message_title?: string | null
          updated_at?: string | null
          user_id?: string
          welcome_message_body?: string | null
          welcome_message_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customization_settings_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          api_key: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          type: string
          updated_at: string | null
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          type?: string
          updated_at?: string | null
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          download_url: string | null
          id: string
          invoice_date: string
          invoice_number: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          download_url?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          download_url?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          contact_email: string
          contact_name: string | null
          created_at: string
          id: string
          last_sent_at: string | null
          platform_redirect_url: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_email: string
          contact_name?: string | null
          created_at?: string
          id?: string
          last_sent_at?: string | null
          platform_redirect_url?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          last_sent_at?: string | null
          platform_redirect_url?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          subject: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          subject?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          subject?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_templates_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          platform: string
          rating: number
          status: string
          title: string | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          platform: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          platform?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          currency: string
          current_period_end: string
          id: string
          plan_name: string
          price: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          current_period_end: string
          id?: string
          plan_name: string
          price: number
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_period_end?: string
          id?: string
          plan_name?: string
          price?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_settings: {
        Row: {
          created_at: string
          email_from_name: string | null
          email_reply_to: string | null
          id: string
          sms_from_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email_from_name?: string | null
          email_reply_to?: string | null
          id?: string
          sms_from_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email_from_name?: string | null
          email_reply_to?: string | null
          id?: string
          sms_from_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_settings_user_id_fkey"
            columns: ["user_id"]
            isOneOf: ["rel", "rel"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string
          phone: string | null
          store_type: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          password_hash: string
          phone?: string | null
          store_type?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          password_hash?: string
          phone?: string | null
          store_type?: string | null
          title?: string | null
          updated_at?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"]) | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
