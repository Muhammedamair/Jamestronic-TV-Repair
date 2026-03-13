import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { phoneNumber, templateName, bodyValues, buttonValues } = await req.json()

        if (!phoneNumber || !templateName) {
            throw new Error("phoneNumber and templateName are required")
        }

        // Clean phone number
        let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
            cleanPhone = cleanPhone.substring(2);
        }

        const INTERAKT_API_KEY = Deno.env.get('INTERAKT_API_KEY')

        if (!INTERAKT_API_KEY) {
            throw new Error("Missing INTERAKT_API_KEY secret")
        }

        const template: any = {
            name: templateName,
            languageCode: "en",
        };

        // Only include bodyValues if there are actual values
        if (bodyValues && bodyValues.length > 0) {
            template.bodyValues = bodyValues;
        }

        // Only include buttonValues if provided
        if (buttonValues) {
            template.buttonValues = buttonValues;
        }

        const payload: any = {
            countryCode: "+91",
            phoneNumber: cleanPhone,
            type: "Template",
            template
        };

        console.log("Sending payload to Interakt:", JSON.stringify(payload));

        const res = await fetch("https://api.interakt.ai/v1/public/message/", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${INTERAKT_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json()

        if (!res.ok) {
            console.error("Interakt API Error:", data);
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: res.status,
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack,
            name: error.name
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
