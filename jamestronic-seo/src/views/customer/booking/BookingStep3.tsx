"use client";
import React, { useState, useRef } from 'react';
import { Box, Typography, TextField, Button, Chip } from '@mui/material';
import {
    MyLocation as MyLocationIcon,
    LocationOn as LocationIcon,
    CheckCircle as CheckIcon,
    Search as SearchIcon,
    Place as PlaceIcon,
    NearMe as NearMeIcon
} from '@mui/icons-material';
import { CircularProgress, Divider } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Search using Google Places Autocomplete 
async function searchPlaces(query: string): Promise<Array<{ area: string; fullAddress: string; placeId: string }>> {
    if (!query || query.length < 2) return [];
    if (typeof google !== 'undefined' && google.maps?.places) {
        return new Promise((resolve) => {
            const service = new google.maps.places.AutocompleteService();
            service.getPlacePredictions({ input: query, componentRestrictions: { country: 'in' }, locationBias: { center: { lat: 17.385, lng: 78.4867 }, radius: 50000 } as any },
                (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                        resolve(predictions.slice(0, 5).map(p => ({ area: p.structured_formatting?.main_text || p.description.split(',')[0], fullAddress: p.structured_formatting?.secondary_text || p.description, placeId: p.place_id || '' })));
                    } else resolve([]);
                }
            );
        });
    }
    // Fallback Geocoding REST API
    try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', Hyderabad')}&key=${GOOGLE_MAPS_KEY}`);
        const data = await res.json();
        if (data.status === 'OK' && data.results?.length) {
            return data.results.slice(0, 5).map((r: any) => {
                const components = r.address_components || [];
                let area = '';
                for (const c of components) { if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality') || c.types.includes('locality')) { area = c.long_name; break; } }
                return { area: area || r.formatted_address.split(',')[0], fullAddress: r.formatted_address, placeId: r.place_id };
            });
        }
    } catch (e) {}
    return [];
}

// Clean Light Theme Inputs
const lightTextFieldStyle = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#F9FAFB', borderRadius: 2.5, color: '#111827', fontSize: '1rem',
        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
        '&:hover fieldset': { borderColor: '#D1D5DB' },
        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
    },
};

interface BookingStep3Props {
    form: {
        address: string;
        lat: number;
        lng: number;
        serviceType: string;
        tvBrand: string;
        tvSize: string;
        issueDescription: string;
        bracketStatus: string;
    };
    updateField: (field: string, value: any) => void;
    handleGetCurrentLocation: () => void;
}

const BookingStep3: React.FC<BookingStep3Props> = ({ form, updateField, handleGetCurrentLocation }) => {
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [locating, setLocating] = useState(false);
    const searchTimeout = useRef<any>(null);

    const handleAddressTyping = (text: string) => {
        updateField('address', text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (text.length < 3) { setSearchResults([]); return; }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            const results = await searchPlaces(text);
            setSearchResults(results);
            setSearching(false);
        }, 400);
    };

    const selectSearchResult = (result: any) => {
        updateField('address', result.fullAddress);
        setSearchResults([]);
    };

    const handleGPSClick = async () => {
        setLocating(true);
        try {
            await handleGetCurrentLocation();
            setTimeout(() => setLocating(false), 1500); // give enough time for text to show up
        } catch (e) {
            setLocating(false);
        }
    };

    return (
        <>
            {/* ═══ BOOKING SUMMARY ═══ */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Box sx={{ p: 2, background: '#F8FAFC', borderRadius: 3, mb: 4, border: '1px solid #E2E8F0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#1E293B', mb: 1.5, letterSpacing: '-0.2px' }}>
                        Booking Summary
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>Service</Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', textTransform: 'capitalize' }}>
                                {form.serviceType}
                            </Typography>
                        </Box>
                        {form.serviceType === 'repair' && form.issueDescription && (
                            <Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>Issue</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {form.issueDescription}
                                </Typography>
                            </Box>
                        )}
                        {form.serviceType === 'installation' && form.bracketStatus && (
                            <Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>Bracket</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {form.bracketStatus}
                                </Typography>
                            </Box>
                        )}
                        <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>TV Brand</Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                                {form.tvBrand || 'Not provided'}
                            </Typography>
                        </Box>
                        {form.tvSize && (
                            <Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>Size</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                                    {form.tvSize}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </motion.div>

            {/* Show pre-filled location if available */}
            <AnimatePresence>
                {form.address && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                        <Box sx={{ 
                            background: '#F0FDF4', border: '1.5px solid #D1FAE5', borderRadius: 3, 
                            p: 2.5, mb: 3, display: 'flex', alignItems: 'center', gap: 2,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
                        }}>
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                            >
                                <Box sx={{ p: 1, background: '#10B981', borderRadius: '50%', color: '#FFF', display: 'flex' }}>
                                    <LocationIcon sx={{ fontSize: 22 }} />
                                </Box>
                            </motion.div>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, color: '#065F46', fontSize: '0.8rem', mb: 0.3 }}>
                                    📍 Auto-filled from your location
                                </Typography>
                                <Typography sx={{ color: '#047857', fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {form.address}
                                </Typography>
                            </Box>
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                    fullWidth variant="outlined" 
                    startIcon={locating ? <CircularProgress size={16} sx={{ color: '#5B4CF2' }} /> : <MyLocationIcon />} 
                    onClick={handleGPSClick}
                    disabled={locating}
                    sx={{
                        mb: 3, py: 1.5, borderRadius: 3, color: '#5B4CF2', borderColor: 'rgba(91,76,242,0.3)',
                        textTransform: 'none', fontWeight: 700, fontSize: '0.95rem',
                        background: locating ? 'rgba(91,76,242,0.05)' : 'transparent',
                        '&:hover': { borderColor: '#5B4CF2', backgroundColor: 'rgba(91,76,242,0.05)' }
                    }}
                >
                    {locating ? 'Finding you securely...' : (form.address ? 'Refresh Location via GPS' : 'Use My Current Location')}
                </Button>
            </motion.div>

            <Typography sx={{ color: '#9CA3AF', textAlign: 'center', fontSize: '0.85rem', mb: 3, fontWeight: 500 }}>
                — OR EDIT / TYPE MANUALLY —
            </Typography>

            <Box sx={{ mb: 1 }}>
                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Pickup Address *</Typography>
                <TextField
                    fullWidth placeholder="Type your full address or area name..."
                    value={form.address} onChange={e => handleAddressTyping(e.target.value)}
                    multiline rows={2} sx={lightTextFieldStyle}
                    InputProps={{
                        endAdornment: searching ? <CircularProgress size={18} sx={{ color: '#5B4CF2', mt: -2 }} /> : form.address.length > 2 ? <SearchIcon sx={{ color: '#9CA3AF', mt: -2 }} /> : null
                    }}
                />
            </Box>

            {/* Smart Google Places Results */}
            <AnimatePresence>
                {searchResults.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <Box sx={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 3, mb: 3, boxShadow: '0 8px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                            {searchResults.map((result, i) => (
                                <Box
                                    key={result.placeId || i}
                                    onClick={() => selectSearchResult(result)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.5, p: 2, cursor: 'pointer',
                                        borderBottom: i !== searchResults.length - 1 ? '1px solid #F3F4F6' : 'none',
                                        transition: 'background 0.15s',
                                        '&:hover': { background: '#F9FAFB' }, '&:active': { background: '#F3F4F6' }
                                    }}
                                >
                                    <Box sx={{ background: '#F3F0FF', p: 0.8, borderRadius: 2, display: 'flex' }}>
                                        <NearMeIcon sx={{ color: '#5B4CF2', fontSize: 18 }} />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, color: '#1F2937', fontSize: '0.9rem' }}>{result.area}</Typography>
                                        <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.fullAddress}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>

            {form.lat > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                    <Chip icon={<CheckIcon sx={{ fontSize: 16, color: '#10B981 !important' }} />} label="GPS location captured"
                        sx={{ mt: 2, color: '#065F46', backgroundColor: '#D1FAE5', fontWeight: 600, borderRadius: 2 }}
                    />
                </motion.div>
            )}
        </>
    );
};

export default BookingStep3;
