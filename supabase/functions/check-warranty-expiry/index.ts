import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// We need the Anon key to call our other Edge Function (send-interakt-message) 
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
    console.log('--- Started check-warranty-expiry ---');

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // 1. Calculate the target date: exactly 7 days from today
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 7);
        
        // Format as YYYY-MM-DD for precise querying (assuming DB stores it as TIMESTAMPTZ, we check the day)
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        console.log(`Searching for warranties expiring between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

        // 2. Query tickets where warranty_expiry_date falls within the target day and the warranty has NOT been voided
        const { data: tickets, error } = await supabase
            .from('tickets')
            .select('*, customer:customers(*)')
            .not('warranty_expiry_date', 'is', null)
            .gte('warranty_expiry_date', startOfDay.toISOString())
            .lte('warranty_expiry_date', endOfDay.toISOString());

        if (error) throw error;

        console.log(`Found ${tickets?.length || 0} tickets expiring in exactly 7 days.`);

        const results = [];

        // 3. For each expiring ticket, trigger an Interakt WhatsApp notification
        if (tickets && tickets.length > 0) {
            for (const ticket of tickets) {
                const customer = ticket.customer;
                if (!customer || !customer.mobile) {
                    console.log(`Skipping ticket ${ticket.id}: No customer mobile found.`);
                    results.push({ ticket_id: ticket.id, status: 'skipped (no mobile)' });
                    continue;
                }

                console.log(`Sending expiry warning to ${customer.mobile} for ticket ${ticket.id}...`)

                // Call the existing interakt Edge Function securely 
                // Alternatively, we could fetch from Interakt directly, but reusing the existing function is cleaner if it handles errors
                const interaktRes = await fetch(`${SUPABASE_URL}/functions/v1/send-interakt-message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        phoneNumber: customer.mobile,
                        templateName: 'warranty_expiring_soon',
                        bodyValues: [
                            ticket.tv_brand || 'TV', 
                            ticket.tv_size ? ticket.tv_size.toString() : 'your', 
                            '7 days' // or compute actual days just in case
                        ]
                    })
                });

                if (!interaktRes.ok) {
                    console.error(`Failed to send interakt msg for ticket ${ticket.id}`);
                    results.push({ ticket_id: ticket.id, status: 'failed' });
                } else {
                    console.log(`Successfully notified ${customer.mobile}`);
                    results.push({ ticket_id: ticket.id, status: 'success' });
                }
            }
        }

        return new Response(JSON.stringify({ success: true, processed: tickets?.length || 0, details: results }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (err) {
        console.error('Error in check-warranty-expiry:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
