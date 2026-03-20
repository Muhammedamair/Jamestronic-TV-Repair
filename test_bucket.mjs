import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.storage.getBucket('service-updates');
  if (error && error.message.includes('not found')) {
    console.log("Bucket not found, creating...");
    const { data: createData, error: createError } = await supabase.storage.createBucket('service-updates', { public: true });
    console.log("Create result:", createData, createError);
  } else {
    console.log("Bucket exists:", data);
  }
}
run();
