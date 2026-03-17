import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Box, CircularProgress, Typography } from '@mui/material';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const libraries: ('places' | 'geometry' | 'drawing')[] = ['places'];

interface GoogleMapsProviderProps {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries,
    });

    if (!GOOGLE_MAPS_API_KEY) {
        console.warn('[GoogleMaps] No API key found in VITE_GOOGLE_MAPS_API_KEY');
        return <>{children}</>;
    }

    if (loadError) {
        console.error('[GoogleMaps] Load error:', loadError);
        // Don't crash the entire app — just render children without Maps
        return <>{children}</>;
    }

    if (!isLoaded) {
        return (
            <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress sx={{ color: '#5B4CF2', mb: 2 }} />
                    <Typography sx={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading...</Typography>
                </Box>
            </Box>
        );
    }

    return <>{children}</>;
};

export default GoogleMapsProvider;
