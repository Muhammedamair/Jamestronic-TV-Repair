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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mobile } = await req.json();

    if (!mobile || mobile.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid mobile number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase admin client (service_role auto-available in Edge Functions)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // 1. Check if customer exists
    const { data: customer, error: custErr } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("mobile", mobile)
      .maybeSingle();

    if (custErr) {
      console.error("Customer lookup error:", custErr);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!customer) {
      return new Response(
        JSON.stringify({
          error:
            "No account found with this mobile number. Please book a service first.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Generate a real random 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // 3. Mark previous OTPs as used
    await supabaseAdmin
      .from("customer_otps")
      .update({ used: true })
      .eq("mobile", mobile)
      .eq("used", false);

    // 4. Insert new OTP (valid for 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertErr } = await supabaseAdmin
      .from("customer_otps")
      .insert({ mobile, otp, expires_at: expiresAt });

    if (insertErr) {
      console.error("OTP insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Format phone number for Twilio (add +91 for India if not present)
    let toPhone = mobile;
    if (!toPhone.startsWith("+")) {
      toPhone = "+91" + toPhone;
    }

    // 6. Send SMS via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formBody = new URLSearchParams({
      To: toPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: `Your JamesTronic verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
    });

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
      console.error("Twilio error:", JSON.stringify(twilioData));
      return new Response(
        JSON.stringify({
          error: "Failed to send SMS. Please try again.",
          detail: twilioData.message || "",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("SMS sent successfully. SID:", twilioData.sid);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
