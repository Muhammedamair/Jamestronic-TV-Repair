import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://dqjzqmwqkljyirftgyau.supabase.co", "");
async function go() {
  const { data, error } = await supabase.storage.createBucket('service-updates', { public: true });
  console.log('Bucket created:', data, error);
}
go();
