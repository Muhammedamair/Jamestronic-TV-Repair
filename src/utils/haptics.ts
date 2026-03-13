/**
 * Trigger device haptic feedback (vibration)
 * 
 * Note: Apple strict iOS Safari policies do NOT support the HTML5 HTMLVibration API 
 * natively in the browser for security/battery reasons. This will work on Android Chrome/Firefox 
 * and will silently fail (without errors) on iOS.
 * 
 * @param pattern - Duration in ms, or an array of durations (e.g. [100, 50, 100])
 */
export const triggerHaptic = (pattern: number | number[] = 50) => {
    // Check if the vibrate API is available on the navigator object
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try {
            window.navigator.vibrate(pattern);
        } catch (e) {
            // Ignore errors if vibration fails or is blocked by browser policies
            console.warn('Haptic feedback failed', e);
        }
    }
};

// Preset haptic patterns for consistent UX
export const haptics = {
    light: () => triggerHaptic(30),
    medium: () => triggerHaptic(50),
    heavy: () => triggerHaptic(100),
    success: () => triggerHaptic([30, 60, 40]),
    error: () => triggerHaptic([50, 100, 50, 100, 50]),
};
