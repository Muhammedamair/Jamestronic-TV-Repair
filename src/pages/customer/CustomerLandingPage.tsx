import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Container, Card, CardActionArea,
    IconButton, CircularProgress, Dialog, DialogContent, Button
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Search as SearchIcon,
    CheckCircle as CheckCircleIcon,
    Verified as VerifiedIcon,
    Star as StarIcon,
    Person as PersonIcon,
    MyLocation as MyLocationIcon,
    Close as CloseIcon,
    GpsFixed as GpsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PWAInstallPrompt from '../../components/PWAInstallPrompt';

const SERVICES = [
    { id: 'checkup', label: 'TV Check-up', image: '/services/tv_checkup.png', route: '/book?service=repair' },
    { id: 'installation', label: 'TV Installation', image: '/services/tv_installation.png', route: '/book?service=installation' },
    { id: 'uninstallation', label: 'Wall Unmount', image: '/services/tv_uninstallation.png', route: '/book?service=uninstallation' },
    { id: 'screen_repair', label: 'Screen Repair', image: '/services/tv_screen_repair.png', route: '/book?service=repair' }
];

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Reverse-geocode coordinates to a human-readable address using Google Geocoding API
async function reverseGeocode(lat: number, lng: number): Promise<{ area: string; city: string }> {
    try {
        const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results?.length) {
            // Try to extract a meaningful locality
            const components = data.results[0].address_components || [];
            let area = '', city = '', state = '';
            for (const c of components) {
                if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality')) area = c.long_name;
                if (c.types.includes('locality')) city = c.long_name;
                if (c.types.includes('administrative_area_level_1')) state = c.long_name;
            }
            // Fallback: use the formatted address
            if (!area && !city) {
                const formatted = data.results[0].formatted_address || '';
                const parts = formatted.split(',').map((s: string) => s.trim());
                return { area: parts[0] || 'Your Location', city: parts[1] || '' };
            }
            return { area: area || city, city: area ? `${city}, ${state}` : state };
        }
    } catch (e) {
        console.error('Reverse geocode failed:', e);
    }
    return { area: 'Your Location', city: '' };
}

const CustomerLandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [locationArea, setLocationArea] = useState<string>('');
    const [locationCity, setLocationCity] = useState<string>('');
    const [locating, setLocating] = useState(false);
    const [showLocationDialog, setShowLocationDialog] = useState(false);
    const [locError, setLocError] = useState<string | null>(null);

    // On mount, check if we previously saved a location
    useEffect(() => {
        const saved = localStorage.getItem('jt_customer_location');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setLocationArea(parsed.area || '');
                setLocationCity(parsed.city || '');
            } catch { /* ignore */ }
        }
    }, []);

    const detectLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocError('Geolocation is not supported by your browser.');
            return;
        }
        setLocating(true);
        setLocError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const result = await reverseGeocode(latitude, longitude);
                setLocationArea(result.area);
                setLocationCity(result.city);
                localStorage.setItem('jt_customer_location', JSON.stringify(result));
                setLocating(false);
                setShowLocationDialog(false);
            },
            (err) => {
                console.error('Geolocation error:', err);
                if (err.code === 1) {
                    setLocError('Location permission denied. Please enable location access in your browser settings and try again.');
                } else if (err.code === 2) {
                    setLocError('Unable to determine your location. Please check your GPS/network connection.');
                } else {
                    setLocError('Location request timed out. Please try again.');
                }
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    const handleLocationTap = () => {
        setLocError(null);
        setShowLocationDialog(true);
    };

    const displayArea = locationArea || 'Select Location';
    const displayCity = locationCity || 'Tap to set your area';

    return (
        <Box sx={{ minHeight: '100dvh', background: '#FFFFFF', pb: 14, overflowX: 'hidden', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}>
            <PWAInstallPrompt />

            {/* ════ LOCATION BOTTOM SHEET DIALOG ════ */}
            <Dialog
                open={showLocationDialog}
                onClose={() => setShowLocationDialog(false)}
                fullWidth maxWidth="xs"
                PaperProps={{
                    sx: {
                        position: 'fixed', bottom: 0, m: 0, borderRadius: '24px 24px 0 0',
                        background: '#FFF', maxHeight: '60dvh', width: '100%'
                    }
                }}
            >
                <DialogContent sx={{ p: 3, pt: 2 }}>
                    {/* Drag handle */}
                    <Box sx={{ width: 40, height: 5, borderRadius: 3, background: '#E5E7EB', mx: 'auto', mb: 3 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: '#111827' }}>
                            Set Your Location
                        </Typography>
                        <IconButton onClick={() => setShowLocationDialog(false)} size="small" sx={{ color: '#6B7280' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Use Current Location Button */}
                    <Button
                        fullWidth
                        onClick={detectLocation}
                        disabled={locating}
                        startIcon={locating ? <CircularProgress size={20} sx={{ color: '#5B4CF2' }} /> : <MyLocationIcon />}
                        sx={{
                            py: 2, background: '#F3F0FF', color: '#5B4CF2', fontWeight: 700, textTransform: 'none',
                            fontSize: '1rem', borderRadius: 3, mb: 2, border: '1.5px solid #E0D4FC',
                            '&:hover': { background: '#EDE9FE' },
                            '&.Mui-disabled': { background: '#F9FAFB', color: '#9CA3AF', borderColor: '#E5E7EB' }
                        }}
                    >
                        {locating ? 'Detecting your location...' : 'Use Current Location'}
                    </Button>

                    {locError && (
                        <Box sx={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 3, p: 2, mb: 2 }}>
                            <Typography sx={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
                                {locError}
                            </Typography>
                        </Box>
                    )}

                    {/* Current detected location */}
                    {locationArea && (
                        <Box sx={{ 
                            background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 3, p: 2.5, 
                            display: 'flex', alignItems: 'center', gap: 2 
                        }}>
                            <GpsIcon sx={{ color: '#10B981', fontSize: 28 }} />
                            <Box>
                                <Typography sx={{ fontWeight: 700, color: '#065F46', fontSize: '1rem' }}>{locationArea}</Typography>
                                {locationCity && <Typography sx={{ color: '#047857', fontSize: '0.8rem' }}>{locationCity}</Typography>}
                            </Box>
                        </Box>
                    )}

                    <Typography sx={{ mt: 3, color: '#9CA3AF', fontSize: '0.75rem', textAlign: 'center' }}>
                        We use your location to check service availability in your area.
                    </Typography>
                </DialogContent>
            </Dialog>
            
            {/* ════ TOP PURPLE BANNER AREA ════ */}
            <Box sx={{ background: '#5B4CF2', pt: { xs: 3, sm: 4 }, pb: { xs: 5, sm: 6 }, px: { xs: 2.5, sm: 4 }, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ 
                    position: 'absolute', top: -100, right: -50, width: 250, height: 250, 
                    background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%'
                }} />
                
                <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative', zIndex: 1 }}>
                    {/* Header Row: Location, Profile */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5 }}>
                        <Box 
                            onClick={handleLocationTap}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:active': { opacity: 0.7 } }}
                        >
                            <Box sx={{ 
                                background: 'rgba(255,255,255,0.2)', p: 0.8, borderRadius: '50%', display: 'flex',
                                animation: !locationArea ? 'pulse 2s ease-in-out infinite' : 'none',
                                '@keyframes pulse': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.12)' } }
                            }}>
                                <LocationIcon sx={{ color: '#FFF', fontSize: 26 }} />
                            </Box>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#FFF' }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
                                        {displayArea}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.9rem', ml: 0.5 }}>▾</Typography>
                                </Box>
                                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500 }}>
                                    {displayCity}
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton 
                            onClick={() => navigate('/my-tickets')}
                            sx={{ background: 'rgba(255,255,255,0.15)', color: '#FFF', '&:hover': { background: 'rgba(255,255,255,0.25)' } }}
                        >
                            <PersonIcon />
                        </IconButton>
                    </Box>

                    {/* Search Bar */}
                    <Box 
                        onClick={() => navigate('/book')}
                        sx={{
                            background: '#FFF', borderRadius: 4, mb: 4, p: 0.5,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                            display: 'flex', alignItems: 'center', cursor: 'text'
                        }}
                    >
                        <Box sx={{ pl: 2, display: 'flex', alignItems: 'center', flex: 1 }}>
                            <SearchIcon sx={{ color: '#9CA3AF', fontSize: 22, mr: 1.5 }} />
                            <Typography sx={{ color: '#6B7280', fontSize: '1rem', fontWeight: 500, py: 1.5 }}>
                                Search for 'TV Repair'
                            </Typography>
                        </Box>
                    </Box>

                    {/* Hero Promotion */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Typography sx={{ color: '#FFF', fontStyle: 'italic', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
                                    JamesTronic <span style={{ color: '#A78BFA' }}>Care</span>
                                </Typography>
                                <Box sx={{ background: '#10B981', color: '#FFF', px: 1.2, py: 0.3, borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    10 mins
                                </Box>
                            </Box>
                            <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: { xs: '1.8rem', sm: '2.2rem' }, mb: 1, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
                                Expert TV Repair at <span style={{ color: '#FCD34D' }}>₹249*</span>
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500 }}>
                                * Valid for first 3 bookings • Zero visitation fee
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* ════ EXPLORE SERVICES GRID ════ */}
            <Container maxWidth="sm" sx={{ mt: 5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#111827', mb: 3, letterSpacing: '-0.3px', px: 1 }}>
                    Explore all services
                </Typography>

                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: 2.5, px: 1 
                }}>
                    {SERVICES.map((svc) => (
                        <Box key={svc.id}>
                            <CardActionArea 
                                onClick={() => navigate(svc.route)}
                                sx={{ 
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                    p: 0, borderRadius: 4, transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': { transform: 'scale(1.03) translateY(-4px)' }
                                }}
                            >
                                <Box sx={{ 
                                    width: '100%', 
                                    aspectRatio: '1/1',
                                    background: '#F9FAFB',
                                    borderRadius: 4,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    mb: 1.5,
                                    p: 1.5,
                                    boxShadow: 'inset 0px -4px 12px rgba(0,0,0,0.02), 0 4px 10px rgba(0,0,0,0.03)',
                                    border: '1px solid #F3F4F6'
                                }}>
                                    <img 
                                        src={svc.image} 
                                        alt={svc.label} 
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.1))' }} 
                                    />
                                </Box>
                                <Typography sx={{ 
                                    color: '#374151', fontSize: '0.8rem', fontWeight: 700, 
                                    textAlign: 'center', lineHeight: 1.3, letterSpacing: '-0.2px'
                                }}>
                                    {svc.label}
                                </Typography>
                            </CardActionArea>
                        </Box>
                    ))}
                </Box>
            </Container>

            {/* ════ BRAND PROMISES / TRUST ════ */}
            <Container maxWidth="sm" sx={{ mt: 6 }}>
                <Box sx={{ px: 1 }}>
                    <Card sx={{ 
                        background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)', 
                        border: '1px solid #D1FAE5', borderRadius: 4, mb: 3, boxShadow: 'none' 
                    }}>
                        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                            <Box sx={{ p: 1.5, background: '#10B981', borderRadius: '50%', color: '#FFF', display: 'flex', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                                <VerifiedIcon fontSize="medium" />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: '#065F46', fontSize: '1.1rem', mb: 0.5, letterSpacing: '-0.2px' }}>
                                    Up to 180 days warranty
                                </Typography>
                                <Typography sx={{ color: '#047857', fontSize: '0.85rem', fontWeight: 500 }}>
                                    Comprehensive protection on all TV parts & screen repairs.
                                </Typography>
                            </Box>
                        </Box>
                    </Card>

                    <Box sx={{ 
                        display: 'flex', gap: 2, overflowX: 'auto', pb: 2, px: 0.5, mx: -0.5,
                        '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' 
                    }}>
                        <Card sx={{ minWidth: 220, flexShrink: 0, p: 2.5, borderRadius: 4, border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: '#FFF' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                <Box sx={{ background: '#FEF3C7', p: 0.8, borderRadius: 2, color: '#D97706', display: 'flex' }}>
                                    <StarIcon sx={{ fontSize: 20 }} />
                                </Box>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>4.8/5 Rating</Typography>
                            </Box>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4 }}>Trusted by over 1.1M customers in Hyderabad.</Typography>
                        </Card>
                        
                        <Card sx={{ minWidth: 220, flexShrink: 0, p: 2.5, borderRadius: 4, border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: '#FFF' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                <Box sx={{ background: '#DBEAFE', p: 0.8, borderRadius: 2, color: '#2563EB', display: 'flex' }}>
                                    <CheckCircleIcon sx={{ fontSize: 20 }} />
                                </Box>
                                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Verified Techs</Typography>
                            </Box>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4 }}>100% background checked & brand certified experts.</Typography>
                        </Card>
                    </Box>
                </Box>
            </Container>

            {/* ════ BOTTOM NAVIGATION BAR ════ */}
            <Box sx={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
                pt: 1.5, pb: { xs: 3, sm: 2 }, zIndex: 1000
            }}>
                <Box onClick={() => navigate('/')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#000' }}>
                    <Box sx={{ 
                        background: '#000', color: '#FFF', width: 26, height: 26, borderRadius: '6px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem'
                    }}>JT</Box>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800 }}>JT</Typography>
                </Box>
                <Box onClick={() => navigate('/my-tickets')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                    <SearchIcon sx={{ fontSize: 26 }} />
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Track</Typography>
                </Box>
                <Box onClick={() => navigate('/book')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                    <LocationIcon sx={{ fontSize: 26 }} />
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Book</Typography>
                </Box>
                <Box onClick={() => navigate('/my-tickets')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                    <PersonIcon sx={{ fontSize: 26 }} />
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Account</Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default CustomerLandingPage;
