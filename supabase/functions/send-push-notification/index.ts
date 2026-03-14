import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidSubject = "mailto:admin@jamestronic.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payloadData = await req.json();
    
    // Backward compatibility for part requests
    const isPartRequest = !!payloadData.part_name;
    const request_id = payloadData.request_id;
    const part_name = payloadData.part_name;
    const tv_brand = payloadData.tv_brand;
    const target_dealer_ids = payloadData.target_dealer_ids;

    // Generic payload support
    const title = payloadData.title || (isPartRequest ? "🔔 New Part Request!" : "Notification");
    const bodyText = payloadData.body || (isPartRequest ? `New request: ${part_name} (${tv_brand || "Unknown brand"}). Tap to view and submit your bid.` : "You have a new notification.");
    const url = payloadData.url || (isPartRequest ? "/dealer" : "/");
    let target_user_ids = payloadData.target_user_ids || [];

    // Create admin client to read all subscriptions
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build notification payload
    const pushPayload = JSON.stringify({
      title,
      body: bodyText,
      url,
      request_id, // include if exists
      ticket_id: payloadData.ticket_id, // include if exists
    });

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Configure Web Push with VAPID keys
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Determine which users to notify
    let query = supabase.from("push_subscriptions").select(
      "endpoint, p256dh_key, auth_key, user_id"
    );

    // Resolve dealer_ids to user_ids if needed (legacy support)
    if (target_dealer_ids && target_dealer_ids.length > 0) {
      const { data: dealers } = await supabase
        .from("dealers")
        .select("user_id")
        .in("id", target_dealer_ids);

      if (dealers && dealers.length > 0) {
        const dealerUserIds = dealers.map((d: { user_id: string }) => d.user_id).filter(Boolean);
        target_user_ids = [...target_user_ids, ...dealerUserIds];
      }
    }

    if (target_user_ids && target_user_ids.length > 0) {
        query = query.in("user_id", target_user_ids);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No push subscriptions found for target dealers.",
          sent: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send push notifications
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key,
        },
      };

      try {
        await webpush.sendNotification(pushSub, pushPayload);
        sent++;
      } catch (pushErr: any) {
        failed++;
        const errStatus = pushErr.statusCode;
        errors.push(`Status ${errStatus || 'unknown'} for ${sub.endpoint.slice(-20)}: ${pushErr.message || String(pushErr)}`);

        // Remove expired/invalid subscriptions
        if (errStatus === 404 || errStatus === 410) {
          await supabase.from("push_subscriptions").delete().eq(
            "endpoint",
            sub.endpoint
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
