import React from 'react';
import { LoadScript } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const libraries: ('places' | 'geometry' | 'drawing')[] = ['places'];

interface GoogleMapsProviderProps {
    children: React.ReactNode;
}

const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
    if (!GOOGLE_MAPS_API_KEY) {
        console.warn('[GoogleMaps] No API key found in VITE_GOOGLE_MAPS_API_KEY');
        return <>{children}</>;
    }

    return (
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
            {children}
        </LoadScript>
    );
};

export default GoogleMapsProvider;
