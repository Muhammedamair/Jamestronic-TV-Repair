import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Box, Typography, Chip } from '@mui/material';
import { MyLocation, Place, LocalShipping } from '@mui/icons-material';

interface LiveTrackingMapProps {
    pickupLat?: number | null;
    pickupLng?: number | null;
    dropLat?: number | null;
    dropLng?: number | null;
    liveLat?: number | null;
    liveLng?: number | null;
    height?: string | number;
    showRoute?: boolean;
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

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    liveLat,
    liveLng,
    height = 350,
    showRoute = true,
}) => {
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [eta, setEta] = useState<string | null>(null);
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
                        setEta(`${leg.duration?.text} (${leg.distance?.text})`);
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
                        label={{ text: 'P', color: '#fff', fontWeight: '700' }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#F59E0B',
                            fillOpacity: 1,
                            strokeColor: '#fff',
                            strokeWeight: 2,
                            scale: 14,
                        }}
                    />
                )}

                {/* Drop marker */}
                {dropLat && dropLng && (
                    <Marker
                        position={{ lat: dropLat, lng: dropLng }}
                        label={{ text: 'D', color: '#fff', fontWeight: '700' }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#10B981',
                            fillOpacity: 1,
                            strokeColor: '#fff',
                            strokeWeight: 2,
                            scale: 14,
                        }}
                    />
                )}

                {/* Live transporter marker */}
                {liveLat && liveLng && (
                    <Marker
                        position={{ lat: liveLat, lng: liveLng }}
                        icon={{
                            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                            fillColor: '#3B82F6',
                            fillOpacity: 1,
                            strokeColor: '#fff',
                            strokeWeight: 2,
                            scale: 7,
                            rotation: 0,
                        }}
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
                                strokeWeight: 4,
                                strokeOpacity: 0.8,
                            },
                        }}
                    />
                )}
            </GoogleMap>

            {/* ETA overlay */}
            {eta && (
                <Chip
                    icon={<LocalShipping sx={{ fontSize: 16 }} />}
                    label={eta}
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        color: '#E2E8F0',
                        fontWeight: 700,
                        border: '1px solid rgba(108,99,255,0.3)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                />
            )}
        </Box>
    );
};

export default LiveTrackingMap;
