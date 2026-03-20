import { useRef, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Ordered customer routes — index determines "forward" or "back"
const ROUTE_ORDER = ['/', '/book', '/track', '/my-tickets', '/account', '/buy'];

function getRouteIndex(pathname: string): number {
    // Exact match first
    const exact = ROUTE_ORDER.indexOf(pathname);
    if (exact >= 0) return exact;
    // Prefix match (e.g. /track/JT-123 maps to /track)
    const prefix = ROUTE_ORDER.findIndex(r => r !== '/' && pathname.startsWith(r));
    if (prefix >= 0) return prefix;
    return -1;
}

/**
 * Returns 'forward' or 'back' based on the navigation direction.
 * Compares the current route against the previous route using ROUTE_ORDER.
 */
export function useNavigationDirection(): 'forward' | 'back' {
    const pathname = usePathname();
    const prevPathRef = useRef(pathname || '/');
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');

    useEffect(() => {
        if (!pathname) return;
        const prevIndex = getRouteIndex(prevPathRef.current);
        const currIndex = getRouteIndex(pathname);

        if (prevIndex >= 0 && currIndex >= 0) {
            setDirection(currIndex >= prevIndex ? 'forward' : 'back');
        } else {
            setDirection('forward');
        }

        prevPathRef.current = pathname;
    }, [pathname]);

    return direction;
}
