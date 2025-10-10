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
      deliveries: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          customer_rating: number | null
          delivered_at: string | null
          distance_km: number | null
          driver_id: string | null
          driver_notes: string | null
          driver_rating: number | null
          dropoff_lat: number
          dropoff_lng: number
          dropoff_location: string
          duration_minutes: number | null
          estimated_price: number | null
          final_price: number | null
          id: string
          package_description: string | null
          package_size: string
          picked_up_at: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_location: string
          recipient_name: string
          recipient_phone: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          customer_rating?: number | null
          delivered_at?: string | null
          distance_km?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          driver_rating?: number | null
          dropoff_lat: number
          dropoff_lng: number
          dropoff_location: string
          duration_minutes?: number | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          package_description?: string | null
          package_size?: string
          picked_up_at?: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_location: string
          recipient_name: string
          recipient_phone: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          customer_rating?: number | null
          delivered_at?: string | null
          distance_km?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          driver_rating?: number | null
          dropoff_lat?: number
          dropoff_lng?: number
          dropoff_location?: string
          duration_minutes?: number | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          package_description?: string | null
          package_size?: string
          picked_up_at?: string | null
          pickup_lat?: number
          pickup_lng?: number
          pickup_location?: string
          recipient_name?: string
          recipient_phone?: string
          status?: string
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          id: string
          is_available: boolean | null
          last_updated: string
          latitude: number
          longitude: number
          speed_kmh: number | null
        }
        Insert: {
          driver_id: string
          heading?: number | null
          id?: string
          is_available?: boolean | null
          last_updated?: string
          latitude: number
          longitude: number
          speed_kmh?: number | null
        }
        Update: {
          driver_id?: string
          heading?: number | null
          id?: string
          is_available?: boolean | null
          last_updated?: string
          latitude?: number
          longitude?: number
          speed_kmh?: number | null
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          created_at: string | null
          driver_id: string
          driver_preferences: Json | null
          id_document_back_url: string | null
          id_document_front_url: string | null
          id_document_verification_status: string | null
          id_document_verified: boolean | null
          id_verification_status: string | null
          is_available: boolean | null
          is_verified: boolean | null
          last_location: Json | null
          license_document_url: string | null
          license_number: string | null
          license_plate_number: string | null
          updated_at: string | null
          vehicle_color: string | null
          vehicle_model: string | null
          vehicle_registration_document_url: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          driver_preferences?: Json | null
          id_document_back_url?: string | null
          id_document_front_url?: string | null
          id_document_verification_status?: string | null
          id_document_verified?: boolean | null
          id_verification_status?: string | null
          is_available?: boolean | null
          is_verified?: boolean | null
          last_location?: Json | null
          license_document_url?: string | null
          license_number?: string | null
          license_plate_number?: string | null
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_registration_document_url?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          driver_preferences?: Json | null
          id_document_back_url?: string | null
          id_document_front_url?: string | null
          id_document_verification_status?: string | null
          id_document_verified?: boolean | null
          id_verification_status?: string | null
          is_available?: boolean | null
          is_verified?: boolean | null
          last_location?: Json | null
          license_document_url?: string | null
          license_number?: string | null
          license_plate_number?: string | null
          updated_at?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_registration_document_url?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      driver_subscriptions: {
        Row: {
          car_number: string
          created_at: string
          driver_id: string
          id: string
          is_trial: boolean | null
          license_number: string
          monthly_fee: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_type: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          vehicle_color: string | null
          vehicle_model: string | null
          vehicle_type: string
        }
        Insert: {
          car_number: string
          created_at?: string
          driver_id: string
          id?: string
          is_trial?: boolean | null
          license_number: string
          monthly_fee?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_type?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_type: string
        }
        Update: {
          car_number?: string
          created_at?: string
          driver_id?: string
          id?: string
          is_trial?: boolean | null
          license_number?: string
          monthly_fee?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_type?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      favorite_locations: {
        Row: {
          address: string
          created_at: string
          id: string
          latitude: number
          location_type: string | null
          longitude: number
          name: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          latitude: number
          location_type?: string | null
          longitude: number
          name: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          latitude?: number
          location_type?: string | null
          longitude?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          id: string
          points: number
          total_earned: number
          total_redeemed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          points?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          points?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          ride_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          ride_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          ride_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string | null
          full_name: string
          is_admin: boolean | null
          phone: string | null
          referral_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          full_name: string
          is_admin?: boolean | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string | null
          full_name?: string
          is_admin?: boolean | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          discount_applied: number
          id: string
          promo_code_id: string
          ride_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          discount_applied: number
          id?: string
          promo_code_id: string
          ride_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          discount_applied?: number
          id?: string
          promo_code_id?: string
          ride_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_ride_value: number | null
          user_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_ride_value?: number | null
          user_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_ride_value?: number | null
          user_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          driver_id: string
          id: number
          rating: number
          ride_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          driver_id: string
          id?: never
          rating: number
          ride_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          driver_id?: string
          id?: never
          rating?: number
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_points: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_points?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_points?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      ride_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          ride_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          ride_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          ride_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_chat_messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_ratings: {
        Row: {
          comment: string | null
          created_at: string
          driver_id: string
          id: string
          rating: number
          ride_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          driver_id: string
          id?: string
          rating: number
          ride_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          rating?: number
          ride_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          accepted_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          customer_rating: number | null
          discount_amount: number | null
          distance_km: number | null
          driver_id: string | null
          driver_notes: string | null
          driver_preferences: Json | null
          driver_rating: number | null
          dropoff_lat: number
          dropoff_lng: number
          dropoff_location: string
          duration_minutes: number | null
          estimated_price: number | null
          final_price: number | null
          id: string
          is_scheduled: boolean | null
          payment_method: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_location: string
          promo_code_id: string | null
          ride_type: string | null
          scheduled_time: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          customer_rating?: number | null
          discount_amount?: number | null
          distance_km?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          driver_preferences?: Json | null
          driver_rating?: number | null
          dropoff_lat: number
          dropoff_lng: number
          dropoff_location: string
          duration_minutes?: number | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          is_scheduled?: boolean | null
          payment_method?: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_location: string
          promo_code_id?: string | null
          ride_type?: string | null
          scheduled_time?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          customer_rating?: number | null
          discount_amount?: number | null
          distance_km?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          driver_preferences?: Json | null
          driver_rating?: number | null
          dropoff_lat?: number
          dropoff_lng?: number
          dropoff_location?: string
          duration_minutes?: number | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          is_scheduled?: boolean | null
          payment_method?: string | null
          pickup_lat?: number
          pickup_lng?: number
          pickup_location?: string
          promo_code_id?: string | null
          ride_type?: string | null
          scheduled_time?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rides_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      surge_pricing: {
        Row: {
          city: string
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          multiplier: number
          start_time: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          multiplier?: number
          start_time?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          multiplier?: number
          start_time?: string | null
        }
        Relationships: []
      }
      trip_shares: {
        Row: {
          created_at: string | null
          customer_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          ride_id: string
          share_token: string
          shared_with_email: string | null
          shared_with_name: string | null
          shared_with_phone: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          ride_id: string
          share_token: string
          shared_with_email?: string | null
          shared_with_name?: string | null
          shared_with_phone?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          ride_id?: string
          share_token?: string
          shared_with_email?: string | null
          shared_with_name?: string | null
          shared_with_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_shares_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      driver_locations_safe: {
        Row: {
          driver_id: string | null
          id: string | null
          is_available: boolean | null
          last_updated: string | null
          latitude: number | null
          longitude: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      verify_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "driver" | "admin"
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
      app_role: ["customer", "driver", "admin"],
    },
  },
} as const
