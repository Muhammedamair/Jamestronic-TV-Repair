"use client";
import React, { useMemo } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Box } from '@mui/material';
import PageTransition from './PageTransition';
import { useNavigationDirection } from '../../hooks/useNavigationDirection';

// Customer pages
import CustomerLandingPage from '../../views/customer/CustomerLandingPage';
import CustomerBookingPage from '../../views/customer/CustomerBookingPage';
import CustomerTrackingPage from '../../views/customer/CustomerTrackingPage';
import CustomerTicketsPage from '../../views/customer/CustomerTicketsPage';
import CustomerAccountPage from '../../views/customer/CustomerAccountPage';
import CustomerBuyPage from '../../views/customer/CustomerBuyPage';

// Providers
import GoogleMapsProvider from '../GoogleMapsProvider';

// ═══════════════════════════════════════════════════════════════════
// Keep-Alive Tab System
// ═══════════════════════════════════════════════════════════════════
// The 4 bottom-nav tabs are ALWAYS mounted in the DOM but hidden
// with CSS display:none when inactive. This eliminates the blank
// screen flicker because components never unmount/remount.
//
// Only "deep" routes (booking, tracking detail) use AnimatePresence
// for enter/exit transitions.
// ═══════════════════════════════════════════════════════════════════

const TAB_PATHS = ['/', '/my-tickets', '/buy', '/account'];

const AnimatedRoutes: React.FC = () => {
    const location = useLocation();
    const direction = useNavigationDirection();
    const currentPath = location.pathname;

    // Is the current route a "tab" route (one of the 4 bottom nav items)?
    const isTabRoute = TAB_PATHS.includes(currentPath);

    // Is there a "deep" route overlaying on top? (booking, tracking detail, etc.)
    const isDeepRoute = !isTabRoute;

    return (
        <Box sx={{ minHeight: '100dvh', background: '#F9FAFB' }}>
            {/* ═══ KEEP-ALIVE TABS ═══
                All 4 tab pages are always rendered. We toggle visibility
                with CSS display. This means they never unmount, so state,
                scroll position, and rendered content are preserved.
            */}
            <Box sx={{ display: currentPath === '/' && !isDeepRoute ? 'block' : 'none' }}>
                <CustomerLandingPage />
            </Box>
            <Box sx={{ display: currentPath === '/my-tickets' ? 'block' : 'none' }}>
                <CustomerTicketsPage />
            </Box>
            <Box sx={{ display: currentPath === '/buy' ? 'block' : 'none' }}>
                <CustomerBuyPage />
            </Box>
            <Box sx={{ display: currentPath === '/account' ? 'block' : 'none' }}>
                <CustomerAccountPage />
            </Box>

            {/* ═══ DEEP ROUTES — Animated ═══
                These overlay on top of the tabs and use AnimatePresence
                for smooth enter/exit transitions.
            */}
            <AnimatePresence mode="popLayout">
                {isDeepRoute && (
                    <PageTransition key={currentPath} direction={direction}>
                        <Routes location={location}>
                            <Route path="/book" element={
                                <GoogleMapsProvider><CustomerBookingPage /></GoogleMapsProvider>
                            } />
                            <Route path="/track" element={<CustomerTrackingPage />} />
                            <Route path="/track/:ticketNumber" element={<CustomerTrackingPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </PageTransition>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default AnimatedRoutes;
