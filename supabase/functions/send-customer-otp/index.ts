import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Debug: log environment check
    console.log("ENV check - TWILIO_ACCOUNT_SID exists:", !!TWILIO_ACCOUNT_SID);
    console.log("ENV check - TWILIO_AUTH_TOKEN exists:", !!TWILIO_AUTH_TOKEN);
    console.log("ENV check - TWILIO_PHONE_NUMBER:", TWILIO_PHONE_NUMBER);
    console.log("ENV check - SUPABASE_URL:", Deno.env.get("SUPABASE_URL") ? "exists" : "MISSING");
    console.log("ENV check - SUPABASE_SERVICE_ROLE_KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "exists" : "MISSING");

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body. Send { mobile: '9052222901' }" }, 400);
    }

    const { mobile } = body;
    console.log("Received mobile:", mobile);

    if (!mobile || mobile.length < 10) {
      return jsonResponse({ error: "Invalid mobile number" }, 400);
    }

    // Create Supabase admin client (service_role auto-available in Edge Functions)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse({ error: "Server configuration error (Supabase)" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if customer exists (use limit(1) since mobile may have duplicates)
    console.log("Looking up customer with mobile:", mobile);
    const { data: customers, error: custErr } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("mobile", mobile)
      .limit(1);

    if (custErr) {
      console.error("Customer lookup error:", JSON.stringify(custErr));
      return jsonResponse({ error: "Database error: " + custErr.message }, 500);
    }

    if (!customers || customers.length === 0) {
      console.log("No customer found for mobile:", mobile);
      return jsonResponse({
        error: "No account found with this mobile number. Please book a service first.",
      }, 404);
    }

    console.log("Customer found:", customers[0].id);

    // 2. Generate a real random 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    console.log("Generated OTP for", mobile);

    // 3. Mark previous OTPs as used
    const { error: updateErr } = await supabaseAdmin
      .from("customer_otps")
      .update({ used: true })
      .eq("mobile", mobile)
      .eq("used", false);

    if (updateErr) {
      console.error("OTP update error:", JSON.stringify(updateErr));
      // Non-fatal, continue
    }

    // 4. Insert new OTP (valid for 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertErr } = await supabaseAdmin
      .from("customer_otps")
      .insert({ mobile, otp, expires_at: expiresAt });

    if (insertErr) {
      console.error("OTP insert error:", JSON.stringify(insertErr));
      return jsonResponse({ error: "Failed to generate OTP: " + insertErr.message }, 500);
    }

    console.log("OTP stored in database");

    // 5. Format phone number for Twilio (add +91 for India if not present)
    let toPhone = mobile;
    if (!toPhone.startsWith("+")) {
      toPhone = "+91" + toPhone;
    }

    // 6. Validate Twilio credentials
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing Twilio credentials!");
      return jsonResponse({ error: "SMS service not configured" }, 500);
    }

    // 7. Send SMS via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formBody = new URLSearchParams({
      To: toPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: `Your JamesTronic verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
    });

    console.log("Calling Twilio API. To:", toPhone, "From:", TWILIO_PHONE_NUMBER);

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio API error:", JSON.stringify(twilioData));
      return jsonResponse({
        error: "Failed to send SMS: " + (twilioData.message || "Unknown Twilio error"),
        twilio_code: twilioData.code,
      }, 500);
    }

    console.log("SMS sent successfully! SID:", twilioData.sid);

    return jsonResponse({ success: true, message: "OTP sent successfully" });

  } catch (err) {
    console.error("Unexpected error:", String(err), err instanceof Error ? err.stack : "");
    return jsonResponse({ error: "Internal server error: " + String(err) }, 500);
  }
});
