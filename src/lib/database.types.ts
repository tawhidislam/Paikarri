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
  public: {
    Tables: {
      account_search_history: {
        Row: {
          query: string
          searched_at: string
          user_id: string
        }
        Insert: {
          query: string
          searched_at?: string
          user_id: string
        }
        Update: {
          query?: string
          searched_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_statuses: {
        Row: {
          changed_by: string | null
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          reason?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          changed_by?: string | null
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_statuses_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_statuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          verification_application_id: string | null
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
          verification_application_id?: string | null
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
          verification_application_id?: string | null
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
          {
            foreignKeyName: "businesses_verification_application_id_fkey"
            columns: ["verification_application_id"]
            isOneToOne: false
            referencedRelation: "verification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_organizations: {
        Row: {
          address: string
          business_type: string
          name: string
          trade_license_number: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          address?: string
          business_type: string
          name: string
          trade_license_number?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          address?: string
          business_type?: string
          name?: string
          trade_license_number?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "buyer_organizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          buyer_id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          product_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_sku_items: {
        Row: {
          buyer_id: string
          product_id: string
          quantity: number
          sku_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          product_id: string
          quantity: number
          sku_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          product_id?: string
          quantity?: number
          sku_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_sku_items_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_sku_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_sku_items_sku_id_product_id_fkey"
            columns: ["sku_id", "product_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id", "product_id"]
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
      chat_images: {
        Row: {
          conversation_id: string
          created_at: string
          discarded: boolean
          height: number
          id: string
          path: string
          size: number
          uploader_id: string
          verified: boolean
          width: number
        }
        Insert: {
          conversation_id: string
          created_at?: string
          discarded?: boolean
          height: number
          id?: string
          path: string
          size: number
          uploader_id: string
          verified?: boolean
          width: number
        }
        Update: {
          conversation_id?: string
          created_at?: string
          discarded?: boolean
          height?: number
          id?: string
          path?: string
          size?: number
          uploader_id?: string
          verified?: boolean
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_images_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_images_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_batches: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          nonce: string
          request: Json
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          nonce: string
          request: Json
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          nonce?: string
          request?: Json
        }
        Relationships: [
          {
            foreignKeyName: "checkout_batches_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_read_states: {
        Row: {
          conversation_id: string
          last_read_at: string
          last_read_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at: string
          last_read_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          last_read_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_read_states_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_read_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      homepage_content: {
        Row: {
          draft: Json
          id: string
          published: Json | null
          published_at: string | null
          published_by: string | null
          revision: number
          updated_at: string
        }
        Insert: {
          draft?: Json
          id?: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          revision?: number
          updated_at?: string
        }
        Update: {
          draft?: Json
          id?: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_content_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_nonce: string | null
          conversation_id: string
          created_at: string
          id: string
          image_id: string | null
          product_id: string | null
          product_snapshot: Json | null
          sender_id: string
        }
        Insert: {
          body: string
          client_nonce?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_id?: string | null
          product_id?: string | null
          product_snapshot?: Json | null
          sender_id: string
        }
        Update: {
          body?: string
          client_nonce?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_id?: string | null
          product_id?: string | null
          product_snapshot?: Json | null
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
            foreignKeyName: "messages_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "chat_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      notifications: {
        Row: {
          actor_id: string | null
          body_bn: string
          body_en: string
          created_at: string
          entity_id: string | null
          href: string
          id: string
          kind: string
          read_at: string | null
          recipient_id: string
          reminder_template: string | null
          title_bn: string
          title_en: string
        }
        Insert: {
          actor_id?: string | null
          body_bn: string
          body_en: string
          created_at?: string
          entity_id?: string | null
          href: string
          id?: string
          kind: string
          read_at?: string | null
          recipient_id: string
          reminder_template?: string | null
          title_bn: string
          title_en: string
        }
        Update: {
          actor_id?: string | null
          body_bn?: string
          body_en?: string
          created_at?: string
          entity_id?: string | null
          href?: string
          id?: string
          kind?: string
          read_at?: string | null
          recipient_id?: string
          reminder_template?: string | null
          title_bn?: string
          title_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      open_tenders: {
        Row: {
          buyer_id: string
          category_id: string
          created_at: string
          delivery_date: string
          district: string
          expires_at: string
          id: string
          moderation: string
          moderation_note: string
          quantity: number
          requirements: string
          status: string
          title: string
          unit: string
          version: number
        }
        Insert: {
          buyer_id: string
          category_id: string
          created_at?: string
          delivery_date: string
          district: string
          expires_at: string
          id?: string
          moderation?: string
          moderation_note?: string
          quantity: number
          requirements: string
          status?: string
          title: string
          unit: string
          version?: number
        }
        Update: {
          buyer_id?: string
          category_id?: string
          created_at?: string
          delivery_date?: string
          district?: string
          expires_at?: string
          id?: string
          moderation?: string
          moderation_note?: string
          quantity?: number
          requirements?: string
          status?: string
          title?: string
          unit?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "open_tenders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_tenders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_disputes: {
        Row: {
          id: string
          opened_at: string
          opened_by: string
          order_id: string
          previous_status: string
          reason: string
          resolution: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          opened_at?: string
          opened_by: string
          order_id: string
          previous_status: string
          reason: string
          resolution?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          opened_at?: string
          opened_by?: string
          order_id?: string
          previous_status?: string
          reason?: string
          resolution?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          from_status: string | null
          id: string
          note: string
          order_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string
          order_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          inventory_released: boolean
          line_total: number | null
          name: string
          name_bn: string
          order_id: string
          product_id: string | null
          quantity: number
          sku_id: string | null
          unit: string
          unit_price: number
          variant_snapshot: Json
        }
        Insert: {
          id?: string
          inventory_released?: boolean
          line_total?: number | null
          name: string
          name_bn: string
          order_id: string
          product_id?: string | null
          quantity: number
          sku_id?: string | null
          unit: string
          unit_price: number
          variant_snapshot?: Json
        }
        Update: {
          id?: string
          inventory_released?: boolean
          line_total?: number | null
          name?: string
          name_bn?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          sku_id?: string | null
          unit?: string
          unit_price?: number
          variant_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          actor_id: string
          amount: number
          created_at: string
          id: string
          kind: string
          order_id: string
          reference: string
        }
        Insert: {
          actor_id: string
          amount: number
          created_at?: string
          id?: string
          kind: string
          order_id: string
          reference: string
        }
        Update: {
          actor_id?: string
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          order_id?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          authorized_at: string
          authorized_by: string
          carrier: string | null
          dispatched_at: string | null
          dispute_id: string
          id: string
          order_id: string
          received_at: string | null
          restocked: boolean
          status: string
          tracking_number: string | null
        }
        Insert: {
          authorized_at?: string
          authorized_by: string
          carrier?: string | null
          dispatched_at?: string | null
          dispute_id: string
          id?: string
          order_id: string
          received_at?: string | null
          restocked?: boolean
          status?: string
          tracking_number?: string | null
        }
        Update: {
          authorized_at?: string
          authorized_by?: string
          carrier?: string | null
          dispatched_at?: string | null
          dispute_id?: string
          id?: string
          order_id?: string
          received_at?: string | null
          restocked?: boolean
          status?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: true
            referencedRelation: "order_disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipments: {
        Row: {
          carrier: string
          id: string
          order_id: string
          shipped_at: string
          tracking_number: string
        }
        Insert: {
          carrier: string
          id?: string
          order_id: string
          shipped_at?: string
          tracking_number: string
        }
        Update: {
          carrier?: string
          id?: string
          order_id?: string
          shipped_at?: string
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_offer_id: string | null
          batch_id: string
          business_id: string
          buyer_id: string
          buyer_name: string
          buyer_note: string
          cancellation_requested: boolean
          completed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          number: number
          payment_method: string
          payment_status: string
          purchase_kind: string
          shipping_address: Json
          shipping_fee: number
          status: string
          subtotal: number
          supplier_name: string
          supplier_note: string
          total: number | null
          updated_at: string
          version: number
        }
        Insert: {
          accepted_offer_id?: string | null
          batch_id: string
          business_id: string
          buyer_id: string
          buyer_name: string
          buyer_note?: string
          cancellation_requested?: boolean
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          number?: never
          payment_method: string
          payment_status?: string
          purchase_kind?: string
          shipping_address: Json
          shipping_fee?: number
          status?: string
          subtotal: number
          supplier_name: string
          supplier_note?: string
          total?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          accepted_offer_id?: string | null
          batch_id?: string
          business_id?: string
          buyer_id?: string
          buyer_name?: string
          buyer_note?: string
          cancellation_requested?: boolean
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          number?: never
          payment_method?: string
          payment_status?: string
          purchase_kind?: string
          shipping_address?: Json
          shipping_fee?: number
          status?: string
          subtotal?: number
          supplier_name?: string
          supplier_note?: string
          total?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_accepted_offer_id_fkey"
            columns: ["accepted_offer_id"]
            isOneToOne: true
            referencedRelation: "sourcing_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "checkout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          default_locale: string
          id: string
          name_bn: string
          name_en: string
          supplier_registration_open: boolean
          support_email: string
          support_phone: string
          tagline_bn: string
          tagline_en: string
          updated_at: string
        }
        Insert: {
          default_locale?: string
          id?: string
          name_bn?: string
          name_en?: string
          supplier_registration_open?: boolean
          support_email?: string
          support_phone?: string
          tagline_bn?: string
          tagline_en?: string
          updated_at?: string
        }
        Update: {
          default_locale?: string
          id?: string
          name_bn?: string
          name_en?: string
          supplier_registration_open?: boolean
          support_email?: string
          support_phone?: string
          tagline_bn?: string
          tagline_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          id: string
          value: string
        }
        Insert: {
          attribute_id: string
          id?: string
          value: string
        }
        Update: {
          attribute_id?: string
          id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          id: string
          name: string
          position: number
          product_id: string
        }
        Insert: {
          id?: string
          name: string
          position: number
          product_id: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      product_reviews: {
        Row: {
          body: string
          buyer_id: string
          created_at: string
          id: string
          order_id: string
          product_id: string
          rating: number
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          body: string
          buyer_id: string
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          rating: number
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          rating?: number
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_skus: {
        Row: {
          active: boolean
          code: string
          id: string
          image_id: string | null
          product_id: string
          stock: number
          version: number
        }
        Insert: {
          active?: boolean
          code: string
          id?: string
          image_id?: string | null
          product_id: string
          stock: number
          version?: number
        }
        Update: {
          active?: boolean
          code?: string
          id?: string
          image_id?: string | null
          product_id?: string
          stock?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_skus_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "product_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_skus_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sourcing: {
        Row: {
          customization_enabled: boolean
          customization_moq: number
          delivery_notes: string
          dispatch_location: string
          estimates_updated_at: string | null
          packaging: string
          preparation_max: number
          preparation_min: number
          product_id: string
          sample_limit: number
          samples_enabled: boolean
          version: number
        }
        Insert: {
          customization_enabled?: boolean
          customization_moq?: number
          delivery_notes?: string
          dispatch_location?: string
          estimates_updated_at?: string | null
          packaging?: string
          preparation_max?: number
          preparation_min?: number
          product_id: string
          sample_limit?: number
          samples_enabled?: boolean
          version?: number
        }
        Update: {
          customization_enabled?: boolean
          customization_moq?: number
          delivery_notes?: string
          dispatch_location?: string
          estimates_updated_at?: string | null
          packaging?: string
          preparation_max?: number
          preparation_min?: number
          product_id?: string
          sample_limit?: number
          samples_enabled?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sourcing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
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
      refund_content: {
        Row: {
          draft: Json
          id: string
          published: Json | null
          published_at: string | null
          published_by: string | null
          published_revision: number | null
          revision: number
          updated_at: string
        }
        Insert: {
          draft?: Json
          id?: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          published_revision?: number | null
          revision?: number
          updated_at?: string
        }
        Update: {
          draft?: Json
          id?: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          published_revision?: number | null
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_content_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_content_history: {
        Row: {
          action: string
          actor_id: string
          after_content: Json
          before_content: Json | null
          created_at: string
          id: string
          revision: number
        }
        Insert: {
          action: string
          actor_id: string
          after_content: Json
          before_content?: Json | null
          created_at?: string
          id?: string
          revision: number
        }
        Update: {
          action?: string
          actor_id?: string
          after_content?: Json
          before_content?: Json | null
          created_at?: string
          id?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "refund_content_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      review_decisions: {
        Row: {
          actor_id: string
          created_at: string
          decision: string
          id: string
          reason: string
          review_id: string
          target_kind: string
          version: number
        }
        Insert: {
          actor_id: string
          created_at?: string
          decision: string
          id?: string
          reason: string
          review_id: string
          target_kind: string
          version: number
        }
        Update: {
          actor_id?: string
          created_at?: string
          decision?: string
          id?: string
          reason?: string
          review_id?: string
          target_kind?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_decisions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_decisions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          body: string
          review_id: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          body: string
          review_id: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          review_id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
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
      shipping_presets: {
        Row: {
          business_id: string
          carrier_preference: string
          enabled: boolean
          free_shipping_threshold: number | null
          inside_dhaka_base: number
          outside_dhaka_base: number
          per_kg_surcharge: number
          updated_at: string
          version: number
        }
        Insert: {
          business_id: string
          carrier_preference?: string
          enabled?: boolean
          free_shipping_threshold?: number | null
          inside_dhaka_base?: number
          outside_dhaka_base?: number
          per_kg_surcharge?: number
          updated_at?: string
          version?: number
        }
        Update: {
          business_id?: string
          carrier_preference?: string
          enabled?: boolean
          free_shipping_threshold?: number | null
          inside_dhaka_base?: number
          outside_dhaka_base?: number
          per_kg_surcharge?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipping_presets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_options: {
        Row: {
          sku_id: string
          value_id: string
        }
        Insert: {
          sku_id: string
          value_id: string
        }
        Update: {
          sku_id?: string
          value_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_options_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sku_options_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "product_attribute_values"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_prices: {
        Row: {
          min_quantity: number
          price: number
          sku_id: string
        }
        Insert: {
          min_quantity: number
          price: number
          sku_id: string
        }
        Update: {
          min_quantity?: number
          price?: number
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_prices_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_files: {
        Row: {
          id: string
          mime: string
          path: string
          request_id: string
          revision: number
          size: number
          verified: boolean
        }
        Insert: {
          id?: string
          mime: string
          path: string
          request_id: string
          revision: number
          size: number
          verified?: boolean
        }
        Update: {
          id?: string
          mime?: string
          path?: string
          request_id?: string
          revision?: number
          size?: number
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_files_request_id_revision_fkey"
            columns: ["request_id", "revision"]
            isOneToOne: false
            referencedRelation: "sourcing_request_revisions"
            referencedColumns: ["request_id", "revision"]
          },
        ]
      }
      sourcing_offer_lines: {
        Row: {
          offer_id: string
          quantity: number
          sku_id: string
          unit_price: number
        }
        Insert: {
          offer_id: string
          quantity: number
          sku_id: string
          unit_price: number
        }
        Update: {
          offer_id?: string
          quantity?: number
          sku_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_offer_lines_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "sourcing_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_offer_lines_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_offers: {
        Row: {
          accepted_order_id: string | null
          created_at: string
          expires_at: string
          id: string
          notes: string
          preparation_max: number
          preparation_min: number
          request_id: string
          request_revision: number
          revision: number
        }
        Insert: {
          accepted_order_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          notes: string
          preparation_max: number
          preparation_min: number
          request_id: string
          request_revision: number
          revision: number
        }
        Update: {
          accepted_order_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string
          preparation_max?: number
          preparation_min?: number
          request_id?: string
          request_revision?: number
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_offers_accepted_order_id_fkey"
            columns: ["accepted_order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sourcing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_offers_request_id_request_revision_fkey"
            columns: ["request_id", "request_revision"]
            isOneToOne: false
            referencedRelation: "sourcing_request_revisions"
            referencedColumns: ["request_id", "revision"]
          },
        ]
      }
      sourcing_request_lines: {
        Row: {
          quantity: number
          request_id: string
          revision: number
          sku_id: string
        }
        Insert: {
          quantity: number
          request_id: string
          revision: number
          sku_id: string
        }
        Update: {
          quantity?: number
          request_id?: string
          revision?: number
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_request_lines_request_id_revision_fkey"
            columns: ["request_id", "revision"]
            isOneToOne: false
            referencedRelation: "sourcing_request_revisions"
            referencedColumns: ["request_id", "revision"]
          },
          {
            foreignKeyName: "sourcing_request_lines_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_request_revisions: {
        Row: {
          branding: string
          desired_date: string | null
          district: string
          packaging: string
          request_id: string
          requirements: string
          revision: number
          specifications: string
          submitted_at: string | null
          version: number
        }
        Insert: {
          branding?: string
          desired_date?: string | null
          district?: string
          packaging?: string
          request_id: string
          requirements: string
          revision: number
          specifications?: string
          submitted_at?: string | null
          version?: number
        }
        Update: {
          branding?: string
          desired_date?: string | null
          district?: string
          packaging?: string
          request_id?: string
          requirements?: string
          revision?: number
          specifications?: string
          submitted_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_request_revisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sourcing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_requests: {
        Row: {
          business_id: string
          buyer_id: string
          created_at: string
          id: string
          kind: string
          product_id: string
          revision: number
        }
        Insert: {
          business_id: string
          buyer_id: string
          created_at?: string
          id?: string
          kind: string
          product_id: string
          revision?: number
        }
        Update: {
          business_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          kind?: string
          product_id?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_internal_notes: {
        Row: {
          archive_reason: string
          archived_at: string | null
          archived_by: string | null
          body: string
          business_id: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          archive_reason?: string
          archived_at?: string | null
          archived_by?: string | null
          body: string
          business_id: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          archive_reason?: string
          archived_at?: string | null
          archived_by?: string | null
          body?: string
          business_id?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_internal_notes_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_internal_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_management_records: {
        Row: {
          business_id: string
          labels: string[]
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          business_id: string
          labels?: string[]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          business_id?: string
          labels?: string[]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_management_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_management_records_updated_by_fkey"
            columns: ["updated_by"]
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
      supplier_warning_events: {
        Row: {
          actor_id: string
          body: string
          created_at: string
          event: string
          id: string
          warning_id: string
        }
        Insert: {
          actor_id: string
          body: string
          created_at?: string
          event: string
          id?: string
          warning_id: string
        }
        Update: {
          actor_id?: string
          body?: string
          created_at?: string
          event?: string
          id?: string
          warning_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_warning_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_warning_events_warning_id_fkey"
            columns: ["warning_id"]
            isOneToOne: false
            referencedRelation: "supplier_warnings"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_warnings: {
        Row: {
          business_id: string
          corrective_action: string
          created_at: string
          created_by: string
          due_on: string
          id: string
          message: string
          severity: string
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          business_id: string
          corrective_action: string
          created_at?: string
          created_by: string
          due_on: string
          id?: string
          message: string
          severity: string
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          business_id?: string
          corrective_action?: string
          created_at?: string
          created_by?: string
          due_on?: string
          id?: string
          message?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_warnings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_warnings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_bid_lines: {
        Row: {
          bid_id: string
          quantity: number
          sku_id: string
          unit_price: number
        }
        Insert: {
          bid_id: string
          quantity: number
          sku_id: string
          unit_price: number
        }
        Update: {
          bid_id?: string
          quantity?: number
          sku_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "tender_bid_lines_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "tender_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bid_lines_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_bids: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string
          id: string
          notes: string
          offer_id: string | null
          preparation_max: number
          preparation_min: number
          product_id: string
          request_id: string | null
          tender_id: string
          version: number
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at: string
          id?: string
          notes: string
          offer_id?: string | null
          preparation_max: number
          preparation_min: number
          product_id: string
          request_id?: string | null
          tender_id: string
          version?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string
          offer_id?: string | null
          preparation_max?: number
          preparation_min?: number
          product_id?: string
          request_id?: string | null
          tender_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tender_bids_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bids_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "sourcing_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bids_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sourcing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bids_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "open_tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_content: {
        Row: {
          draft: Json
          id: string
          published: Json | null
          published_at: string | null
          published_by: string | null
          published_revision: number | null
          revision: number
          updated_at: string
        }
        Insert: {
          draft?: Json
          id?: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          published_revision?: number | null
          revision?: number
          updated_at?: string
        }
        Update: {
          draft?: Json
          id?: string
          published?: Json | null
          published_at?: string | null
          published_by?: string | null
          published_revision?: number | null
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_content_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_content_history: {
        Row: {
          action: string
          actor_id: string
          after_content: Json
          before_content: Json | null
          created_at: string
          id: string
          revision: number
        }
        Insert: {
          action: string
          actor_id: string
          after_content: Json
          before_content?: Json | null
          created_at?: string
          id?: string
          revision: number
        }
        Update: {
          action?: string
          actor_id?: string
          after_content?: Json
          before_content?: Json | null
          created_at?: string
          id?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "terms_content_history_actor_id_fkey"
            columns: ["actor_id"]
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
      verification_applications: {
        Row: {
          business_id: string
          business_snapshot: Json
          created_at: string
          declaration_at: string | null
          id: string
          lock_version: number
          reviewed_at: string | null
          reviewed_by: string | null
          revision: number
          status: string
          submitted_at: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          business_id: string
          business_snapshot?: Json
          created_at?: string
          declaration_at?: string | null
          id?: string
          lock_version?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision: number
          status?: string
          submitted_at?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          business_id?: string
          business_snapshot?: Json
          created_at?: string
          declaration_at?: string | null
          id?: string
          lock_version?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number
          status?: string
          submitted_at?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_bank: {
        Row: {
          account_number: string
          account_title: string
          account_type: string
          application_id: string
          bank_name: string
          branch_name: string
          holder_type: string
          routing_number: string
        }
        Insert: {
          account_number?: string
          account_title?: string
          account_type?: string
          application_id: string
          bank_name?: string
          branch_name?: string
          holder_type?: string
          routing_number?: string
        }
        Update: {
          account_number?: string
          account_title?: string
          account_type?: string
          application_id?: string
          bank_name?: string
          branch_name?: string
          holder_type?: string
          routing_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_bank_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "verification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_files: {
        Row: {
          application_id: string
          created_at: string
          file_size: number
          id: string
          mime_type: string
          object_path: string
          position: number
          slot: string
        }
        Insert: {
          application_id: string
          created_at?: string
          file_size: number
          id?: string
          mime_type: string
          object_path: string
          position?: number
          slot: string
        }
        Update: {
          application_id?: string
          created_at?: string
          file_size?: number
          id?: string
          mime_type?: string
          object_path?: string
          position?: number
          slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_files_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "verification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_identity: {
        Row: {
          address: string
          application_id: string
          dob: string | null
          document_number: string
          document_type: string
          expires_on: string | null
          issued_on: string | null
          issuing_country: string
          legal_name: string
          no_expiry: boolean
        }
        Insert: {
          address?: string
          application_id: string
          dob?: string | null
          document_number?: string
          document_type?: string
          expires_on?: string | null
          issued_on?: string | null
          issuing_country?: string
          legal_name?: string
          no_expiry?: boolean
        }
        Update: {
          address?: string
          application_id?: string
          dob?: string | null
          document_number?: string
          document_type?: string
          expires_on?: string | null
          issued_on?: string | null
          issuing_country?: string
          legal_name?: string
          no_expiry?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "verification_identity_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "verification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_reviews: {
        Row: {
          application_id: string
          created_at: string
          decision: string
          id: string
          reason: string
          reviewed_by: string | null
          sections: Json
        }
        Insert: {
          application_id: string
          created_at?: string
          decision: string
          id?: string
          reason?: string
          reviewed_by?: string | null
          sections?: Json
        }
        Update: {
          application_id?: string
          created_at?: string
          decision?: string
          id?: string
          reason?: string
          reviewed_by?: string | null
          sections?: Json
        }
        Relationships: [
          {
            foreignKeyName: "verification_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "verification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_trade_license: {
        Row: {
          application_id: string
          business_address: string
          business_name: string
          expires_on: string | null
          issued_on: string | null
          issuing_authority: string
          license_number: string
          owner_name: string
        }
        Insert: {
          application_id: string
          business_address?: string
          business_name?: string
          expires_on?: string | null
          issued_on?: string | null
          issuing_authority?: string
          license_number?: string
          owner_name?: string
        }
        Update: {
          application_id?: string
          business_address?: string
          business_name?: string
          expires_on?: string | null
          issued_on?: string | null
          issuing_authority?: string
          license_number?: string
          owner_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_trade_license_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "verification_applications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_financial_report: {
        Args: { from_date: string; to_date: string }
        Returns: Json
      }
      admin_homepage_state: { Args: never; Returns: Json }
      admin_list: {
        Args: {
          filters?: Json
          kind: string
          page?: number
          page_size?: number
        }
        Returns: Json
      }
      admin_monitor_list: {
        Args: { filters?: Json; page?: number; page_size?: number }
        Returns: Json
      }
      admin_monitor_messages: {
        Args: {
          access_id?: string
          after_cursor?: Json
          before_cursor?: Json
          page_size?: number
          target: string
        }
        Returns: Json
      }
      admin_monitor_open: { Args: { target: string }; Returns: Json }
      admin_operations_list: {
        Args: {
          filters?: Json
          kind: string
          page?: number
          page_size?: number
        }
        Returns: Json
      }
      admin_publish_homepage: {
        Args: { expected_revision: number }
        Returns: undefined
      }
      admin_publish_refund: {
        Args: { expected_revision: number }
        Returns: undefined
      }
      admin_publish_terms: {
        Args: { expected_revision: number }
        Returns: undefined
      }
      admin_refund_state: { Args: never; Returns: Json }
      admin_resolve_report: {
        Args: { decision: string; note: string; target: string }
        Returns: undefined
      }
      admin_review_decide: {
        Args: {
          decision: string
          expected_version: number
          kind: string
          reason: string
          target: string
        }
        Returns: undefined
      }
      admin_reviews: {
        Args: { page?: number; page_size?: number; state?: string }
        Returns: Json
      }
      admin_save_homepage: {
        Args: { config: Json; expected_revision: number }
        Returns: number
      }
      admin_save_refund: {
        Args: { config: Json; expected_revision: number }
        Returns: number
      }
      admin_save_terms: {
        Args: { config: Json; expected_revision: number }
        Returns: number
      }
      admin_send_onboarding_reminder: {
        Args: { target: string; template: string }
        Returns: string
      }
      admin_set_account_status: {
        Args: { new_status: string; reason: string; target: string }
        Returns: undefined
      }
      admin_set_staff: {
        Args: { grant_access: boolean; reason: string; target: string }
        Returns: undefined
      }
      admin_statistics: { Args: { days?: number }; Returns: Json }
      admin_supplier_archive_note: {
        Args: { reason: string; target: string }
        Returns: undefined
      }
      admin_supplier_detail: { Args: { target: string }; Returns: Json }
      admin_supplier_issue_warning: {
        Args: { payload: Json; target: string }
        Returns: string
      }
      admin_supplier_labels: {
        Args: { expected_version: number; labels: string[]; target: string }
        Returns: Json
      }
      admin_supplier_note: {
        Args: { body: string; target: string }
        Returns: string
      }
      admin_supplier_operations_list: {
        Args: {
          filters?: Json
          kind: string
          page?: number
          page_size?: number
        }
        Returns: Json
      }
      admin_supplier_renewal_reminder: {
        Args: { target: string }
        Returns: undefined
      }
      admin_supplier_warning_decide: {
        Args: {
          decision: string
          expected_version: number
          reason: string
          target: string
        }
        Returns: undefined
      }
      admin_supplier_workspace: { Args: { target: string }; Returns: Json }
      admin_terms_state: { Args: never; Returns: Json }
      admin_update_settings: { Args: { payload: Json }; Returns: undefined }
      buyer_organization_context: { Args: { target: string }; Returns: Json }
      buyer_organization_get: { Args: never; Returns: Json }
      buyer_organization_save: {
        Args: { expected_version: number; payload: Json }
        Returns: undefined
      }
      cart_quote: { Args: never; Returns: Json }
      cart_set: {
        Args: { product: string; quantity: number }
        Returns: undefined
      }
      cart_skus_set: {
        Args: { product: string; selections: Json }
        Returns: undefined
      }
      catalog_facets: {
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
        Returns: Json
      }
      chat_image_access: {
        Args: { monitor_access?: string; target: string }
        Returns: Json
      }
      chat_image_discard: { Args: { target: string }; Returns: string }
      chat_image_finalize: {
        Args: { actor: string; target: string }
        Returns: undefined
      }
      chat_image_gc_candidates: { Args: never; Returns: Json }
      chat_image_prepare: {
        Args: {
          file_size: number
          image_height: number
          image_width: number
          target: string
        }
        Returns: Json
      }
      chat_list: {
        Args: {
          page?: number
          page_size?: number
          search?: string
          unread_only?: boolean
        }
        Returns: Json
      }
      chat_mark_read: {
        Args: { message: string; target: string }
        Returns: undefined
      }
      chat_messages: {
        Args: {
          after_cursor?: Json
          before_cursor?: Json
          page_size?: number
          target: string
        }
        Returns: Json
      }
      chat_send: {
        Args: { body: string; nonce: string; product?: string; target: string }
        Returns: Json
      }
      chat_send_image: {
        Args: {
          body: string
          image: string
          nonce: string
          product?: string
          target: string
        }
        Returns: Json
      }
      chat_start: {
        Args: { business: string; product?: string }
        Returns: Json
      }
      chat_thread: { Args: { target: string }; Returns: Json }
      chat_unread_total: { Args: never; Returns: number }
      get_account_status: { Args: never; Returns: Json }
      get_homepage_content: { Args: never; Returns: Json }
      get_notification_inbox: {
        Args: { page?: number; page_size?: number; unread_only?: boolean }
        Returns: Json
      }
      get_platform_settings: { Args: never; Returns: Json }
      get_refund_content: { Args: never; Returns: Json }
      get_terms_content: { Args: never; Returns: Json }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification: {
        Args: { is_read?: boolean; target: string }
        Returns: undefined
      }
      moderate_product: {
        Args: { decision: string; note?: string; target: string }
        Returns: undefined
      }
      my_product_review: { Args: { target: string }; Returns: Json }
      notification_unread_count: { Args: never; Returns: number }
      order_action: {
        Args: {
          action: string
          expected_version: number
          payload?: Json
          target: string
        }
        Returns: Json
      }
      order_checkout: {
        Args: {
          address: Json
          expected: Json
          method: string
          nonce: string
          note: string
        }
        Returns: Json
      }
      order_detail: { Args: { target: string }; Returns: Json }
      order_list: {
        Args: {
          page?: number
          page_size?: number
          search?: string
          state?: string
        }
        Returns: Json
      }
      participant_context: { Args: never; Returns: Json }
      product_options: { Args: { target: string }; Returns: Json }
      product_reviews_read: {
        Args: { page?: number; page_size?: number; target: string }
        Returns: Json
      }
      public_businesses: {
        Args: never
        Returns: {
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
          verification_application_id: string | null
          verified: boolean
          website: string
        }[]
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_products: {
        Args: never
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
      public_shipping_presets: { Args: { target: string }; Returns: Json }
      register_supplier: { Args: never; Returns: undefined }
      resolve_report: {
        Args: { decision: string; target: string }
        Returns: undefined
      }
      review_reply: {
        Args: { body: string; expected_version: number; target: string }
        Returns: undefined
      }
      review_report: {
        Args: { reason: string; target: string }
        Returns: undefined
      }
      review_save: {
        Args: {
          body: string
          expected_version?: number
          order_ref: string
          product: string
          rating: number
        }
        Returns: string
      }
      review_verification: {
        Args: { decision: string; note?: string; target: string }
        Returns: undefined
      }
      review_withdraw: {
        Args: { expected_version: number; target: string }
        Returns: undefined
      }
      save_product: { Args: { payload: Json }; Returns: string }
      search_history: {
        Args: { operation?: string; query_text?: string }
        Returns: Json
      }
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
      search_suggestions: { Args: { keyword: string }; Returns: Json }
      shipping_preset_get: { Args: never; Returns: Json }
      shipping_preset_save: {
        Args: { expected_version: number; payload: Json; target: string }
        Returns: undefined
      }
      sourcing_detail: { Args: { target: string }; Returns: Json }
      sourcing_draft: {
        Args: { expected_version: number; payload: Json; target: string }
        Returns: string
      }
      sourcing_file_access: { Args: { target: string }; Returns: string }
      sourcing_file_finalize: {
        Args: { actor: string; target: string }
        Returns: undefined
      }
      sourcing_file_prepare: {
        Args: { mime: string; size: number; target: string }
        Returns: Json
      }
      sourcing_file_remove: { Args: { target: string }; Returns: undefined }
      sourcing_list: {
        Args: { page?: number; page_size?: number }
        Returns: Json
      }
      sourcing_offer_checkout: {
        Args: {
          address: Json
          expected_revision: number
          method: string
          nonce: string
          note: string
          target: string
        }
        Returns: Json
      }
      sourcing_offer_publish: {
        Args: { expected_revision: number; payload: Json; target: string }
        Returns: string
      }
      sourcing_submit: {
        Args: { expected_version: number; target: string }
        Returns: undefined
      }
      supplier_action_list: {
        Args: { page?: number; page_size?: number }
        Returns: Json
      }
      supplier_bulk_products: { Args: { payload: Json }; Returns: string[] }
      supplier_inventory: {
        Args: { expected_version: number; quantity: number; target: string }
        Returns: undefined
      }
      supplier_options_save: {
        Args: { expected_version: number; payload: Json; target: string }
        Returns: Json
      }
      supplier_performance: { Args: never; Returns: Json }
      supplier_reviews: { Args: { page?: number }; Returns: Json }
      supplier_warning_respond: {
        Args: { expected_version: number; response: string; target: string }
        Returns: undefined
      }
      tender_award: {
        Args: { expected_version: number; target: string }
        Returns: Json
      }
      tender_bid_save: {
        Args: { expected_version: number; payload: Json; target: string }
        Returns: string
      }
      tender_close: {
        Args: { expected_version: number; target: string }
        Returns: undefined
      }
      tender_create: { Args: { payload: Json }; Returns: string }
      tender_detail: { Args: { target: string }; Returns: Json }
      tender_list: {
        Args: {
          category?: string
          page?: number
          page_size?: number
          search?: string
          view_kind?: string
        }
        Returns: Json
      }
      tender_moderate: {
        Args: {
          decision: string
          expected_version: number
          note: string
          target: string
        }
        Returns: undefined
      }
      verification_attach_file: {
        Args: {
          expected_version: number
          object_path: string
          slot: string
          target: string
        }
        Returns: Json
      }
      verification_decide: {
        Args: { expected_version: number; payload: Json; target: string }
        Returns: Json
      }
      verification_get: { Args: { target: string }; Returns: Json }
      verification_list: {
        Args: { filters?: Json; page?: number; page_size?: number }
        Returns: Json
      }
      verification_remove_file: {
        Args: { expected_version: number; file_id: string; target: string }
        Returns: Json
      }
      verification_save_step: {
        Args: {
          expected_version: number
          payload: Json
          step: string
          target: string
        }
        Returns: Json
      }
      verification_start: { Args: never; Returns: Json }
      verification_state: { Args: never; Returns: Json }
      verification_submit: {
        Args: { declaration: boolean; expected_version: number; target: string }
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
  public: {
    Enums: {},
  },
} as const
