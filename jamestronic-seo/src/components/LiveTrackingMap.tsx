"use client";
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

// Vehicle emoji labels for clear visibility on map
const VEHICLE_EMOJI: Record<string, string> = {
    'Bike': '🏍️',
    'Auto': '🛺',
    'Mini Truck': '🚐',
    'Truck': '🚛',
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

    // Get vehicle emoji
    const vehicleEmoji = VEHICLE_EMOJI[vehicleType] || VEHICLE_EMOJI['Bike'];

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

                {/* Live transporter marker — Large circle with vehicle emoji */}
                {liveLat && liveLng && (
                    <Marker
                        position={{ lat: liveLat, lng: liveLng }}
                        label={{ text: vehicleEmoji, fontSize: '22px' }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#3B82F6',
                            fillOpacity: 1,
                            strokeColor: '#1D4ED8',
                            strokeWeight: 3,
                            scale: 22,
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
