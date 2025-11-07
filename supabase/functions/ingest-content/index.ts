import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getErrorMessage, logError, formatApiError } from '@/lib/utils/error-utils';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyHMAC(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === signature;
}

interface IngestPayload {
  slug: string;
  title: string;
  description: string;
  snippet: string;
  type: "ebook" | "newsletter" | "template";
  price_cents: number;
  is_series?: boolean;
  series?: {
    interval: "month" | "year";
    price_cents: number;
    stripe_price_id?: string;
    paypal_plan_id?: string;
    items?: Array<{
      title: string;
      content: string;
      order_index: number;
    }>;
  };
  publish?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const signature = req.headers.get("x-hmac-signature");
    const hmacSecret = Deno.env.get("INGEST_HMAC_SECRET");

    if (!signature || !hmacSecret) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.text();
    const isValid = await verifyHMAC(payload, signature, hmacSecret);

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: IngestPayload = JSON.parse(payload);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .upsert(
        {
          slug: data.slug,
          title: data.title,
          description: data.description,
          snippet: data.snippet,
          type: data.type,
          price_cents: data.price_cents,
          is_series: data.is_series ?? false,
          is_published: data.publish ?? true,
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (productError) {
      return new Response(JSON.stringify({ error: productError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.is_series && data.series) {
      const { error: seriesError } = await supabaseClient
        .from("series")
        .upsert(
          {
            product_id: product.id,
            interval: data.series.interval,
            price_cents: data.series.price_cents,
            stripe_price_id: data.series.stripe_price_id,
            paypal_plan_id: data.series.paypal_plan_id,
          },
          { onConflict: "product_id" }
        );

      if (seriesError) {
        return new Response(JSON.stringify({ error: seriesError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data.series.items && data.series.items.length > 0) {
        const { data: series } = await supabaseClient
          .from("series")
          .select("id")
          .eq("product_id", product.id)
          .single();

        if (series) {
          for (const item of data.series.items) {
            await supabaseClient.from("series_items").upsert(
              {
                series_id: series.id,
                title: item.title,
                content: item.content,
                order_index: item.order_index,
                is_published: true,
              },
              { onConflict: "series_id,order_index" }
            );
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, product_id: product.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    logError(\'Ingest error:\', error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
