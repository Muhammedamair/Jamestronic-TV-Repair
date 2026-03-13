import { supabase } from '../supabaseClient';

// VAPID public key for Web Push subscription
const VAPID_PUBLIC_KEY = 'BAP80TcVZAF13F7adlJXs-fjrxq_2zdvNOUmrq1ZZB1uxfXt5ntiEMKdzVFiWtynFxWBIpmS62R37QPtLV7-sWs';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush(): Promise<boolean> {
    try {
        // Check if push is supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported in this browser.');
            return false;
        }

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied.');
            return false;
        }

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Subscribe to push
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
            });
        }

        // Extract subscription data
        const subscriptionJSON = subscription.toJSON();
        const endpoint = subscriptionJSON.endpoint!;
        const p256dh = subscriptionJSON.keys!.p256dh!;
        const auth = subscriptionJSON.keys!.auth!;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Save to database (upsert to avoid duplicates)
        const { error } = await supabase.from('push_subscriptions').upsert(
            {
                user_id: user.id,
                endpoint,
                p256dh_key: p256dh,
                auth_key: auth
            },
            { onConflict: 'user_id,endpoint' }
        );

        if (error) {
            console.error('Failed to save push subscription:', error);
            return false;
        }

        console.log('✅ Push notification subscription saved successfully.');
        return true;
    } catch (err) {
        console.error('Push subscription error:', err);
        return false;
    }
}

export async function isPushSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    } catch {
        return false;
    }
}
