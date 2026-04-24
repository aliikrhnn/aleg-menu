/**
 * Veritabanı tipleri.
 *
 * ÖNEMLİ: Proje Supabase'e bağlandıktan sonra şu komutla otomatik üretilmeli:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 *
 * Bu dosya geçici başlangıç tanımlarıdır.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
      [tableName: string]: {
        Row: Record<string, any> & { id: string };
        Insert: Record<string, any>;
        Update: Record<string, any>;
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
