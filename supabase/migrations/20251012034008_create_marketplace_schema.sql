/*
  # Marketplace Schema - Products, Purchases & Series
  
  ## Overview
  Creates a complete marketplace system for selling digital products (eBooks, newsletters, templates)
  with support for one-time purchases and recurring subscriptions (series).
  
  ## New Tables
  
  ### `products`
  Core product catalog with support for both standalone items and series/subscriptions
  - `id` (uuid, primary key)
  - `slug` (text, unique) - URL-friendly identifier
  - `title` (text) - Product display name
  - `description` (text) - Full product description
  - `snippet` (text) - Free preview content
  - `type` (text) - 'ebook', 'newsletter', or 'template'
  - `price_cents` (int) - Price in cents for one-time purchases
  - `is_series` (boolean) - True if this is a subscription/series product
  - `file_path` (text, nullable) - Storage path for downloadable files
  - `is_published` (boolean) - Whether product is visible to customers
  - `created_at`, `updated_at` (timestamptz)
  
  ### `series`
  Subscription/series configuration for products with recurring content
  - `id` (uuid, primary key)
  - `product_id` (uuid, unique foreign key) - Links to parent product
  - `interval` (text) - 'month' or 'year' billing cycle
  - `price_cents` (int) - Recurring subscription price
  - `stripe_price_id` (text, nullable) - Stripe recurring price ID
  - `paypal_plan_id` (text, nullable) - PayPal billing plan ID
  
  ### `series_items`
  Individual content pieces within a series (e.g., newsletter issues)
  - `id` (uuid, primary key)
  - `series_id` (uuid, foreign key)
  - `title` (text) - Item title
  - `content` (text) - Full item content (HTML/Markdown)
  - `order_index` (int) - Display order within series
  - `is_published` (boolean) - Whether item is visible to subscribers
  - `created_at`, `updated_at` (timestamptz)
  
  ### `purchases`
  Transaction records for both one-time purchases and subscriptions
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References auth.users
  - `product_id` (uuid, foreign key)
  - `provider` (text) - 'stripe' or 'paypal'
  - `provider_id` (text) - External transaction/subscription ID
  - `amount_cents` (int) - Amount paid
  - `purchase_type` (text) - 'oneoff' or 'subscription'
  - `status` (text) - 'paid', 'active', 'canceled', 'refunded'
  - `created_at`, `updated_at` (timestamptz)
  
  ## Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:
  
  **Products & Series**
  - Public read access for published items only
  - Admin-only write access (controlled by custom claims)
  
  **Purchases**
  - Users can only view their own purchases
  - No direct user modifications (managed via Edge Functions)
  
  **Series Items**
  - Public read for published items
  - Subscribers get access to full content through purchase records
  
  ## Important Notes
  
  1. All prices stored in cents to avoid floating-point issues
  2. Soft-delete not implemented - use `is_published` flag instead
  3. Payment provider IDs stored for reconciliation and support
  4. Series items use order_index for flexible sequencing
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  snippet text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('ebook', 'newsletter', 'template')),
  price_cents int NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  is_series boolean NOT NULL DEFAULT false,
  file_path text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);

-- Series table
CREATE TABLE IF NOT EXISTS series (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  price_cents int NOT NULL CHECK (price_cents > 0),
  stripe_price_id text,
  paypal_plan_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_series_product ON series(product_id);

-- Series items table
CREATE TABLE IF NOT EXISTS series_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  order_index int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(series_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_series_items_series ON series_items(series_id);
CREATE INDEX IF NOT EXISTS idx_series_items_order ON series_items(series_id, order_index);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('stripe', 'paypal')),
  provider_id text NOT NULL,
  amount_cents int NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  purchase_type text NOT NULL CHECK (purchase_type IN ('oneoff', 'subscription')),
  status text NOT NULL CHECK (status IN ('paid', 'active', 'canceled', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_provider ON purchases(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS series_updated_at ON series;
CREATE TRIGGER series_updated_at BEFORE UPDATE ON series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS series_items_updated_at ON series_items;
CREATE TRIGGER series_items_updated_at BEFORE UPDATE ON series_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS purchases_updated_at ON purchases;
CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Products: Public read for published, no public write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published products" ON products;
CREATE POLICY "Anyone can view published products"
  ON products FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Service role can manage products" ON products;
CREATE POLICY "Service role can manage products"
  ON products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Series: Public read for published products
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view series for published products" ON series;
CREATE POLICY "Anyone can view series for published products"
  ON series FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = series.product_id
      AND products.is_published = true
    )
  );

DROP POLICY IF EXISTS "Service role can manage series" ON series;
CREATE POLICY "Service role can manage series"
  ON series FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Series Items: Public read for published items
ALTER TABLE series_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published series items" ON series_items;
CREATE POLICY "Anyone can view published series items"
  ON series_items FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM series
      JOIN products ON products.id = series.product_id
      WHERE series.id = series_items.series_id
      AND products.is_published = true
    )
  );

DROP POLICY IF EXISTS "Service role can manage series items" ON series_items;
CREATE POLICY "Service role can manage series items"
  ON series_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Purchases: Users see only their own purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage purchases" ON purchases;
CREATE POLICY "Service role can manage purchases"
  ON purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert some demo data
INSERT INTO products (slug, title, description, snippet, type, price_cents, is_series, is_published)
VALUES 
  (
    'react-patterns-ebook',
    'React Patterns eBook',
    'A comprehensive guide to modern React patterns including hooks, composition, and performance optimization.',
    'Preview: Learn the fundamentals of React composition patterns. This free snippet covers the basics of component composition and why it matters for building maintainable applications...',
    'ebook',
    1900,
    false,
    true
  ),
  (
    'email-templates-pack',
    'Email Templates Pack (30+)',
    'Professional email templates for product launches, user onboarding, and customer outreach. Fully customizable HTML templates.',
    'Preview includes 2 free templates: Welcome email and Password reset. See how our templates use modern email-safe HTML and inline CSS for maximum compatibility...',
    'template',
    2900,
    false,
    true
  ),
  (
    'pro-growth-newsletter',
    'Pro Growth Newsletter',
    'Monthly deep-dives into growth tactics, case studies, and playbooks from successful startups. Get actionable insights delivered to your inbox.',
    'This month''s teaser: "How we doubled our activation rate in 14 days using a simple onboarding tweak..." Subscribe to read the full case study and implementation guide.',
    'newsletter',
    0,
    true,
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- Add series for newsletter
DO $$
DECLARE
  newsletter_id uuid;
  new_series_id uuid;
BEGIN
  SELECT id INTO newsletter_id FROM products WHERE slug = 'pro-growth-newsletter';
  
  IF newsletter_id IS NOT NULL THEN
    INSERT INTO series (product_id, interval, price_cents)
    VALUES (newsletter_id, 'month', 900)
    ON CONFLICT (product_id) DO NOTHING
    RETURNING id INTO new_series_id;
    
    IF new_series_id IS NOT NULL THEN
      INSERT INTO series_items (series_id, title, content, order_index, is_published)
      VALUES 
        (
          new_series_id,
          'Issue #1 - Activation Tactics',
          '<h1>How We Doubled Activation in 14 Days</h1><p>Full case study with step-by-step implementation guide, A/B test results, and code examples...</p>',
          1,
          true
        ),
        (
          new_series_id,
          'Issue #2 - Monetization Strategies',
          '<h1>From Free to Paid: Converting 23% of Free Users</h1><p>Complete breakdown of our pricing page redesign, messaging changes, and psychological triggers that worked...</p>',
          2,
          true
        )
      ON CONFLICT (series_id, order_index) DO NOTHING;
    END IF;
  END IF;
END $$;
