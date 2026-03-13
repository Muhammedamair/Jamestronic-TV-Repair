const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

async function checkSub() {
  const res = await fetch(`${VITE_SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  console.log("Subscriptions Data:", JSON.stringify(data, null, 2));

  const dealersRes = await fetch(`${VITE_SUPABASE_URL}/rest/v1/dealers?select=*`, {
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const dealersData = await dealersRes.json();
  console.log("\nDealers Data:", JSON.stringify(dealersData, null, 2));
}
checkSub();
