import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Box } from '@mui/material';
import PageTransition from './PageTransition';
import { useNavigationDirection } from '../../hooks/useNavigationDirection';

// Customer pages
import CustomerLandingPage from '../../pages/customer/CustomerLandingPage';
import CustomerBookingPage from '../../pages/customer/CustomerBookingPage';
import CustomerTrackingPage from '../../pages/customer/CustomerTrackingPage';
import CustomerTicketsPage from '../../pages/customer/CustomerTicketsPage';
import CustomerAccountPage from '../../pages/customer/CustomerAccountPage';
import CustomerBuyPage from '../../pages/customer/CustomerBuyPage';

// Providers
import GoogleMapsProvider from '../GoogleMapsProvider';

const AnimatedRoutes: React.FC = () => {
    const location = useLocation();
    const direction = useNavigationDirection();

    return (
        <Box sx={{
            minHeight: '100dvh',
            background: '#F9FAFB',   // Always white — prevents dark theme bleed
        }}>
            <AnimatePresence mode="popLayout" custom={direction}>
                <PageTransition key={location.pathname} direction={direction}>
                    <Routes location={location}>
                        <Route path="/" element={<CustomerLandingPage />} />
                        <Route path="/book" element={
                            <GoogleMapsProvider><CustomerBookingPage /></GoogleMapsProvider>
                        } />
                        <Route path="/track" element={<CustomerTrackingPage />} />
                        <Route path="/track/:ticketNumber" element={<CustomerTrackingPage />} />
                        <Route path="/my-tickets" element={<CustomerTicketsPage />} />
                        <Route path="/account" element={<CustomerAccountPage />} />
                        <Route path="/buy" element={<CustomerBuyPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </PageTransition>
            </AnimatePresence>
        </Box>
    );
};

export default AnimatedRoutes;
