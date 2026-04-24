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

export type ReceiptSettings = {
  header_text: string;
  footer_text: string;
  show_logo: boolean;
  show_tagline: boolean;
  show_phone: boolean;
  show_address: boolean;
  paper_width: 32 | 48;
  kitchen_show_prices: boolean;
  kitchen_big_font: boolean;
  kitchen_show_note_highlight: boolean;
  // Değerlendirme QR
  review_qr_enabled: boolean;
  review_qr_text: string; // "Deneyiminizi değerlendirin"
  review_smart_redirect: boolean; // 4-5 yıldız → Google
  google_place_id: string; // Google Maps Place ID
};

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  header_text: '',
  footer_text: 'Tercih ettiğiniz için teşekkürler!',
  show_logo: true,
  show_tagline: true,
  show_phone: true,
  show_address: true,
  paper_width: 48,
  kitchen_show_prices: false,
  kitchen_big_font: true,
  kitchen_show_note_highlight: true,
  review_qr_enabled: false,
  review_qr_text: 'Deneyiminizi değerlendirin',
  review_smart_redirect: false,
  google_place_id: '',
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
          // 0009 migration
          tagline_tr: string | null;
          tagline_en: string | null;
          address: string | null;
          whatsapp: string | null;
          instagram: string | null;
          facebook: string | null;
          website: string | null;
          currency: string;
          working_hours: Json;
          order_config: Json;
          // 0016 migration
          receipt_settings: Json;
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
        Insert: Partial<Database['public']['Tables']['branches']['Row']> & {
          business_id: string;
          name: string;
          slug: string;
        };
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
        Insert: Partial<Database['public']['Tables']['categories']['Row']> & {
          business_id: string;
          name: LocalizedText;
        };
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          station_id: string | null;
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
      stations: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          slug: string;
          icon: string;
          color: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['stations']['Row']> & {
          business_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['stations']['Row']>;
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
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name: string;
          product_snapshot: Json | null;
          quantity: number;
          unit_price: number;
          options: Json;
          note: string | null;
          station_id: string | null;
          status: 'ordered' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
        };
        Insert: Partial<Database['public']['Tables']['order_items']['Row']> & {
          order_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Row']>;
      };
      waiter_calls: {
        Row: {
          id: string;
          business_id: string;
          table_id: string | null;
          reason: string | null;
          status: 'pending' | 'acknowledged' | 'resolved';
          created_at: string;
          resolved_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['waiter_calls']['Row']> & {
          business_id: string;
        };
        Update: Partial<Database['public']['Tables']['waiter_calls']['Row']>;
      };
      qr_codes: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          table_id: string | null;
          slug: string;
          purpose: 'table' | 'general' | 'delivery';
          design_template: string;
          design_config: Json;
          scan_count: number;
          last_scanned_at: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['qr_codes']['Row']> & {
          business_id: string;
          slug: string;
        };
        Update: Partial<Database['public']['Tables']['qr_codes']['Row']>;
      };
      table_zones: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          name: string;
          color: string | null;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['table_zones']['Row']> & {
          business_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['table_zones']['Row']>;
      };
      printers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          role: 'kitchen' | 'cashier';
          connection_type: 'bluetooth' | 'network';
          bluetooth_device_id: string | null;
          ip_address: string | null;
          port: number;
          paper_width: 32 | 48;
          model: string | null;
          station_id: string | null;
          copies: number;
          auto_print_new_orders: boolean;
          auto_print_takeaway: boolean;
          is_active: boolean;
          last_tested_at: string | null;
          last_test_success: boolean | null;
          last_test_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['printers']['Row']> & {
          business_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['printers']['Row']>;
      };
      print_jobs: {
        Row: {
          id: string;
          business_id: string;
          printer_id: string | null;
          order_id: string | null;
          station_id: string | null;
          agent_id: string | null;
          job_type: 'kitchen' | 'cashier' | 'reprint_kitchen' | 'reprint_cashier' | 'test';
          status: 'pending' | 'printing' | 'success' | 'failed';
          error_message: string | null;
          triggered_by: string | null;
          user_id: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['print_jobs']['Row']> & {
          business_id: string;
          job_type: 'kitchen' | 'cashier' | 'reprint_kitchen' | 'reprint_cashier' | 'test';
        };
        Update: Partial<Database['public']['Tables']['print_jobs']['Row']>;
      };
      reviews: {
        Row: {
          id: string;
          business_id: string;
          order_id: string | null;
          rating: number;
          comment: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          redirected_to_google: boolean;
          reply_text: string | null;
          reply_at: string | null;
          reply_user_id: string | null;
          is_archived: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['reviews']['Row']> & {
          business_id: string;
          rating: number;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Row']>;
      };
      printer_agents: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          version: string | null;
          last_seen_at: string | null;
          last_job_at: string | null;
          jobs_processed: number;
          is_active: boolean;
          token: string;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['printer_agents']['Row']> & {
          business_id: string;
          name: string;
          token: string;
        };
        Update: Partial<Database['public']['Tables']['printer_agents']['Row']>;
      };
      ai_usage: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          feature: 'slogan' | 'monogram' | 'chat' | 'variation' | 'insights';
          tokens_used: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_usage']['Row']> & {
          business_id: string;
          feature: 'slogan' | 'monogram' | 'chat' | 'variation' | 'insights';
        };
        Update: Partial<Database['public']['Tables']['ai_usage']['Row']>;
      };
      option_presets: {
        Row: {
          id: string;
          business_id: string;
          name: LocalizedText;
          type: 'single' | 'multi';
          required: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['option_presets']['Row']> & {
          business_id: string;
          name: LocalizedText;
        };
        Update: Partial<Database['public']['Tables']['option_presets']['Row']>;
      };
      option_preset_values: {
        Row: {
          id: string;
          preset_id: string;
          name: LocalizedText;
          price_delta: number;
          is_default: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['option_preset_values']['Row']> & {
          preset_id: string;
          name: LocalizedText;
        };
        Update: Partial<Database['public']['Tables']['option_preset_values']['Row']>;
      };
      product_option_presets: {
        Row: {
          id: string;
          product_id: string;
          preset_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['product_option_presets']['Row']> & {
          product_id: string;
          preset_id: string;
        };
        Update: Partial<Database['public']['Tables']['product_option_presets']['Row']>;
      };
      // ============================================================
      // Generic tablolar — detaylı tipler yok ama TS hatası önler
      // Supabase types generate edilince override edilir
      // ============================================================
      cashier_accounts: {
        Row: Record<string, unknown> & { id: string; business_id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      cash_drawer_sessions: {
        Row: Record<string, unknown> & { id: string; business_id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      payment_logs: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      printers: {
        Row: Record<string, unknown> & { id: string; business_id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      print_jobs: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      printer_agents: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      qr_codes: {
        Row: Record<string, unknown> & { id: string; business_id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      ai_usage: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      audit_log: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      business_modules: {
        Row: Record<string, unknown> & { business_id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      call_log: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      couriers: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      delivery_customers: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      loyalty_campaigns: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      loyalty_config: {
        Row: Record<string, unknown> & { business_id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      loyalty_members: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      loyalty_transactions: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      platform_invoices: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      product_options: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      product_variants: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      reviews: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      shifts: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      staff: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      stock_items: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      stock_movements: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      table_zones: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      ticket_items: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      waiter_calls: {
        Row: Record<string, unknown> & { id: string };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
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
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type WaiterCall = Database['public']['Tables']['waiter_calls']['Row'];
