export interface InteraktMessageParams {
    phoneNumber: string;
    templateName: string;
    bodyValues?: string[];
    buttonValues?: any;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Sends a WhatsApp message via the Supabase Edge Function using direct fetch.
 * This bypasses the Supabase JS SDK to ensure the request is always made.
 */
export const sendInteraktMessage = async (params: InteraktMessageParams) => {
    // Basic validation: remove spaces and plus signs, then check if it's a valid number with at least 10 digits
    const cleanedNumber = params.phoneNumber ? params.phoneNumber.replace(/[\s+]/g, '') : '';
    if (!cleanedNumber || cleanedNumber.length < 10 || isNaN(Number(cleanedNumber))) {
        console.warn(`⚠️ [INTERAKT] Skipping message: Invalid phone number format '${params.phoneNumber}'`);
        return null;
    }

    console.log('🚀 [INTERAKT] Starting message send with params:', JSON.stringify(params));
    try {
        const url = `${SUPABASE_URL}/functions/v1/send-interakt-message`;
        console.log('🚀 [INTERAKT] Fetching:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(params),
        });

        const data = await response.json();
        console.log('🚀 [INTERAKT] Response status:', response.status, 'data:', JSON.stringify(data));

        if (!response.ok) {
            console.error('❌ [INTERAKT] Edge Function error:', data);
            return null;
        }

        console.log('✅ [INTERAKT] Message sent successfully!', data);
        return data;
    } catch (e) {
        console.error('❌ [INTERAKT] Failed to send message:', e);
        return null;
    }
};
