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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json
          entity_id: string
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          entity_id: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string
          contact_phone: string
          created_at: string
          description: string
          district: string
          division: string
          id: string
          name: string
          name_bn: string
          owner_id: string
          updated_at: string
          verified: boolean
          website: string
        }
        Insert: {
          address?: string
          contact_phone?: string
          created_at?: string
          description?: string
          district: string
          division: string
          id?: string
          name: string
          name_bn?: string
          owner_id: string
          updated_at?: string
          verified?: boolean
          website?: string
        }
        Update: {
          address?: string
          contact_phone?: string
          created_at?: string
          description?: string
          district?: string
          division?: string
          id?: string
          name?: string
          name_bn?: string
          owner_id?: string
          updated_at?: string
          verified?: boolean
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string
          id: string
          name: string
          name_bn: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          icon?: string
          id?: string
          name: string
          name_bn: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          icon?: string
          id?: string
          name?: string
          name_bn?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string
          buyer_id: string
          created_at: string
          id: string
        }
        Insert: {
          business_id: string
          buyer_id: string
          created_at?: string
          id?: string
        }
        Update: {
          business_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          path: string
          position: number
          product_id: string
        }
        Insert: {
          id?: string
          path: string
          position?: number
          product_id: string
        }
        Update: {
          id?: string
          path?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_moderation_notes: {
        Row: {
          note: string
          product_id: string
          updated_at: string
        }
        Insert: {
          note: string
          product_id: string
          updated_at?: string
        }
        Update: {
          note?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_moderation_notes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_tiers: {
        Row: {
          id: string
          min_quantity: number
          price: number
          product_id: string
        }
        Insert: {
          id?: string
          min_quantity: number
          price: number
          product_id: string
        }
        Update: {
          id?: string
          min_quantity?: number
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          category_id: string
          created_at: string
          description: string
          id: string
          moderation_note: string
          moq: number
          name: string
          name_bn: string
          price: number
          search_vector: unknown
          specifications: Json
          status: string
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category_id: string
          created_at?: string
          description: string
          id?: string
          moderation_note?: string
          moq: number
          name: string
          name_bn?: string
          price: number
          search_vector?: unknown
          specifications?: Json
          status?: string
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string
          created_at?: string
          description?: string
          id?: string
          moderation_note?: string
          moq?: number
          name?: string
          name_bn?: string
          price?: number
          search_vector?: unknown
          specifications?: Json
          status?: string
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotation_requests: {
        Row: {
          business_id: string
          buyer_id: string
          created_at: string
          id: string
          message: string
          product_id: string
          quantity: number
        }
        Insert: {
          business_id: string
          buyer_id: string
          created_at?: string
          id?: string
          message: string
          product_id: string
          quantity: number
        }
        Update: {
          business_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          message?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_responses: {
        Row: {
          created_at: string
          id: string
          message: string
          price: number
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          price: number
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          price?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "quotation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          product_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_suppliers: {
        Row: {
          business_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_verifications: {
        Row: {
          business_id: string
          created_at: string
          document_path: string
          document_type: string
          id: string
          review_note: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          document_path: string
          document_type: string
          id?: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          document_path?: string
          document_type?: string
          id?: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_verifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role?: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
      moderate_product: {
        Args: { decision: string; note?: string; target: string }
        Returns: undefined
      }
      register_supplier: { Args: never; Returns: undefined }
      resolve_report: {
        Args: { decision: string; target: string }
        Returns: undefined
      }
      review_verification: {
        Args: { decision: string; note?: string; target: string }
        Returns: undefined
      }
      save_product: { Args: { payload: Json }; Returns: string }
      search_products: {
        Args: {
          category_slug?: string
          district_filter?: string
          division_filter?: string
          keyword?: string
          max_moq?: number
          max_price?: number
          min_price?: number
          verified_only?: boolean
        }
        Returns: {
          business_id: string
          category_id: string
          created_at: string
          description: string
          id: string
          moderation_note: string
          moq: number
          name: string
          name_bn: string
          price: number
          search_vector: unknown
          specifications: Json
          status: string
          stock: number
          unit: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
