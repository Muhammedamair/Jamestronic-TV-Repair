import { supabase } from '../supabaseClient';

// VAPID public key for Web Push subscription
const VAPID_PUBLIC_KEY = 'BL0BQ7PV2jtF72g3zyLBMuv-ZWAFynOljbB1mvXJ0MVMUAJQF2zROZYe71lAFKEFTv2uM1KEfOYQV5Dqob52hC8';

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
        if (permission === 'denied') {
            alert('Notifications are currently blocked. Please tap the lock icon in the address bar, open Site Settings, and Allow Notifications.');
            return false;
        }
        if (permission !== 'granted') {
            alert('Notification permission could not be granted.');
            return false;
        }

        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            try {
                // Subscribe to push
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
                });
            } catch (subErr: any) {
                alert('Push manager subscription failed: ' + subErr.message);
                console.error('PushManager.subscribe error:', subErr);
                return false;
            }
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
        alert('Push Notifications enabled successfully!');
        return true;
    } catch (err: any) {
        alert('Push subscription error: ' + (err.message || String(err)));
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

/**
 * Ensures the existing browser subscription is associated with the current user in the database.
 * Useful when switching accounts on the same device.
 */
export async function syncPushSubscription(): Promise<void> {
    try {
        if (!('serviceWorker' in navigator)) return;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const subscriptionJSON = subscription.toJSON();
        const { endpoint, keys } = subscriptionJSON;
        if (!endpoint || !keys?.p256dh || !keys?.auth) return;

        await supabase.from('push_subscriptions').upsert(
            {
                user_id: user.id,
                endpoint,
                p256dh_key: keys.p256dh,
                auth_key: keys.auth
            },
            { onConflict: 'user_id,endpoint' }
        );
        console.log('🔄 Push subscription synced with current user.');
    } catch (err) {
        console.error('Error syncing push subscription:', err);
    }
}
