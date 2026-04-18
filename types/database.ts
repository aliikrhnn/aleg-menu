/**
 * Veritabanı tipleri.
 *
 * ÖNEMLİ: Proje Supabase'e bağlandıktan sonra şu komutla otomatik üretilmeli:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 *
 * Bu dosya geçici başlangıç tanımlarıdır.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LocalizedText = {
  tr: string;
  en?: string;
  [lang: string]: string | undefined;
};

export interface Database {
  public: {
    Tables: {
      super_admins: {
        Row: {
          user_id: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['super_admins']['Row']>;
      };
      businesses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          city: string | null;
          phone: string | null;
          email: string | null;
          plan_id: string | null;
          subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';
          subscription_ends_at: string | null;
          trial_ends_at: string | null;
          settings: Json;
          app_config: Json;
          owner_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['businesses']['Row']> & {
          slug: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['businesses']['Row']>;
      };
      branches: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          slug: string;
          address: string | null;
          phone: string | null;
          opening_hours: Json | null;
          is_main: boolean;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['branches']['Row']>;
      };
      roles: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          permissions: Json;
          is_default: boolean;
          is_owner: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['roles']['Row']> & {
          business_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['roles']['Row']>;
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role_id: string | null;
          branch_id: string | null;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          status: 'invited' | 'active' | 'suspended';
          invited_at: string | null;
          joined_at: string | null;
          last_seen_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['business_members']['Row']> & {
          business_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['business_members']['Row']>;
      };
      platform_plans: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          price_monthly: number | null;
          price_yearly: number | null;
          features: Json;
          max_branches: number | null;
          max_products: number | null;
          max_team_members: number | null;
          active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['platform_plans']['Row']> & {
          slug: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['platform_plans']['Row']>;
      };
      categories: {
        Row: {
          id: string;
          business_id: string;
          name: LocalizedText;
          description: LocalizedText | null;
          hero_icon: string | null;
          image_url: string | null;
          sort_order: number;
          active: boolean;
          badge: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          name: LocalizedText;
          description: LocalizedText | null;
          price: number;
          status: 'active' | 'soldout' | 'draft' | 'archived';
          hero_image_url: string | null;
          hero_icon: string | null;
          print_station: string | null;
          prep_time_minutes: number | null;
          badge: string | null;
          is_featured: boolean;
          allergens: string[];
          dietary_tags: string[];
          sort_order: number;
          sales_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['products']['Row']> & {
          business_id: string;
          name: LocalizedText;
          price: number;
        };
        Update: Partial<Database['public']['Tables']['products']['Row']>;
      };
      tables: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          zone_id: string | null;
          name: string;
          capacity: number;
          position_x: number | null;
          position_y: number | null;
          shape: 'square' | 'round' | 'rect';
          status: 'available' | 'occupied' | 'reserved' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tables']['Row']> & {
          business_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['tables']['Row']>;
      };
      tickets: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          table_id: string | null;
          guests: number;
          customer_name: string | null;
          customer_id: string | null;
          waiter_id: string | null;
          cashier_id: string | null;
          opened_at: string;
          closed_at: string | null;
          subtotal: number;
          discount_pct: number;
          discount_flat: number;
          service_pct: number;
          tip: number;
          total: number;
          payment_status: 'open' | 'paid' | 'partial' | 'void';
          payment_method: string | null;
          payment_details: Json | null;
          status: 'open' | 'closed' | 'cancelled';
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tickets']['Row']> & {
          business_id: string;
        };
        Update: Partial<Database['public']['Tables']['tickets']['Row']>;
      };
      orders: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          order_type: 'dine_in' | 'pickup' | 'delivery';
          ticket_id: string | null;
          table_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          delivery_address: Json | null;
          status: 'received' | 'confirmed' | 'preparing' | 'ready' | 'on_way' | 'delivered' | 'cancelled';
          subtotal: number;
          service_fee: number;
          delivery_fee: number;
          discount: number;
          total: number;
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          payment_method: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']> & {
          business_id: string;
          order_type: 'dine_in' | 'pickup' | 'delivery';
        };
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      user_businesses: {
        Args: Record<string, never>;
        Returns: string[];
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_permission: {
        Args: {
          p_business_id: string;
          p_resource: string;
          p_action?: string;
        };
        Returns: boolean;
      };
    };
  };
}

export type SuperAdmin = Database['public']['Tables']['super_admins']['Row'];
export type Business = Database['public']['Tables']['businesses']['Row'];
export type Branch = Database['public']['Tables']['branches']['Row'];
export type Role = Database['public']['Tables']['roles']['Row'];
export type BusinessMember = Database['public']['Tables']['business_members']['Row'];
export type PlatformPlan = Database['public']['Tables']['platform_plans']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Table = Database['public']['Tables']['tables']['Row'];
export type Ticket = Database['public']['Tables']['tickets']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
