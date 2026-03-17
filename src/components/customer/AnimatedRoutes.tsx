import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
        <AnimatePresence mode="wait" custom={direction}>
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={
                    <PageTransition direction={direction}>
                        <CustomerLandingPage />
                    </PageTransition>
                } />
                <Route path="/book" element={
                    <PageTransition direction={direction}>
                        <GoogleMapsProvider><CustomerBookingPage /></GoogleMapsProvider>
                    </PageTransition>
                } />
                <Route path="/track" element={
                    <PageTransition direction={direction}>
                        <CustomerTrackingPage />
                    </PageTransition>
                } />
                <Route path="/track/:ticketNumber" element={
                    <PageTransition direction={direction}>
                        <CustomerTrackingPage />
                    </PageTransition>
                } />
                <Route path="/my-tickets" element={
                    <PageTransition direction={direction}>
                        <CustomerTicketsPage />
                    </PageTransition>
                } />
                <Route path="/account" element={
                    <PageTransition direction={direction}>
                        <CustomerAccountPage />
                    </PageTransition>
                } />
                <Route path="/buy" element={
                    <PageTransition direction={direction}>
                        <CustomerBuyPage />
                    </PageTransition>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AnimatePresence>
    );
};

export default AnimatedRoutes;
