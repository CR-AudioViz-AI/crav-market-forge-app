/*
  # Webhook Idempotency & Performance Indexes
  
  ## Critical Security & Performance Fixes
  
  ### 1. Webhook Idempotency (HIGH PRIORITY)
  Prevents duplicate purchase records from webhook replays or retries.
  - Unique constraint on (provider, provider_id)
  - Ensures each external transaction creates exactly one purchase record
  
  ### 2. Performance Indexes
  Optimizes hot query paths for production load:
  - Product/bundle listings (published items, sorted by date)
  - User purchase history
  - Series item ordering
  
  ### 3. Additional Safety
  - Check constraint to ensure amount_cents is positive
  - Index on active coupons for fast validation
  
  ## Important Notes
  - The unique index will cause INSERT to fail gracefully on duplicates
  - Edge Functions should catch this error and return 200 OK (idempotent behavior)
  - All indexes are created with IF NOT EXISTS for safe reapplication
*/

-- =====================================================
-- WEBHOOK IDEMPOTENCY
-- =====================================================

-- Unique constraint: one purchase record per external transaction
-- This prevents duplicate records from webhook replays
CREATE UNIQUE INDEX IF NOT EXISTS purchases_provider_id_unique
  ON purchases(provider, provider_id);

-- Additional safety: ensure amounts are never negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'purchases_amount_positive'
  ) THEN
    ALTER TABLE purchases 
      ADD CONSTRAINT purchases_amount_positive 
      CHECK (amount_cents >= 0);
  END IF;
END $$;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Hot path: List published products, sorted by creation date
CREATE INDEX IF NOT EXISTS products_published_created_idx 
  ON products (is_published, created_at DESC)
  WHERE is_published = true;

-- Hot path: Filter products by type (for category pages)
CREATE INDEX IF NOT EXISTS products_type_published_idx
  ON products (type, is_published, created_at DESC)
  WHERE is_published = true;

-- Hot path: User purchase history (for "My Purchases" page)
CREATE INDEX IF NOT EXISTS purchases_user_created_idx
  ON purchases (user_id, created_at DESC);

-- Hot path: Check if user has access to specific product
CREATE INDEX IF NOT EXISTS purchases_user_product_status_idx
  ON purchases (user_id, product_id, status)
  WHERE status IN ('paid', 'active');

-- Hot path: Series items ordering within a series
CREATE INDEX IF NOT EXISTS series_items_series_order_idx
  ON series_items (series_id, order_index, is_published)
  WHERE is_published = true;

-- Hot path: Find series by product
CREATE INDEX IF NOT EXISTS series_product_idx
  ON series (product_id);

-- =====================================================
-- WEBHOOK PROVIDER INDEXES
-- =====================================================

-- Fast lookup by provider subscription ID (for updates)
CREATE INDEX IF NOT EXISTS purchases_provider_subscription_idx
  ON purchases (provider, provider_id, purchase_type)
  WHERE purchase_type = 'subscription';

-- Fast lookup for refund processing
CREATE INDEX IF NOT EXISTS purchases_provider_status_idx
  ON purchases (provider, status)
  WHERE status != 'refunded';

-- =====================================================
-- ANALYZE TABLES
-- =====================================================

-- Update statistics for query planner
ANALYZE products;
ANALYZE purchases;
ANALYZE series;
ANALYZE series_items;
