import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Box, Typography, Chip } from '@mui/material';
import { MyLocation, Place, LocalShipping, Timer } from '@mui/icons-material';

interface LiveTrackingMapProps {
    pickupLat?: number | null;
    pickupLng?: number | null;
    dropLat?: number | null;
    dropLng?: number | null;
    liveLat?: number | null;
    liveLng?: number | null;
    height?: string | number;
    showRoute?: boolean;
    vehicleType?: 'Bike' | 'Auto' | 'Mini Truck' | 'Truck' | string;
}

const mapContainerStyle = {
    width: '100%',
    borderRadius: '12px',
};

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
    { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
    { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

// SVG path data for vehicle icons
const VEHICLE_SVG: Record<string, { path: string; scale: number; anchor: { x: number; y: number } }> = {
    'Bike': {
        path: 'M19.44,9.03L15.41,5H11v2h3.59l2,2H5c-2.8,0-5,2.2-5,5s2.2,5,5,5c2.46,0,4.45-1.69,4.9-4h1.65 l2.77-2.77c-.21.54-.32,1.14-.32,1.77c0,2.8,2.2,5,5,5s5-2.2,5-5C24,11.22,21.8,9.03,19.44,9.03z M7.82,15 C7.4,16.15,6.28,17,5,17c-1.63,0-3-1.37-3-3s1.37-3,3-3h8.8l-2.45,2.45C10.83,13.18,9.46,13,8.45,13L7.82,15z M19,19 c-1.66,0-3-1.34-3-3s1.34-3,3-3s3,1.34,3,3S20.66,19,19,19z',
        scale: 1.2,
        anchor: { x: 12, y: 12 },
    },
    'Auto': {
        path: 'M18.92,6.01C18.72,5.42,18.16,5,17.5,5h-11C5.84,5,5.29,5.42,5.08,6.01L3,12v8c0,0.55,0.45,1,1,1h1 c0.55,0,1-0.45,1-1v-1h12v1c0,0.55,0.45,1,1,1h1c0.55,0,1-0.45,1-1v-8L18.92,6.01z M6.5,16C5.67,16,5,15.33,5,14.5 S5.67,13,6.5,13S8,13.67,8,14.5S7.33,16,6.5,16z M17.5,16c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5 S18.33,16,17.5,16z M5,11l1.5-4.5h11L19,11H5z',
        scale: 1.3,
        anchor: { x: 12, y: 12 },
    },
    'Mini Truck': {
        path: 'M20,8h-3V4H3C1.9,4,1,4.9,1,6v11h2c0,1.66,1.34,3,3,3s3-1.34,3-3h6c0,1.66,1.34,3,3,3s3-1.34,3-3h2v-5 L20,8z M6,18.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S6.83,18.5,6,18.5z M18,18.5 c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S18.83,18.5,18,18.5z M17,12V9.5h2.5l1.96,2.5H17z',
        scale: 1.3,
        anchor: { x: 12, y: 12 },
    },
    'Truck': {
        path: 'M20,8h-3V4H3C1.9,4,1,4.9,1,6v11h2c0,1.66,1.34,3,3,3s3-1.34,3-3h6c0,1.66,1.34,3,3,3s3-1.34,3-3h2v-5 L20,8z M6,18.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S6.83,18.5,6,18.5z M18,18.5 c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S18.83,18.5,18,18.5z M17,12V9.5h2.5l1.96,2.5H17z',
        scale: 1.4,
        anchor: { x: 12, y: 12 },
    },
};

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    liveLat,
    liveLng,
    height = 350,
    showRoute = true,
    vehicleType = 'Bike',
}) => {
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const [distance, setDistance] = useState<string | null>(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

    // Default center: Hyderabad
    const defaultCenter = { lat: 17.385, lng: 78.4867 };

    useEffect(() => {
        const check = () => {
            if (window.google && window.google.maps) {
                setIsGoogleLoaded(true);
            } else {
                setTimeout(check, 500);
            }
        };
        check();
    }, []);

    // Calculate route when we have origin and destination
    useEffect(() => {
        if (!isGoogleLoaded || !showRoute) return;

        const origin = liveLat && liveLng
            ? { lat: liveLat, lng: liveLng }
            : pickupLat && pickupLng
                ? { lat: pickupLat, lng: pickupLng }
                : null;

        const destination = dropLat && dropLng
            ? { lat: dropLat, lng: dropLng }
            : null;

        if (!origin || !destination) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
            {
                origin,
                destination,
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    setDirections(result);
                    const leg = result.routes[0]?.legs[0];
                    if (leg) {
                        setEta(leg.duration?.text || null);
                        setDistance(leg.distance?.text || null);
                    }
                }
            }
        );
    }, [isGoogleLoaded, pickupLat, pickupLng, dropLat, dropLng, liveLat, liveLng, showRoute]);

    if (!isGoogleLoaded) {
        return (
            <Box sx={{
                height,
                borderRadius: 3,
                bgcolor: 'rgba(26, 34, 53, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Typography color="text.secondary">Loading map...</Typography>
            </Box>
        );
    }

    const center = liveLat && liveLng
        ? { lat: liveLat, lng: liveLng }
        : pickupLat && pickupLng
            ? { lat: pickupLat, lng: pickupLng }
            : defaultCenter;

    // Get vehicle icon config
    const vehicleConfig = VEHICLE_SVG[vehicleType] || VEHICLE_SVG['Bike'];

    return (
        <Box sx={{ position: 'relative' }}>
            <GoogleMap
                mapContainerStyle={{ ...mapContainerStyle, height }}
                center={center}
                zoom={13}
                options={{
                    styles: darkMapStyle,
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                }}
            >
                {/* Pickup marker */}
                {pickupLat && pickupLng && (
                    <Marker
                        position={{ lat: pickupLat, lng: pickupLng }}
                        label={{ text: 'P', color: '#fff', fontWeight: '700', fontSize: '11px' }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#F59E0B',
                            fillOpacity: 1,
                            strokeColor: '#fff',
                            strokeWeight: 2,
                            scale: 16,
                        }}
                    />
                )}

                {/* Drop marker */}
                {dropLat && dropLng && (
                    <Marker
                        position={{ lat: dropLat, lng: dropLng }}
                        label={{ text: 'D', color: '#fff', fontWeight: '700', fontSize: '11px' }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#10B981',
                            fillOpacity: 1,
                            strokeColor: '#fff',
                            strokeWeight: 2,
                            scale: 16,
                        }}
                    />
                )}

                {/* Live transporter marker — Vehicle Icon */}
                {liveLat && liveLng && (
                    <Marker
                        position={{ lat: liveLat, lng: liveLng }}
                        icon={{
                            path: vehicleConfig.path,
                            fillColor: '#3B82F6',
                            fillOpacity: 1,
                            strokeColor: '#1E3A5F',
                            strokeWeight: 1.5,
                            scale: vehicleConfig.scale,
                            anchor: new google.maps.Point(vehicleConfig.anchor.x, vehicleConfig.anchor.y),
                        }}
                        zIndex={999}
                    />
                )}

                {/* Route line */}
                {directions && (
                    <DirectionsRenderer
                        directions={directions}
                        options={{
                            suppressMarkers: true,
                            polylineOptions: {
                                strokeColor: '#6C63FF',
                                strokeWeight: 5,
                                strokeOpacity: 0.85,
                            },
                        }}
                    />
                )}
            </GoogleMap>

            {/* ETA + Distance overlay */}
            {(eta || distance) && (
                <Box sx={{
                    position: 'absolute', top: 12, left: 12,
                    display: 'flex', gap: 1,
                }}>
                    {eta && (
                        <Chip
                            icon={<Timer sx={{ fontSize: 16 }} />}
                            label={eta}
                            size="small"
                            sx={{
                                background: 'rgba(15, 23, 42, 0.9)',
                                backdropFilter: 'blur(8px)',
                                color: '#F59E0B',
                                fontWeight: 700,
                                border: '1px solid rgba(245,158,11,0.3)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                '& .MuiChip-icon': { color: '#F59E0B' },
                            }}
                        />
                    )}
                    {distance && (
                        <Chip
                            label={distance}
                            size="small"
                            sx={{
                                background: 'rgba(15, 23, 42, 0.9)',
                                backdropFilter: 'blur(8px)',
                                color: '#6C63FF',
                                fontWeight: 700,
                                border: '1px solid rgba(108,99,255,0.3)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            }}
                        />
                    )}
                </Box>
            )}
        </Box>
    );
};

export default LiveTrackingMap;
