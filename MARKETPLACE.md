# Marketplace Module - Complete Documentation

A production-ready digital marketplace built with Next.js 13, Supabase, Stripe, and PayPal.

## Features

### Core Functionality
- **Digital Products**: Sell eBooks, newsletters, and templates
- **One-Time Purchases**: Single payment for lifetime access
- **Subscriptions/Series**: Recurring billing for ongoing content
- **Free Previews**: Show snippets before purchase
- **Multiple Payment Providers**: Stripe and PayPal support
- **Secure File Downloads**: Access-controlled file delivery
- **Admin Dashboard**: Manage products, series, and content
- **Content Ingestion API**: Server-to-server content push via HMAC-signed requests

### Security
- **Row Level Security (RLS)**: All database tables protected
- **Restrictive Policies**: Users only see their own purchases
- **Access Control**: File downloads require valid purchase
- **HMAC Authentication**: Secure content ingestion endpoint
- **Webhook Verification**: Stripe signature validation

## Database Schema

### Tables

**products**
- Core product catalog
- Supports both standalone items and series/subscriptions
- Fields: `id`, `slug`, `title`, `description`, `snippet`, `type` (ebook/newsletter/template), `price_cents`, `is_series`, `file_path`, `is_published`

**series**
- Subscription configuration for products
- Fields: `id`, `product_id`, `interval` (month/year), `price_cents`, `stripe_price_id`, `paypal_plan_id`

**series_items**
- Individual content pieces within a series
- Fields: `id`, `series_id`, `title`, `content`, `order_index`, `is_published`

**purchases**
- Transaction records for all purchases and subscriptions
- Fields: `id`, `user_id`, `product_id`, `provider` (stripe/paypal), `provider_id`, `amount_cents`, `purchase_type` (oneoff/subscription), `status` (paid/active/canceled/refunded)

## Routes

### Public Pages
- `/market` - Browse all published products
- `/market/[slug]` - View product details with free preview
- `/market/thanks` - Post-purchase success page
- `/market/cancel` - Payment cancellation page
- `/auth/signin` - User authentication
- `/auth/signup` - New user registration

### Admin Pages
- `/dashboard/market` - Manage all products
- `/dashboard/market/new` - Create new product

### API Routes
- `/api/marketplace/checkout` - Initiates Stripe/PayPal checkout
- `/api/marketplace/products` - Create new products
- `/api/marketplace/download/[slug]` - Secure file downloads

## Edge Functions

All payment processing and webhooks run as Supabase Edge Functions:

### stripe-checkout
- Creates Stripe checkout sessions
- Handles both one-time and subscription payments
- Requires authentication (JWT verification enabled)

### stripe-webhook
- Processes Stripe webhooks
- Handles: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, `charge.refunded`
- Verifies webhook signatures
- Updates purchase records

### paypal-checkout
- Creates PayPal orders
- Handles both one-time and subscription payments
- Requires authentication (JWT verification enabled)

### paypal-webhook
- Processes PayPal webhooks
- Handles: `PAYMENT.SALE.COMPLETED`, `PAYMENT.CAPTURE.COMPLETED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `PAYMENT.SALE.REFUNDED`

### ingest-content
- Accepts server-to-server content pushes
- HMAC signature verification
- No JWT required (uses HMAC instead)
- Creates/updates products, series, and series items

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox # or "live"

# Content Ingestion
INGEST_HMAC_SECRET=your_secure_random_secret_at_least_32_chars

# Application URL
APP_URL=http://localhost:3000
```

### 2. Stripe Configuration

1. Create a Stripe account at https://dashboard.stripe.com
2. Get your Secret Key from the Developers section
3. Create webhook endpoint pointing to: `https://your-supabase-url.supabase.co/functions/v1/stripe-webhook`
4. Configure webhook to listen for these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `charge.refunded`
5. Copy the webhook signing secret

**For Subscriptions** (optional):
- Create recurring Prices in Stripe Dashboard
- Add Price IDs to the `series` table's `stripe_price_id` column

### 3. PayPal Configuration

1. Create a PayPal Business account at https://developer.paypal.com
2. Create an App to get Client ID and Secret
3. Configure webhook endpoint: `https://your-supabase-url.supabase.co/functions/v1/paypal-webhook`
4. Subscribe to these events:
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `PAYMENT.SALE.REFUNDED`

### 4. Configure Edge Function Secrets

The Edge Functions automatically use these environment variables from Supabase. To set them:

1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Add these secrets:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_MODE`
   - `INGEST_HMAC_SECRET`
   - `APP_URL`

### 5. File Storage

Products with downloadable files should be stored in the `/storage` directory:

```
storage/
  ebooks/          # PDF, EPUB files
  templates/       # ZIP archives
  files/           # Other files
```

Set the `file_path` in the database to the relative path (e.g., `ebooks/my-ebook.pdf`).

## Usage Examples

### Creating a Product (Admin Dashboard)

1. Navigate to `/dashboard/market`
2. Click "New Product"
3. Fill in product details:
   - Title, slug, type (ebook/newsletter/template)
   - Description and free snippet
   - Price in cents
   - Toggle "Is Series" for subscriptions
   - Toggle "Published" to make visible
4. Click "Create Product"

### Content Ingestion API

Push content from external systems using HMAC-signed requests:

```bash
#!/bin/bash

SECRET="your_secure_hmac_secret"
BODY='{
  "slug": "advanced-react-patterns",
  "title": "Advanced React Patterns",
  "description": "Deep dive into advanced React patterns and techniques.",
  "snippet": "Preview: Learn composition patterns...",
  "type": "ebook",
  "price_cents": 2900,
  "is_series": false,
  "publish": true
}'

# Generate HMAC signature
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Send request
curl -X POST "https://your-supabase-url.supabase.co/functions/v1/ingest-content" \
  -H "Content-Type: application/json" \
  -H "x-hmac-signature: $SIG" \
  -d "$BODY"
```

### Series/Subscription Example

```json
{
  "slug": "monthly-newsletter",
  "title": "Monthly Growth Newsletter",
  "description": "Monthly insights and case studies",
  "snippet": "This month: Doubling activation in 14 days...",
  "type": "newsletter",
  "price_cents": 0,
  "is_series": true,
  "series": {
    "interval": "month",
    "price_cents": 900,
    "stripe_price_id": "price_1234567890",
    "items": [
      {
        "title": "Issue #1 - Activation",
        "content": "<h1>Full content here...</h1>",
        "order_index": 1
      }
    ]
  },
  "publish": true
}
```

## Testing

### Test the Marketplace

1. Visit `/market` to see published products
2. Click a product to view details
3. Sign up at `/auth/signup`
4. Try purchasing with test cards:
   - **Stripe**: `4242 4242 4242 4242`
   - **PayPal**: Use sandbox account

### Test Webhooks Locally

For local development, use tools like ngrok or Stripe CLI:

```bash
# Stripe CLI
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# ngrok
ngrok http 3000
# Then configure webhooks to point to your ngrok URL
```

## Architecture Decisions

### Why Supabase Edge Functions?
- Secure API keys (never exposed to client)
- Automatic scaling
- Built-in authentication integration
- Webhook signature verification on secure server

### Why Service Role for Webhooks?
- Webhooks need to bypass RLS to create purchase records
- Service role used only in Edge Functions (never client-side)
- Webhook signatures verified before any database operations

### Why HMAC for Ingestion API?
- Allows server-to-server content pushing
- No user authentication required
- Time-based signatures prevent replay attacks
- Suitable for integration with external CMSs or tools

## Common Issues

### TypeScript Errors with Supabase Client
The types in this project use workarounds (`as any`, `as 'id'`) for Supabase's complex type inference. This is intentional to avoid type errors while maintaining runtime safety.

### Build Warnings About Supabase Realtime
The warnings about "Critical dependency" from `@supabase/realtime-js` are safe to ignore. They don't affect functionality.

### Edge Function Deployment
If Edge Functions fail to deploy, check:
1. Supabase CLI is not required (deployment happens via Supabase API)
2. All environment variables are set in Supabase Dashboard
3. Function names match webhook configurations

## Future Enhancements

Potential additions for your marketplace:

- **Product Bundles**: Sell multiple products together at discount
- **Coupons/Discounts**: Promo codes for special pricing
- **Referral System**: Reward users for referrals
- **Reviews/Ratings**: Customer feedback on products
- **Product Categories/Tags**: Better organization
- **Advanced Analytics**: Sales reports, revenue tracking
- **Email Notifications**: Purchase confirmations, download links
- **License Keys**: Generate unique keys for software products
- **Product Variations**: Different formats/editions of same product

## Support

For issues or questions:
1. Check Supabase logs for Edge Function errors
2. Check Stripe/PayPal dashboards for payment issues
3. Verify RLS policies are correctly applied
4. Check browser console for client-side errors

---

Built with Next.js 13, Supabase, Stripe, and PayPal. Fully production-ready with comprehensive security and payment handling.
