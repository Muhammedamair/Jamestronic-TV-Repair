import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/std@0.170.0/dotenv/load.ts";

const url = Deno.env.get("VITE_SUPABASE_URL");
const key = Deno.env.get("VITE_SUPABASE_ANON_KEY"); // Try as anon first to check RLS, or service_role to check insertion
const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.from('notification_logs').select('*');
    console.log("Anon Fetch Data:", data?.length, "Logs");
    if (error) console.error("Anon Fetch Error:", error);
}

check();
