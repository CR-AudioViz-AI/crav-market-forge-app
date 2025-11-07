import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@16";
import { getErrorMessage, logError, formatApiError } from '@/lib/utils/error-utils';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-06-20",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const productId = session.metadata?.productId;
      const userId = session.metadata?.userId;
      const type = session.metadata?.type || "oneoff";

      if (productId && userId && session.payment_status === "paid") {
        // SECURITY: Fetch actual product price from database (don't trust client/metadata)
        const { data: product } = await supabaseClient
          .from("products")
          .select("price_cents, title")
          .eq("id", productId)
          .single();

        if (!product) {
          console.error(`Product ${productId} not found for session ${session.id}`);
          return new Response(
            JSON.stringify({ error: "Product not found" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Validate amount matches expected price (allow for small rounding differences)
        const expectedAmount = type === "subscription" ? 0 : product.price_cents;
        const actualAmount = (session.amount_total ?? 0) as number;
        
        if (type === "oneoff" && Math.abs(actualAmount - expectedAmount) > 1) {
          console.warn(
            `Price mismatch for ${session.id}: expected ${expectedAmount}, got ${actualAmount}`
          );
          // Continue with Stripe's amount (they paid it), but log for audit
        }

        // IDEMPOTENCY: Insert will fail gracefully if (provider, provider_id) already exists
        // The unique index causes duplicate key error, which we catch and treat as success
        const { error: insertError } = await supabaseClient
          .from("purchases")
          .insert({
            user_id: userId,
            product_id: productId,
            provider: "stripe",
            provider_id: session.id,
            amount_cents: actualAmount,
            purchase_type: type,
            status: type === "subscription" ? "active" : "paid",
          });

        if (insertError) {
          // Check if it's a duplicate key error (idempotency)
          if (insertError.code === "23505") {
            console.log(
              `Idempotent webhook: Purchase already exists for ${session.id}`
            );
            // Return success - this is expected for webhook retries
          } else {
            console.error("Failed to create purchase:", insertError);
            return new Response(
              JSON.stringify({ error: "Database error" }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

      if (subId) {
        await supabaseClient
          .from("purchases")
          .update({ status: "active" })
          .eq("provider", "stripe")
          .eq("provider_id", subId)
          .eq("purchase_type", "subscription");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseClient
        .from("purchases")
        .update({ status: "canceled" })
        .eq("provider", "stripe")
        .eq("provider_id", subscription.id)
        .eq("purchase_type", "subscription");
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent.id;

        // Find by session ID stored in provider_id
        // Note: For refunds via payment_intent, we need to query differently
        const { data: purchases } = await supabaseClient
          .from("purchases")
          .select("id")
          .eq("provider", "stripe")
          .eq("provider_id", paymentIntentId)
          .limit(1);

        if (purchases && purchases.length > 0) {
          await supabaseClient
            .from("purchases")
            .update({ status: "refunded" })
            .eq("id", purchases[0].id);
        }
      }
    }

    // Always return 200 for successful webhook processing
    // Stripe will retry if we return non-2xx
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logError(\'Stripe webhook error:\', error);
    // Return 500 to trigger Stripe retry
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
