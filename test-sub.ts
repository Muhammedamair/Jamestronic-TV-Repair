import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSub() {
  const { data, error } = await supabase.from('push_subscriptions').select('*');
  if (error) {
     console.error("DB Error:", error);
     return;
  }
  console.log("Subscriptions found:", data?.length);
  console.log(data);
}
checkSub();
