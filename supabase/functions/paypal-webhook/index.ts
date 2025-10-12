import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const body = await req.json();
    const eventType = body.event_type as string;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (eventType === "PAYMENT.SALE.COMPLETED") {
      const resource = body.resource || {};
      const customId = resource.custom_id || "";
      const amount = Math.round(parseFloat(resource.amount?.total || "0") * 100);

      const [type, productId, userId] = customId.split(":");

      if (productId && userId) {
        await supabaseClient.from("purchases").insert({
          user_id: userId,
          product_id: productId,
          provider: "paypal",
          provider_id: resource.id,
          amount_cents: amount,
          purchase_type: type || "oneoff",
          status: type === "subscription" ? "active" : "paid",
        });
      }
    }

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = body.resource || {};
      const customId = resource.custom_id || "";
      const amount = Math.round(
        parseFloat(resource.amount?.value || "0") * 100
      );

      const [type, productId, userId] = customId.split(":");

      if (productId && userId) {
        await supabaseClient.from("purchases").insert({
          user_id: userId,
          product_id: productId,
          provider: "paypal",
          provider_id: resource.id,
          amount_cents: amount,
          purchase_type: type || "oneoff",
          status: type === "subscription" ? "active" : "paid",
        });
      }
    }

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const subscription = body.resource || {};
      const customId = subscription.custom_id || "";

      const [, productId, userId] = customId.split(":");

      if (productId && userId) {
        await supabaseClient.from("purchases").insert({
          user_id: userId,
          product_id: productId,
          provider: "paypal",
          provider_id: subscription.id,
          amount_cents: 0,
          purchase_type: "subscription",
          status: "active",
        });
      }
    }

    if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
      const subscription = body.resource || {};
      await supabaseClient
        .from("purchases")
        .update({ status: "canceled" })
        .eq("provider", "paypal")
        .eq("provider_id", subscription.id)
        .eq("purchase_type", "subscription");
    }

    if (eventType === "PAYMENT.SALE.REFUNDED") {
      const resource = body.resource || {};
      const saleId = resource.sale_id;

      if (saleId) {
        await supabaseClient
          .from("purchases")
          .update({ status: "refunded" })
          .eq("provider", "paypal")
          .eq("provider_id", saleId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("PayPal webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
