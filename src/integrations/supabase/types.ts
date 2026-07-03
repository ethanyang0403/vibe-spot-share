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
      events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_responses: {
        Row: {
          availability: Json | null
          budget: string | null
          categories: string[] | null
          completed_at: string | null
          constraints: string[] | null
          constraints_note: string | null
          crew_seeds: string[] | null
          group_size: string | null
          host_interest: string | null
          host_pitch: string | null
          housing: string | null
          intent: string | null
          notice_threshold: string | null
          orgs: string[] | null
          ping_frequency: string | null
          ping_windows: string[] | null
          plan_energy: string | null
          radius: string | null
          rings_joinable: string[] | null
          scenario_spontaneity: string | null
          started_at: string | null
          talk_style: string | null
          updated_at: string
          user_id: string
          wildcard: string | null
          year: string | null
        }
        Insert: {
          availability?: Json | null
          budget?: string | null
          categories?: string[] | null
          completed_at?: string | null
          constraints?: string[] | null
          constraints_note?: string | null
          crew_seeds?: string[] | null
          group_size?: string | null
          host_interest?: string | null
          host_pitch?: string | null
          housing?: string | null
          intent?: string | null
          notice_threshold?: string | null
          orgs?: string[] | null
          ping_frequency?: string | null
          ping_windows?: string[] | null
          plan_energy?: string | null
          radius?: string | null
          rings_joinable?: string[] | null
          scenario_spontaneity?: string | null
          started_at?: string | null
          talk_style?: string | null
          updated_at?: string
          user_id: string
          wildcard?: string | null
          year?: string | null
        }
        Update: {
          availability?: Json | null
          budget?: string | null
          categories?: string[] | null
          completed_at?: string | null
          constraints?: string[] | null
          constraints_note?: string | null
          crew_seeds?: string[] | null
          group_size?: string | null
          host_interest?: string | null
          host_pitch?: string | null
          housing?: string | null
          intent?: string | null
          notice_threshold?: string | null
          orgs?: string[] | null
          ping_frequency?: string | null
          ping_windows?: string[] | null
          plan_energy?: string | null
          radius?: string | null
          rings_joinable?: string[] | null
          scenario_spontaneity?: string | null
          started_at?: string | null
          talk_style?: string | null
          updated_at?: string
          user_id?: string
          wildcard?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          latitude: number
          longitude: number
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          latitude: number
          longitude: number
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          latitude?: number
          longitude?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "moments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pings: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          message: string | null
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pings_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pings_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          availability: Json | null
          budget: string | null
          categories: string[] | null
          constraints: string[] | null
          constraints_note: string | null
          group_size: string | null
          host_interest: string | null
          intent: string | null
          notice_threshold: string | null
          paused_until: string | null
          ping_frequency: string | null
          ping_windows: string[] | null
          plan_energy: string | null
          radius: string | null
          rings_joinable: string[] | null
          talk_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: Json | null
          budget?: string | null
          categories?: string[] | null
          constraints?: string[] | null
          constraints_note?: string | null
          group_size?: string | null
          host_interest?: string | null
          intent?: string | null
          notice_threshold?: string | null
          paused_until?: string | null
          ping_frequency?: string | null
          ping_windows?: string[] | null
          plan_energy?: string | null
          radius?: string | null
          rings_joinable?: string[] | null
          talk_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: Json | null
          budget?: string | null
          categories?: string[] | null
          constraints?: string[] | null
          constraints_note?: string | null
          group_size?: string | null
          host_interest?: string | null
          intent?: string | null
          notice_threshold?: string | null
          paused_until?: string | null
          ping_frequency?: string | null
          ping_windows?: string[] | null
          plan_energy?: string | null
          radius?: string | null
          rings_joinable?: string[] | null
          talk_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          intake_completed: boolean
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          intake_completed?: boolean
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          intake_completed?: boolean
          username?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          is_visible: boolean
          latitude: number
          longitude: number
          status_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          is_visible?: boolean
          latitude: number
          longitude: number
          status_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          is_visible?: boolean
          latitude?: number
          longitude?: number
          status_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
