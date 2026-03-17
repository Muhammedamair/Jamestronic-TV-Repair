import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, TextField, CircularProgress, Container, Card, CardActionArea, Dialog, InputAdornment, Divider } from '@mui/material';
import {
    LocationOn as LocationIcon,
    Search as SearchIcon,
    Person as PersonIcon,
    Star as StarIcon,
    Verified as VerifiedIcon,
    CheckCircle as CheckCircleIcon,
    ShoppingBag as ShopIcon,
    Close as CloseIcon,
    MyLocation as MyLocationIcon,
    AddLocationAlt as AddLocationIcon,
    Home as HomeIcon,
    Work as WorkIcon,
    Place as PlaceIcon,
    ArrowBack as BackIcon,
    Delete as DeleteIcon,
    MoreVert as MoreIcon,
    NavigationOutlined as NavIcon
} from '@mui/icons-material';
import { motion, useReducedMotion } from 'framer-motion';

import PWAInstallPrompt from '../../components/PWAInstallPrompt';

// Static local assets
import tvRepairImg from '../../assets/tvp.png';
import tvInstallationImg from '../../assets/install.png';
import tvUninstallationImg from '../../assets/removal.png';

const SERVICES = [
    { id: 'checkup', label: 'TV Check-up', image: '/services/tv_checkup.png', route: '/book?service=repair' },
    { id: 'installation', label: 'TV Installation', image: '/services/tv_installation.png', route: '/book?service=installation' },
    { id: 'uninstallation', label: 'TV Uninstallation', image: '/services/tv_uninstallation.png', route: '/book?service=uninstallation' },
    { id: 'screen_repair', label: 'Screen Repair', image: '/services/tv_screen_repair.png', route: '/book?service=repair' }
];

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface SavedAddress {
    id: string;
    label: string;       // "Home", "Work", or custom
    area: string;
    fullAddress: string;
    lat?: number;
    lng?: number;
}

// Reverse-geocode coordinates
async function reverseGeocode(lat: number, lng: number): Promise<{ area: string; city: string; fullAddress: string }> {
    try {
        const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results?.length) {
            const components = data.results[0].address_components || [];
            const fullAddress = data.results[0].formatted_address || '';
            let area = '', city = '', state = '';
            for (const c of components) {
                if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality')) area = c.long_name;
                if (c.types.includes('locality')) city = c.long_name;
                if (c.types.includes('administrative_area_level_1')) state = c.long_name;
            }
            if (!area && !city) {
                const parts = fullAddress.split(',').map((s: string) => s.trim());
                return { area: parts[0] || 'Your Location', city: parts[1] || '', fullAddress };
            }
            return { area: area || city, city: area ? `${city}, ${state}` : state, fullAddress };
        }
    } catch (e) {
        console.error('Reverse geocode failed:', e);
    }
    return { area: 'Your Location', city: '', fullAddress: '' };
}

// Search using Google Places Autocomplete for rich, Swiggy-like results (businesses, POIs, addresses)
async function searchPlaces(query: string): Promise<Array<{ area: string; fullAddress: string; placeId: string }>> {
    if (!query || query.length < 2) return [];

    // Prefer JavaScript SDK if Google Maps is loaded (gives rich autocomplete results)
    if (typeof google !== 'undefined' && google.maps?.places) {
        return new Promise((resolve) => {
            const service = new google.maps.places.AutocompleteService();
            service.getPlacePredictions(
                {
                    input: query,
                    componentRestrictions: { country: 'in' },
                    // Bias toward Hyderabad
                    locationBias: {
                        center: { lat: 17.385, lng: 78.4867 },
                        radius: 50000,
                    } as any,
                },
                (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                        resolve(
                            predictions.slice(0, 5).map((p) => ({
                                area: p.structured_formatting?.main_text || p.description.split(',')[0],
                                fullAddress: p.structured_formatting?.secondary_text || p.description,
                                placeId: p.place_id || '',
                            }))
                        );
                    } else {
                        resolve([]);
                    }
                }
            );
        });
    }

    // Fallback: use Geocoding REST API if Google Maps JS SDK isn't loaded
    try {
        const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', Hyderabad')}&key=${GOOGLE_MAPS_KEY}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results?.length) {
            return data.results.slice(0, 5).map((r: any) => {
                const components = r.address_components || [];
                let area = '';
                for (const c of components) {
                    if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality') || c.types.includes('locality')) {
                        area = c.long_name;
                        break;
                    }
                }
                return {
                    area: area || r.formatted_address.split(',')[0],
                    fullAddress: r.formatted_address,
                    placeId: r.place_id
                };
            });
        }
    } catch (e) {
        console.error('Search places fallback failed:', e);
    }
    return [];
}

const LABEL_ICONS: Record<string, React.ReactNode> = {
    'Home': <HomeIcon sx={{ fontSize: 22, color: '#5B4CF2' }} />,
    'Work': <WorkIcon sx={{ fontSize: 22, color: '#F59E0B' }} />,
    'Other': <PlaceIcon sx={{ fontSize: 22, color: '#10B981' }} />,
};

const CustomerLandingPage: React.FC = () => {
    const navigate = useNavigate();
    const shouldReduce = useReducedMotion();
    const [locationArea, setLocationArea] = useState<string>('');
    const [locationCity, setLocationCity] = useState<string>('');
    const [locating, setLocating] = useState(false);
    const [showLocationDialog, setShowLocationDialog] = useState(false);
    const [locError, setLocError] = useState<string | null>(null);

    // Saved addresses
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

    // Add new address flow
    const [addingAddress, setAddingAddress] = useState(false);
    const [newLabel, setNewLabel] = useState('Home');
    const [newAddressText, setNewAddressText] = useState('');

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{ area: string; fullAddress: string; placeId: string }>>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Show all saved addresses
    const [showAll, setShowAll] = useState(false);

    // Load saved data on mount
    useEffect(() => {
        const saved = localStorage.getItem('jt_customer_location');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setLocationArea(parsed.area || '');
                setLocationCity(parsed.city || '');
            } catch { /* ignore */ }
        }
        const addresses = localStorage.getItem('jt_saved_addresses');
        if (addresses) {
            try { setSavedAddresses(JSON.parse(addresses)); } catch { /* ignore */ }
        }
        const selId = localStorage.getItem('jt_selected_address_id');
        if (selId) setSelectedAddressId(selId);
    }, []);

    // Persist saved addresses
    const persistAddresses = (addrs: SavedAddress[], selId?: string | null) => {
        localStorage.setItem('jt_saved_addresses', JSON.stringify(addrs));
        setSavedAddresses(addrs);
        if (selId !== undefined) {
            if (selId) localStorage.setItem('jt_selected_address_id', selId);
            else localStorage.removeItem('jt_selected_address_id');
            setSelectedAddressId(selId);
        }
    };

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
                localStorage.setItem('jt_customer_location', JSON.stringify({ area: result.area, city: result.city }));
                setSelectedAddressId(null);
                localStorage.removeItem('jt_selected_address_id');
                setLocating(false);
                setShowLocationDialog(false);
            },
            (err) => {
                if (err.code === 1) setLocError('Location permission denied. Please enable location access in your browser settings.');
                else if (err.code === 2) setLocError('Unable to determine your location. Please check your GPS/network.');
                else setLocError('Location request timed out. Please try again.');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    // Select a saved address
    const selectAddress = (addr: SavedAddress) => {
        setLocationArea(addr.area);
        setLocationCity(addr.fullAddress);
        localStorage.setItem('jt_customer_location', JSON.stringify({ area: addr.area, city: addr.fullAddress }));
        persistAddresses(savedAddresses, addr.id);
        setShowLocationDialog(false);
    };

    // Add new address
    const handleAddAddress = () => {
        if (!newAddressText.trim()) return;
        const newAddr: SavedAddress = {
            id: Date.now().toString(),
            label: newLabel,
            area: newAddressText.split(',')[0]?.trim() || newAddressText,
            fullAddress: newAddressText.trim(),
        };
        const updated = [...savedAddresses, newAddr];
        persistAddresses(updated, newAddr.id);
        setLocationArea(newAddr.area);
        setLocationCity(newAddr.fullAddress);
        localStorage.setItem('jt_customer_location', JSON.stringify({ area: newAddr.area, city: newAddr.fullAddress }));
        setAddingAddress(false);
        setNewAddressText('');
        setNewLabel('Home');
        setShowLocationDialog(false);
    };

    // Delete saved address
    const deleteAddress = (id: string) => {
        const updated = savedAddresses.filter(a => a.id !== id);
        if (selectedAddressId === id) {
            persistAddresses(updated, null);
        } else {
            persistAddresses(updated);
        }
    };

    // Search handler with debounce
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (query.length < 3) { setSearchResults([]); return; }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            const results = await searchPlaces(query);
            setSearchResults(results);
            setSearching(false);
        }, 400);
    };

    // Select a search result
    const selectSearchResult = (result: { area: string; fullAddress: string }) => {
        setLocationArea(result.area);
        setLocationCity(result.fullAddress);
        localStorage.setItem('jt_customer_location', JSON.stringify({ area: result.area, city: result.fullAddress }));
        setSelectedAddressId(null);
        localStorage.removeItem('jt_selected_address_id');
        setSearchQuery('');
        setSearchResults([]);
        setShowLocationDialog(false);
    };

    const handleLocationTap = () => {
        setLocError(null);
        setAddingAddress(false);
        setSearchQuery('');
        setSearchResults([]);
        setShowAll(false);
        setShowLocationDialog(true);
    };

    const displayArea = locationArea || 'Select Location';
    const displayCity = locationCity || 'Tap to set your area';

    const visibleAddresses = showAll ? savedAddresses : savedAddresses.slice(0, 3);

    // ─── ADD ADDRESS SUB-VIEW ───
    const renderAddAddress = () => (
        <Box sx={{ p: 3, pt: 2 }}>
            <Box sx={{ width: 40, height: 5, borderRadius: 3, background: '#E5E7EB', mx: 'auto', mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <IconButton onClick={() => setAddingAddress(false)} size="small" sx={{ color: '#111827' }}>
                    <BackIcon />
                </IconButton>
                <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827' }}>
                    Add New Address
                </Typography>
            </Box>

            {/* Label Chips */}
            <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 600, mb: 1.5 }}>LABEL</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                {['Home', 'Work', 'Other'].map(lbl => (
                    <Box
                        key={lbl} onClick={() => setNewLabel(lbl)}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.2,
                            borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s',
                            border: newLabel === lbl ? '2px solid #5B4CF2' : '1.5px solid #E5E7EB',
                            background: newLabel === lbl ? '#F3F0FF' : '#FFF',
                        }}
                    >
                        {LABEL_ICONS[lbl]}
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: newLabel === lbl ? '#5B4CF2' : '#374151' }}>{lbl}</Typography>
                    </Box>
                ))}
            </Box>

            {/* Address Input */}
            <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 600, mb: 1 }}>FULL ADDRESS</Typography>
            <TextField
                fullWidth multiline rows={3} value={newAddressText}
                onChange={(e) => setNewAddressText(e.target.value)}
                placeholder="e.g. Flat 301, Ruby Manzil, Main Road, Friends Colony, Hyderabad"
                sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#F9FAFB', borderRadius: 3, color: '#111827', fontSize: '0.95rem',
                        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
                        '&:hover fieldset': { borderColor: '#D1D5DB' },
                        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
                    },
                }}
            />

            <Button
                fullWidth onClick={handleAddAddress} variant="contained"
                disabled={!newAddressText.trim()}
                sx={{
                    py: 1.5, borderRadius: 3, background: '#5B4CF2', fontWeight: 800, textTransform: 'none', fontSize: '1rem',
                    boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' },
                    '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' }
                }}
            >
                Save Address
            </Button>
        </Box>
    );

    // ─── MAIN LOCATION PICKER ───
    const renderLocationPicker = () => (
        <Box sx={{ p: 3, pt: 2 }}>
            {/* Drag handle */}
            <Box sx={{ width: 40, height: 5, borderRadius: 3, background: '#E5E7EB', mx: 'auto', mb: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: '#111827' }}>
                    Select your location
                </Typography>
                <IconButton onClick={() => setShowLocationDialog(false)} size="small" sx={{ color: '#6B7280' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Search Bar */}
            <TextField
                fullWidth value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search an area or address"
                InputProps={{ endAdornment: searching ? <CircularProgress size={18} sx={{ color: '#5B4CF2' }} /> : <SearchIcon sx={{ color: '#9CA3AF' }} /> }}
                sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#F9FAFB', borderRadius: 3, color: '#111827', fontSize: '0.95rem',
                        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
                        '&:hover fieldset': { borderColor: '#D1D5DB' },
                        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
                    },
                }}
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    {searchResults.map((result, i) => (
                        <Box
                            key={result.placeId || i}
                            onClick={() => selectSearchResult(result)}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 2, p: 2, cursor: 'pointer',
                                borderRadius: 3, transition: 'background 0.15s',
                                '&:hover': { background: '#F3F4F6' }, '&:active': { background: '#E5E7EB' }
                            }}
                        >
                            <PlaceIcon sx={{ color: '#EF4444', fontSize: 24 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{result.area}</Typography>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.fullAddress}</Typography>
                            </Box>
                        </Box>
                    ))}
                    <Divider sx={{ my: 1 }} />
                </Box>
            )}

            {/* Action Buttons Row */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                {/* Use Current Location */}
                <Box
                    onClick={locating ? undefined : detectLocation}
                    sx={{
                        minWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                        p: 2, borderRadius: 3, border: '1.5px solid #E5E7EB', cursor: locating ? 'default' : 'pointer',
                        background: '#FFF', transition: 'all 0.2s', flexShrink: 0,
                        '&:hover': { borderColor: '#D1D5DB', background: '#FAFAFA' },
                        '&:active': { background: '#F3F4F6' }
                    }}
                >
                    {locating
                        ? <CircularProgress size={24} sx={{ color: '#EF4444' }} />
                        : <MyLocationIcon sx={{ color: '#EF4444', fontSize: 28 }} />
                    }
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>
                        Use Current Location
                    </Typography>
                </Box>

                {/* Add New Address */}
                <Box
                    onClick={() => setAddingAddress(true)}
                    sx={{
                        minWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                        p: 2, borderRadius: 3, border: '1.5px solid #E5E7EB', cursor: 'pointer',
                        background: '#FFF', transition: 'all 0.2s', flexShrink: 0,
                        '&:hover': { borderColor: '#D1D5DB', background: '#FAFAFA' },
                        '&:active': { background: '#F3F4F6' }
                    }}
                >
                    <AddLocationIcon sx={{ color: '#5B4CF2', fontSize: 28 }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>
                        Add New Address
                    </Typography>
                </Box>
            </Box>

            {locError && (
                <Box sx={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 3, p: 2, mb: 2.5 }}>
                    <Typography sx={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>{locError}</Typography>
                </Box>
            )}

            {/* Saved Addresses */}
            {savedAddresses.length > 0 && (
                <Box>
                    <Typography sx={{ color: '#9CA3AF', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px', mb: 1.5 }}>
                        SAVED ADDRESSES
                    </Typography>
                    {visibleAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                            <Box
                                key={addr.id}
                                onClick={() => selectAddress(addr)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 1,
                                    borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s',
                                    border: isSelected ? '1.5px solid #10B981' : '1px solid #F3F4F6',
                                    background: isSelected ? '#F0FDF4' : '#FFF',
                                    '&:hover': { background: isSelected ? '#ECFDF5' : '#F9FAFB' },
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                                    {LABEL_ICONS[addr.label] || <PlaceIcon sx={{ fontSize: 22, color: '#6B7280' }} />}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography sx={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem' }}>{addr.label}</Typography>
                                        {isSelected && (
                                            <Box sx={{ background: '#D1FAE5', px: 1, py: 0.2, borderRadius: 1 }}>
                                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: '#065F46', letterSpacing: '0.5px' }}>SELECTED</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                    <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', mt: 0.3 }}>
                                        {addr.fullAddress}
                                    </Typography>
                                </Box>
                                <IconButton
                                    onClick={(e) => { e.stopPropagation(); deleteAddress(addr.id); }}
                                    size="small" sx={{ color: '#D1D5DB', '&:hover': { color: '#EF4444' } }}
                                >
                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Box>
                        );
                    })}
                    {savedAddresses.length > 3 && !showAll && (
                        <Button
                            onClick={() => setShowAll(true)} fullWidth
                            sx={{ color: '#5B4CF2', fontWeight: 700, textTransform: 'none', mt: 1 }}
                        >
                            View all ▾
                        </Button>
                    )}
                </Box>
            )}

            <Typography sx={{ mt: 3, color: '#9CA3AF', fontSize: '0.75rem', textAlign: 'center' }}>
                We use your location to check service availability in your area.
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100dvh', background: '#FFFFFF', pb: 14, overflowX: 'hidden', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' }}>
            <PWAInstallPrompt />

            {/* ════ LOCATION BOTTOM SHEET ════ */}
            <Dialog
                open={showLocationDialog}
                onClose={() => { setShowLocationDialog(false); setAddingAddress(false); }}
                fullWidth maxWidth="xs"
                PaperProps={{
                    sx: {
                        position: 'fixed', bottom: 0, m: 0, borderRadius: '24px 24px 0 0',
                        background: '#FFF', maxHeight: '80dvh', width: '100%',
                        overflowY: 'auto'
                    }
                }}
            >
                {addingAddress ? renderAddAddress() : renderLocationPicker()}
            </Dialog>
            
            {/* ════ TOP PURPLE BANNER AREA — ANIMATED ════ */}
            <Box sx={{ background: '#5B4CF2', pt: { xs: 3, sm: 4 }, pb: { xs: 5, sm: 6 }, px: { xs: 2.5, sm: 4 }, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ 
                    position: 'absolute', top: -100, right: -50, width: 250, height: 250, 
                    background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%'
                }} />
                
                <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative', zIndex: 1 }}>
                    {/* Header Row: Location, Profile */}
                    <motion.div
                        initial={shouldReduce ? false : { opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
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
                                    <Typography sx={{ 
                                        color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500,
                                        maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
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
                    </motion.div>

                    {/* Search Bar — spring slide up */}
                    <motion.div
                        initial={shouldReduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.15 }}
                    >
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
                    </motion.div>

                    {/* ═══ HERO PROMOTION — word-by-word stagger ═══ */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                            <motion.div
                                initial={shouldReduce ? false : { opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.35, delay: 0.25 }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Typography sx={{ color: '#FFF', fontStyle: 'italic', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
                                        JamesTronic <span style={{ color: '#A78BFA' }}>Care</span>
                                    </Typography>
                                    <motion.div
                                        animate={shouldReduce ? {} : {
                                            boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 8px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0)']
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                        style={{ borderRadius: '4px' }}
                                    >
                                        <Box sx={{ background: '#10B981', color: '#FFF', px: 1.2, py: 0.3, borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            10 mins
                                        </Box>
                                    </motion.div>
                                </Box>
                            </motion.div>

                            {/* Staggered word-by-word headline */}
                            <Box sx={{ mb: 1 }}>
                                {['Expert', 'TV', 'Repair', 'at'].map((word, i) => (
                                    <motion.span
                                        key={word + i}
                                        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.35 + i * 0.08 }}
                                        style={{ display: 'inline-block', marginRight: '8px' }}
                                    >
                                        <Typography component="span" sx={{ color: '#FFF', fontWeight: 800, fontSize: { xs: '1.8rem', sm: '2.2rem' }, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
                                            {word}
                                        </Typography>
                                    </motion.span>
                                ))}
                                <motion.span
                                    initial={shouldReduce ? false : { opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.7 }}
                                    style={{ display: 'inline-block' }}
                                >
                                    <Typography component="span" sx={{ color: '#FCD34D', fontWeight: 800, fontSize: { xs: '1.8rem', sm: '2.2rem' }, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
                                        ₹249*
                                    </Typography>
                                </motion.span>
                            </Box>

                            <motion.div
                                initial={shouldReduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.85, duration: 0.3 }}
                            >
                                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500 }}>
                                    * Valid for first 3 bookings • Zero visitation fee
                                </Typography>
                            </motion.div>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* ════ EXPLORE SERVICES GRID — STAGGERED POP ENTRANCE ════ */}
            <Container maxWidth="sm" sx={{ mt: 5 }}>
                <motion.div
                    initial={shouldReduce ? false : { opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.4 }}
                >
                    <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#111827', mb: 3, letterSpacing: '-0.3px', px: 1 }}>
                        Explore all services
                    </Typography>
                </motion.div>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1.5, sm: 3 }, px: 1 }}>
                    {SERVICES.map((svc, i) => (
                        <motion.div
                            key={svc.id}
                            initial={shouldReduce ? false : { opacity: 0, y: 25, scale: 0.85 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.5 + i * 0.1 }}
                        >
                            <CardActionArea 
                                onClick={() => navigate(svc.route)}
                                disableRipple
                                sx={{ 
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                    p: 0, transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    '&:hover': { transform: 'scale(1.05) translateY(-2px)' },
                                    '&:active': { transform: 'scale(0.95)' }
                                }}
                            >
                                <Box sx={{ 
                                    width: { xs: '85px', sm: '110px' }, 
                                    height: { xs: '85px', sm: '110px' }, 
                                    background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)', 
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    mb: 1.5, p: 2,
                                    border: '1.5px solid #FFFFFF',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.06), inset 0px -4px 10px rgba(0,0,0,0.04)'
                                }}>
                                    <img 
                                        src={svc.image} 
                                        alt={svc.label} 
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'contain', 
                                            filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.08))' 
                                        }} 
                                    />
                                </Box>
                                <Typography sx={{ 
                                    color: '#374151', fontSize: { xs: '0.75rem', sm: '0.85rem' }, 
                                    fontWeight: 700, textAlign: 'center', lineHeight: 1.25, letterSpacing: '-0.2px' 
                                }}>
                                    {svc.label}
                                </Typography>
                            </CardActionArea>
                        </motion.div>
                    ))}
                </Box>
            </Container>

            {/* ════ BRAND PROMISES / TRUST — FADE IN ════ */}
            <Container maxWidth="sm" sx={{ mt: 6 }}>
                <Box sx={{ px: 1 }}>
                    <motion.div
                        initial={shouldReduce ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.95 }}
                    >
                        <Card sx={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)', border: '1px solid #D1FAE5', borderRadius: 4, mb: 3, boxShadow: 'none' }}>
                            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                                <Box sx={{ p: 1.5, background: '#10B981', borderRadius: '50%', color: '#FFF', display: 'flex', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                                    <VerifiedIcon fontSize="medium" />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 800, color: '#065F46', fontSize: '1.1rem', mb: 0.5 }}>Up to 180 days warranty</Typography>
                                    <Typography sx={{ color: '#047857', fontSize: '0.85rem', fontWeight: 500 }}>Comprehensive protection on all TV parts & screen repairs.</Typography>
                                </Box>
                            </Box>
                        </Card>
                    </motion.div>

                    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, px: 0.5, mx: -0.5, '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                        <motion.div
                            initial={shouldReduce ? false : { opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: 1.05 }}
                            style={{ minWidth: 220, flexShrink: 0 }}
                        >
                            <Card sx={{ p: 2.5, borderRadius: 4, border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: '#FFF', height: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                    <Box sx={{ background: '#FEF3C7', p: 0.8, borderRadius: 2, color: '#D97706', display: 'flex' }}><StarIcon sx={{ fontSize: 20 }} /></Box>
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>4.8/5 Rating</Typography>
                                </Box>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4 }}>Trusted by over 1.1M customers in Hyderabad.</Typography>
                            </Card>
                        </motion.div>
                        <motion.div
                            initial={shouldReduce ? false : { opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: 1.15 }}
                            style={{ minWidth: 220, flexShrink: 0 }}
                        >
                            <Card sx={{ p: 2.5, borderRadius: 4, border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: '#FFF', height: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                    <Box sx={{ background: '#DBEAFE', p: 0.8, borderRadius: 2, color: '#2563EB', display: 'flex' }}><CheckCircleIcon sx={{ fontSize: 20 }} /></Box>
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Verified Techs</Typography>
                                </Box>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.4 }}>100% background checked & brand certified experts.</Typography>
                            </Card>
                        </motion.div>
                    </Box>
                </Box>
            </Container>

            {/* ════ BOTTOM NAVIGATION BAR — SLIDE UP ════ */}
            <motion.div
                initial={shouldReduce ? false : { y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 25, delay: 1.1 }}
                style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
            >
                <Box sx={{ 
                    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    borderTop: '1px solid rgba(0,0,0,0.08)',
                    display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
                    pt: 1.5, pb: { xs: 3, sm: 2 }
                }}>
                    <Box onClick={() => navigate('/')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#000' }}>
                        <Box sx={{ background: '#000', color: '#FFF', width: 26, height: 26, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem' }}>JT</Box>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 800 }}>JT</Typography>
                    </Box>
                    <Box onClick={() => navigate('/my-tickets')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                        <SearchIcon sx={{ fontSize: 26 }} />
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Track</Typography>
                    </Box>
                    <Box onClick={() => navigate('/buy')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                        <ShopIcon sx={{ fontSize: 26 }} />
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Buy</Typography>
                    </Box>
                    <Box onClick={() => navigate('/account')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                        <PersonIcon sx={{ fontSize: 26 }} />
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Account</Typography>
                    </Box>
                </Box>
            </motion.div>
        </Box>
    );
};

export default CustomerLandingPage;
