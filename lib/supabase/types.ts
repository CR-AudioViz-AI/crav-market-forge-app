export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          snippet: string;
          type: 'ebook' | 'newsletter' | 'template';
          price_cents: number;
          is_series: boolean;
          file_path: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string;
          snippet?: string;
          type: 'ebook' | 'newsletter' | 'template';
          price_cents?: number;
          is_series?: boolean;
          file_path?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          snippet?: string;
          type?: 'ebook' | 'newsletter' | 'template';
          price_cents?: number;
          is_series?: boolean;
          file_path?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      series: {
        Row: {
          id: string;
          product_id: string;
          interval: 'month' | 'year';
          price_cents: number;
          stripe_price_id: string | null;
          paypal_plan_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          interval: 'month' | 'year';
          price_cents: number;
          stripe_price_id?: string | null;
          paypal_plan_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          interval?: 'month' | 'year';
          price_cents?: number;
          stripe_price_id?: string | null;
          paypal_plan_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      series_items: {
        Row: {
          id: string;
          series_id: string;
          title: string;
          content: string;
          order_index: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          series_id: string;
          title: string;
          content?: string;
          order_index?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          series_id?: string;
          title?: string;
          content?: string;
          order_index?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          provider: 'stripe' | 'paypal';
          provider_id: string;
          amount_cents: number;
          purchase_type: 'oneoff' | 'subscription';
          status: 'paid' | 'active' | 'canceled' | 'refunded';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          provider: 'stripe' | 'paypal';
          provider_id: string;
          amount_cents?: number;
          purchase_type: 'oneoff' | 'subscription';
          status: 'paid' | 'active' | 'canceled' | 'refunded';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          provider?: 'stripe' | 'paypal';
          provider_id?: string;
          amount_cents?: number;
          purchase_type?: 'oneoff' | 'subscription';
          status?: 'paid' | 'active' | 'canceled' | 'refunded';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
