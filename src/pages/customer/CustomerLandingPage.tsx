import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, TextField, CircularProgress, Container, Card, CardActionArea, Dialog, InputAdornment, Divider, Chip, Avatar } from '@mui/material';
import {
    LocationOn as LocationIcon,
    Search as SearchIcon,
    Person as PersonIcon,
    Star as StarIcon,
    Verified as VerifiedIcon,
    CheckCircle as CheckCircleIcon,
    ShoppingBag as ShopIcon,
    Close as CloseIcon,
    Image as ImageIcon,
    MyLocation as MyLocationIcon,
    AddLocationAlt as AddLocationIcon,
    Home as HomeIcon,
    Work as WorkIcon,
    Place as PlaceIcon,
    ArrowBack as BackIcon,
    Delete as DeleteIcon,
    MoreVert as MoreIcon,
    LocalShippingOutlined as TrackIcon,
    NavigationOutlined as NavIcon,
    Build as BuildIcon,
    Speed as SpeedIcon,
    Visibility as VisibilityIcon,
    CurrencyRupee as RupeeIcon,
    CalendarMonth as CalendarIcon,
    ArrowForward as ArrowForwardIcon,
    Phone as PhoneIcon
} from '@mui/icons-material';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import PWAInstallPrompt from '../../components/PWAInstallPrompt';
import AnimatedHeroBanner from '../../components/customer/AnimatedHeroBanner';
import { supabase } from '../../supabaseClient';
import { PromotionalBanner, ServiceUpdate } from '../../types/database';

// Static local assets
import tvRepairImg from '../../assets/tvp.png';
import tvInstallationImg from '../../assets/install.png';
import tvUninstallationImg from '../../assets/removal.png';

// Typewriter search suggestions — cycles through service names
const SEARCH_SUGGESTIONS = [
    'No Display',
    'TV Installation',
    'Flickering Screen',
    'No Sound',
    'Power Issue',
    'Lines on Screen',
    'Screen Repair',
    'TV Uninstallation',
    'TV Check-up',
    'Not Sure? We\'ll Diagnose!',
];

const TypewriterSearch: React.FC = () => {
    const [displayText, setDisplayText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const indexRef = useRef(0);
    const charRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        const tick = () => {
            const currentWord = SEARCH_SUGGESTIONS[indexRef.current];

            if (isTyping) {
                // Typing phase
                if (charRef.current <= currentWord.length) {
                    setDisplayText(currentWord.slice(0, charRef.current));
                    charRef.current++;
                    timerRef.current = setTimeout(tick, 55 + Math.random() * 30); // Natural typing speed
                } else {
                    // Word complete — pause, then start erasing
                    timerRef.current = setTimeout(() => {
                        setIsTyping(false);
                        timerRef.current = setTimeout(tick, 30);
                    }, 2200); // 2.2s pause on each complete word
                }
            } else {
                // Erasing phase
                if (charRef.current > 0) {
                    charRef.current--;
                    setDisplayText(currentWord.slice(0, charRef.current));
                    timerRef.current = setTimeout(tick, 25); // Fast erase
                } else {
                    // Move to next word
                    indexRef.current = (indexRef.current + 1) % SEARCH_SUGGESTIONS.length;
                    setIsTyping(true);
                    timerRef.current = setTimeout(tick, 400); // Brief pause before next word
                }
            }
        };

        timerRef.current = setTimeout(tick, 800); // Initial delay
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [isTyping]);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
            <Typography
                component="span"
                sx={{ color: '#9CA3AF', fontSize: '0.95rem', fontWeight: 500, whiteSpace: 'nowrap' }}
            >
                Search for &lsquo;
            </Typography>
            <Typography
                component="span"
                sx={{ color: '#374151', fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
                {displayText}
            </Typography>
            <Box
                component="span"
                sx={{
                    display: 'inline-block',
                    width: '2px', height: '18px',
                    background: '#D97706',
                    ml: '1px',
                    animation: 'cursorBlink 1s step-end infinite',
                    '@keyframes cursorBlink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0 },
                    }
                }}
            />
            <Typography
                component="span"
                sx={{ color: '#9CA3AF', fontSize: '0.95rem', fontWeight: 500 }}
            >
                &rsquo;
            </Typography>
        </Box>
    );
};

// ─── Animated Trust Strip ───
const AnimatedTrustStrip: React.FC = () => {
    return (
        <Box sx={{ 
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)',
            position: 'relative', overflow: 'hidden',
            p: 2, display: 'flex', alignItems: 'center', gap: 1.5 
        }}>
            {/* Shimmer Effect */}
            <motion.div
                animate={{ x: ['-200%', '300%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'linear' }}
                style={{
                    position: 'absolute', top: 0, left: '-20%', bottom: 0, width: '40%',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)',
                    transform: 'skewX(-20deg)', pointerEvents: 'none', zIndex: 1
                }}
            />

            {/* Google Rating */}
            <Box sx={{ textAlign: 'center', minWidth: 65, position: 'relative', zIndex: 2 }}>
                <Typography sx={{ fontWeight: 900, fontSize: '1.6rem', color: '#D97706', lineHeight: 1 }}>
                    4.9
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.2, my: 0.4 }}>
                    {[1,2,3,4,5].map((s, i) => (
                        <motion.div
                            key={s}
                            animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 + i * 0.1, delay: i * 0.1 }}
                        >
                            <StarIcon sx={{ fontSize: 13, color: s <= 4 ? '#F59E0B' : '#FCD34D' }} />
                        </motion.div>
                    ))}
                </Box>
                {/* Google and Animated Badge */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                    <Typography sx={{ fontSize: '0.6rem', color: '#92400E', fontWeight: 800 }}>Google</Typography>
                    <motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ display: 'flex' }}
                    >
                        <Box sx={{ 
                            background: '#EF4444', color: '#FFF', 
                            fontSize: '0.45rem', fontWeight: 800, 
                            px: 0.5, py: 0.2, borderRadius: 1, 
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                            whiteSpace: 'nowrap'
                        }}>
                            TOP RATED
                        </Box>
                    </motion.div>
                </Box>
            </Box>
            
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#FDE68A', zIndex: 2 }} />
            
            {/* Stats */}
            <Box sx={{ display: 'flex', flex: 1, justifyContent: 'space-around', zIndex: 2 }}>
                {[
                    { val: '268', label: 'Reviews' },
                    { val: '2.5K+', label: 'Interactions' },
                    { val: '180', label: 'Days Warranty' }
                ].map((stat) => (
                    <motion.div 
                        key={stat.label}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        style={{ textAlign: 'center', cursor: 'default' }}
                    >
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>
                            {stat.val}
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', color: '#6B7280', fontWeight: 700 }}>
                            {stat.label}
                        </Typography>
                    </motion.div>
                ))}
            </Box>
        </Box>
    );
};

// ─── Search Overlay ───
const SearchOverlay: React.FC<{ open: boolean; onClose: () => void; onSelect: (route: string) => void }> = ({ open, onClose, onSelect }) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = query.trim()
        ? SERVICES.filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
        : SERVICES; // Show all when empty

    useEffect(() => {
        if (open) {
            setQuery('');
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 999999,
                        background: '#F9FAFB',
                        display: 'flex',
                        flexDirection: 'column',
                        overscrollBehavior: 'none',
                    }}
                >
            {/* Top Bar — Search Input with Dynamic Island Padding */}
            <Box sx={{ 
                background: '#FFFFFF', px: 2, 
                pt: 'max(env(safe-area-inset-top), 52px)', // aggressive padding for dynamic island
                pb: 2,
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                position: 'relative', zIndex: 10
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton onClick={onClose} sx={{ p: 1, background: '#F3F4F6' }}>
                        <BackIcon sx={{ fontSize: 22, color: '#374151' }} />
                    </IconButton>
                    <Box sx={{
                        flex: 1, display: 'flex', alignItems: 'center',
                        background: '#FFFFFF', borderRadius: '16px',
                        px: 2, py: 1,
                        border: '2px solid #5B4CF2', // Use theme purple for active search
                        boxShadow: '0 2px 12px rgba(91,76,242,0.15)'
                    }}>
                        <SearchIcon sx={{ color: '#5B4CF2', fontSize: 20, mr: 1.5 }} />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type a tv issue or service..."
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            style={{
                                border: 'none', outline: 'none', background: 'transparent',
                                fontSize: '1rem', fontWeight: 600, color: '#111827',
                                width: '100%', fontFamily: 'inherit',
                            }}
                        />
                        {query && (
                            <IconButton onClick={() => setQuery('')} sx={{ p: 0.5, background: '#F3F4F6' }}>
                                <CloseIcon sx={{ fontSize: 16, color: '#6B7280' }} />
                            </IconButton>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* Results */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2, pt: 3, pb: 6 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.8px', mb: 2, px: 0.5, textTransform: 'uppercase' }}>
                    {query.trim() ? `${filtered.length} RESULT${filtered.length !== 1 ? 'S' : ''}` : 'POPULAR SERVICES'}
                </Typography>

                {filtered.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography sx={{ fontSize: '2.5rem', mb: 2 }}>🕵️‍♂️</Typography>
                        <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.2rem' }}>
                            No exact matches found
                        </Typography>
                        <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', mt: 1, px: 4 }}>
                            Try searching for terms like "No Display", "Flickering", or "Installation"
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filtered.map((svc, i) => {
                            const isInstall = svc.id.includes('install');
                            const isCheckup = svc.id === 'checkup';
                            const categoryColor = isInstall ? '#10B981' : isCheckup ? '#3B82F6' : '#EF4444';
                            const categoryLabel = isInstall ? 'Installation' : isCheckup ? 'Maintenance' : 'Repair';

                            return (
                                <motion.div
                                    key={svc.id}
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                                >
                                    <Card
                                        sx={{
                                            borderRadius: '24px',
                                            background: '#FFFFFF', // Fixes bad dark-mode inversion
                                            border: '1px solid rgba(0,0,0,0.06)',
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                                            overflow: 'overflow',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:active': { transform: 'scale(0.97)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
                                        }}
                                    >
                                        <CardActionArea
                                            onClick={() => { onClose(); onSelect(svc.route); }}
                                            sx={{ display: 'flex', p: 2, gap: 2.5, alignItems: 'center' }}
                                        >
                                            {/* Premium Image Container */}
                                            <Box sx={{
                                                width: 90, height: 90, flexShrink: 0,
                                                background: 'linear-gradient(145deg, #F3F4F6 0%, #E5E7EB 100%)',
                                                borderRadius: '20px', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', p: 1,
                                                position: 'relative',
                                                border: '1px solid #FFFFFF',
                                                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)'
                                            }}>
                                                <img src={svc.image} alt={svc.label} style={{ width: '95%', height: '95%', objectFit: 'contain', filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.1))' }} />
                                            </Box>
                                            
                                            {/* Details & Action */}
                                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                {/* Floating Badge */}
                                                <Box sx={{ 
                                                    alignSelf: 'flex-start',
                                                    background: `${categoryColor}15`,
                                                    color: categoryColor,
                                                    px: 1.2, py: 0.4, borderRadius: '8px',
                                                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                                    letterSpacing: '0.5px', mb: 1
                                                }}>
                                                    {categoryLabel}
                                                </Box>

                                                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', mb: 0.5, lineHeight: 1.2 }}>
                                                    {svc.label}
                                                </Typography>
                                                
                                                {/* Price/Action Row */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <VerifiedIcon sx={{ fontSize: 14, color: '#10B981' }} />
                                                        <Typography sx={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 600 }}>Assured</Typography>
                                                    </Box>
                                                    
                                                    {/* Custom ADD/BOOK Button */}
                                                    <Box sx={{
                                                        background: '#5B4CF2',
                                                        color: '#FFFFFF',
                                                        borderRadius: '10px',
                                                        px: 2, py: 0.8,
                                                        fontSize: '0.75rem', fontWeight: 800,
                                                        boxShadow: '0 4px 12px rgba(91,76,242,0.3)',
                                                    }}>
                                                        BOOK
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </CardActionArea>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </Box>
                )}
            </Box>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const SERVICES = [
    // Repair Issues — using existing 3D icons
    { id: 'no_display', label: 'No Display', image: '/services/issues/black_screen.png', route: '/book?service=repair&issue=no_display' },
    { id: 'flickering', label: 'Flickering', image: '/services/issues/flickering.png', route: '/book?service=repair&issue=flickering' },
    { id: 'no_sound', label: 'No Sound', image: '/services/issues/no_sound.png', route: '/book?service=repair&issue=no_sound' },
    { id: 'power_issue', label: 'Power Issue', image: '/services/issues/power.png', route: '/book?service=repair&issue=power_issue' },
    { id: 'lines', label: 'Lines on Screen', image: '/services/issues/lines.png', route: '/book?service=repair&issue=lines' },
    { id: 'screen_repair', label: 'Screen Repair', image: '/services/tv_screen_repair.png', route: '/book?service=repair&issue=screen_repair' },
    { id: 'not_sure', label: 'Not Sure', image: '/services/issues/unknown.png', route: '/book?service=repair' },
    // Installation & Setup — using existing 3D icons
    { id: 'installation', label: 'TV Installation', image: '/services/tv_installation.png', route: '/book?service=installation' },
    { id: 'uninstallation', label: 'TV Uninstallation', image: '/services/tv_uninstallation.png', route: '/book?service=uninstallation' },
    { id: 'checkup', label: 'TV Check-up', image: '/services/tv_checkup.png', route: '/book?service=repair' },
];

const AnimatedServiceIcon: React.FC<{ id: string; image: string; label: string }> = ({ id, image, label }) => {
    let badgeText = '';
    let badgeColor = '';
    let shadowColor = '';

    switch (id) {
        case 'no_display': badgeText = 'BLANK'; badgeColor = '#111827'; shadowColor = 'rgba(17,24,39,0.15)'; break;
        case 'flickering': badgeText = 'GLITCH'; badgeColor = '#D97706'; shadowColor = 'rgba(217,119,6,0.15)'; break;
        case 'no_sound': badgeText = 'MUTED'; badgeColor = '#DC2626'; shadowColor = 'rgba(220,38,38,0.15)'; break;
        case 'power_issue': badgeText = 'DEAD'; badgeColor = '#EA580C'; shadowColor = 'rgba(234,88,12,0.15)'; break;
        case 'lines': badgeText = 'LINES'; badgeColor = '#7C3AED'; shadowColor = 'rgba(124,58,237,0.15)'; break;
        case 'screen_repair': badgeText = 'BROKEN'; badgeColor = '#C026D3'; shadowColor = 'rgba(192,38,211,0.15)'; break;
        case 'not_sure': badgeText = 'UNKNOWN'; badgeColor = '#4B5563'; shadowColor = 'rgba(75,85,99,0.15)'; break;
        case 'installation': badgeText = 'MOUNT'; badgeColor = '#059669'; shadowColor = 'rgba(5,150,105,0.15)'; break;
        case 'uninstallation': badgeText = 'UNMOUNT'; badgeColor = '#2563EB'; shadowColor = 'rgba(37,99,235,0.15)'; break;
        case 'checkup': badgeText = 'CHECKUP'; badgeColor = '#0D9488'; shadowColor = 'rgba(13,148,136,0.15)'; break;
        default: break;
    }

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            {/* 3D Icon — contained with breathing room */}
            <Box sx={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: badgeText ? 1 : 0 }}>
                <img src={image} alt={label} style={{ width: '90%', height: '90%', objectFit: 'contain', filter: 'drop-shadow(0px 6px 16px rgba(0,0,0,0.08))' }} />
            </Box>

            {/* Premium Glassmorphic Badge — positioned inside the card */}
            {badgeText && (
                <Box
                    sx={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 1)',
                        color: badgeColor,
                        padding: '4px 14px',
                        borderRadius: '24px',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                        backdropFilter: 'blur(12px)',
                        fontFamily: "'Inter', sans-serif",
                        overflow: 'hidden',
                        position: 'relative',
                        animation: `shadowPulse_${id} 3s ease-in-out infinite`,
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '50%',
                            height: '100%',
                            background: `linear-gradient(90deg, transparent, ${shadowColor.replace('0.15', '0.5')}, transparent)`,
                            transform: 'skewX(-20deg)',
                            animation: `badgeWave_${id} 3s ease-in-out infinite`,
                        },
                        [`@keyframes shadowPulse_${id}`]: {
                            '0%, 100%': { boxShadow: `0 4px 12px ${shadowColor}, 0 2px 4px rgba(0,0,0,0.04)` },
                            '50%': { boxShadow: `0 6px 16px ${shadowColor.replace('0.15', '0.4')}, 0 2px 4px rgba(0,0,0,0.04)` }
                        },
                        [`@keyframes badgeWave_${id}`]: {
                            '0%': { left: '-100%' },
                            '25%, 100%': { left: '250%' }
                        }
                    }}
                >
                    {badgeText}
                </Box>
            )}
        </Box>
    );
};

const WHY_CHOOSE_US = [
    { icon: <CheckCircleIcon />, title: 'Verified Techs', desc: 'Background checked & brand certified', color: '#2563EB', bg: '#DBEAFE' },
    { icon: <SpeedIcon />, title: 'Same-Day Service', desc: '40-minute response time', color: '#059669', bg: '#D1FAE5' },
    { icon: <BuildIcon />, title: 'Chip-Level Repair', desc: 'Advanced motherboard & IC work', color: '#D97706', bg: '#FEF3C7' },
    { icon: <RupeeIcon />, title: 'Transparent Pricing', desc: 'No hidden charges, honest quotes', color: '#7C3AED', bg: '#EDE9FE' },
];

const SERVICE_AREAS = [
    'Manikonda', 'Narsingi', 'Kokapet', 'Puppalguda', 'Financial District',
    'Gachibowli', 'HITEC City', 'Tolichowki', 'Jubilee Hills', 'Madhapur',
    'Suncity', 'Bandlaguda', 'Shaikpet', 'Raidurgam', 'Tellapur',
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

    // UI state for Service Updates modal gallery
    const [selectedUpdate, setSelectedUpdate] = useState<ServiceUpdate | null>(null);

    // Track if this is the first visit this session to avoid playing heavy staggers on 'back' nav
    const [isFirstVisit] = useState(() => {
        const visited = sessionStorage.getItem('jt_landing_visited');
        if (!visited) {
            sessionStorage.setItem('jt_landing_visited', 'true');
            return true;
        }
        return false;
    });

    // Saved addresses
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

    // Add new address flow
    const [addingAddress, setAddingAddress] = useState(false);
    const [newLabel, setNewLabel] = useState('Home');
    const [newAddressText, setNewAddressText] = useState('');

    // Dynamic banners from database (carousel)
    const [heroBanners, setHeroBanners] = useState<PromotionalBanner[]>([]);
    const [activeBannerIdx, setActiveBannerIdx] = useState(0);

    useEffect(() => {
        const fetchHeroBanners = async () => {
            const { data } = await supabase
                .from('promotional_banners')
                .select('*')
                .eq('is_active', true)
                .eq('banner_type', 'hero')
                .order('order_index', { ascending: true });
            if (data && data.length > 0) {
                // Filter by schedule dates client-side
                const now = new Date();
                const visible = (data as PromotionalBanner[]).filter(b => {
                    if (b.schedule_start && new Date(b.schedule_start) > now) return false;
                    if (b.schedule_end && new Date(b.schedule_end) < now) return false;
                    return true;
                });
                setHeroBanners(visible.length ? visible : [data[0] as PromotionalBanner]);
            }
        };
        fetchHeroBanners();
    }, []);

    // Auto-rotate carousel every 5 seconds
    useEffect(() => {
        if (heroBanners.length <= 1) return;
        const timer = setInterval(() => {
            setActiveBannerIdx(prev => (prev + 1) % heroBanners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [heroBanners.length]);

    // Service Updates (Google Business Profile Posts)
    const [serviceUpdates, setServiceUpdates] = useState<ServiceUpdate[]>([]);
    useEffect(() => {
        const fetchUpdates = async () => {
            const { data } = await supabase
                .from('service_updates')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(6);
            if (data) setServiceUpdates(data as ServiceUpdate[]);
        };
        fetchUpdates();
    }, []);

    // Relative time helper
    const relativeTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks}w ago`;
        return `${Math.floor(days / 30)}mo ago`;
    };

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{ area: string; fullAddress: string; placeId: string }>>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Show all saved addresses
    const [showAll, setShowAll] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

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
        <Box sx={{ 
            minHeight: '100dvh', background: '#FFFFFF', pb: '110px', 
            overflowX: 'hidden', width: '100%', boxSizing: 'border-box', 
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            ...(searchOpen && {
                height: '100dvh',
                overflow: 'hidden'
            })
        }}>
            <PWAInstallPrompt />
            <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={(route) => navigate(route)} />

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
            
            {/* ════ DYNAMIC ANIMATED HERO BANNER CAROUSEL ════ */}
            <Box sx={{ position: 'relative', zIndex: 10 }}>
                <AnimatedHeroBanner
                    banner={heroBanners[activeBannerIdx] || null}
                    isFirstVisit={isFirstVisit}
                    onLocationTap={handleLocationTap}
                    locationArea={displayArea}
                    locationCity={displayCity}
                    onProfileTap={() => navigate('/my-tickets')}
                />
            </Box>

            {/* Carousel Dot Indicators */}
            {heroBanners.length > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: -3.5, mb: 1, position: 'relative', zIndex: 2 }}>
                    {heroBanners.map((_, i) => (
                        <Box
                            key={i}
                            onClick={() => setActiveBannerIdx(i)}
                            sx={{
                                width: i === activeBannerIdx ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                background: i === activeBannerIdx ? '#5B4CF2' : 'rgba(91,76,242,0.25)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                            }}
                        />
                    ))}
                </Box>
            )}

            {/* ════ 2. SEARCH + TRUST STRIP — Combined Section ════ */}
            <Container maxWidth="sm" disableGutters sx={{ mt: { xs: -4, sm: 2 }, mb: 2, position: 'relative', zIndex: 1 }}>
                <motion.div
                    initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.3 }}
                >
                    <Box sx={{ px: { xs: 0, sm: 2 } }}>
                        <Card sx={{
                            background: '#FFFFFF',
                            borderRadius: { xs: '0 0 32px 32px', sm: '32px' }, // Nested perfectly under banner on mobile
                            border: '1px solid rgba(0,0,0,0.06)',
                            borderTop: 'none',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                            overflow: 'hidden',
                            pt: { xs: 6, sm: 0 }, // Increased padding (from 4 to 6) to give search bar breathing room below banner curve
                        }}>
                        {/* Search Bar — Top Section with Auto-Typing */}
                        <Box 
                            onClick={() => setSearchOpen(true)}
                            sx={{
                                display: 'flex', alignItems: 'center',
                                p: '10px 12px 10px 16px',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                '&:hover': { background: 'rgba(0,0,0,0.02)' },
                                '&:active': { background: 'rgba(0,0,0,0.04)' },
                            }}
                        >
                            <SearchIcon sx={{ color: '#9CA3AF', fontSize: 22, mr: 1.5 }} />
                            <TypewriterSearch />
                            <Box sx={{ background: '#111827', borderRadius: '12px', px: 2, py: 0.8, ml: 1, flexShrink: 0 }}>
                                <Typography sx={{ color: '#FFF', fontSize: '0.75rem', fontWeight: 700 }}>Search</Typography>
                            </Box>
                        </Box>

                        {/* Divider */}
                        <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />

                        {/* Trust Stats — Bottom Section (Animated) */}
                        <AnimatedTrustStrip />
                    </Card>
                    </Box>
                </motion.div>
            </Container>

            {/* ════ 3. PUZZLE BLOCK: UPDATES + SERVICE AREAS ════ */}
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Card sx={{
                    background: '#FFFFFF', // Forces light mode surface, fixing dark mode bug
                    borderRadius: '32px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                }}>
                    {/* Top Half: Service Updates Feed */}
                    {serviceUpdates.length > 0 && (
                        <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827', letterSpacing: '-0.3px' }}>Recent Work & Updates</Typography>
                                    <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>Real work from our verified technicians</Typography>
                                </Box>
                                <Chip label="Live" size="small" sx={{ background: '#D1FAE5', color: '#065F46', fontWeight: 700, fontSize: '0.65rem' }} icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', ml: 1, animation: 'livePulse 2s infinite', '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />} />
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                                {serviceUpdates.map((post, i) => (
                                    <motion.div key={post.id}
                                        initial={shouldReduce ? false : { opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.35, delay: i * 0.08 }}
                                        style={{ minWidth: 260, maxWidth: 280, flexShrink: 0 }}
                                    >
                                        <Card 
                                            onClick={() => setSelectedUpdate(post)}
                                            sx={{
                                            background: '#202124', // Perfect Google Dark Theme Gray
                                            borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)',
                                            display: 'flex', flexDirection: 'column', height: '100%',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            color: '#E8EAED',
                                            transition: 'all 0.2s',
                                            '&:active': { transform: 'scale(0.99)' },
                                        }}>
                                            {/* Post Image */}
                                            {post.images && post.images.length > 0 ? (
                                                <Box sx={{ position: 'relative', height: 160, width: '100%', overflow: 'hidden' }}>
                                                    <img src={post.images[0]} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <Box sx={{ 
                                                        position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                                                        borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                                    }}>
                                                        <ImageIcon sx={{ fontSize: 13, color: '#FFF' }} />
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, background: '#303134', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Avatar sx={{ width: 32, height: 32, background: '#000', fontSize: '0.7rem', fontWeight: 900 }}>JT</Avatar>
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#E8EAED', lineHeight: 1 }}>JamesTronic</Typography>
                                                        <Typography sx={{ fontSize: '0.65rem', color: '#9AA0A6' }}>{relativeTime(post.created_at)}</Typography>
                                                    </Box>
                                                    <Chip label="Update" size="small" sx={{ ml: 'auto', height: 20, fontSize: '0.6rem', fontWeight: 700, background: '#D2E3FC', color: '#174EA6' }} />
                                                </Box>
                                            )}

                                            {/* Post Content */}
                                            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#E8EAED', mb: 0.5, lineHeight: 1.3 }}>
                                                    📍 {post.title}
                                                </Typography>
                                                <Typography sx={{
                                                    fontSize: '0.8rem', color: '#9AA0A6', lineHeight: 1.5, mb: 1,
                                                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                                }}>
                                                    {post.description}
                                                </Typography>
                                                
                                                {/* Area Tags */}
                                                {post.area_tags && post.area_tags.length > 0 && (
                                                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
                                                        {post.area_tags.slice(0, 3).map(tag => (
                                                            <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600, background: '#303134', color: '#9AA0A6' }} />
                                                        ))}
                                                    </Box>
                                                )}

                                                <Typography sx={{ fontSize: '0.7rem', color: '#9AA0A6', mb: 1, fontWeight: 500 }}>
                                                    {post.images && post.images.length > 0 ? relativeTime(post.created_at) : ''}
                                                </Typography>

                                                {/* CTA */}
                                                <Box sx={{ mt: 'auto', pt: 0.5 }}>
                                                    <Button
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (post.cta_type === 'call_now') window.location.href = 'tel:09052222901';
                                                            else navigate(post.cta_link || '/book');
                                                        }}
                                                        sx={{
                                                            textTransform: 'none', fontWeight: 700, fontSize: '0.85rem',
                                                            color: '#8AB4F8', p: 0, minWidth: 'auto',
                                                            '&:hover': { background: 'transparent', color: '#A8C7FA', textDecoration: 'underline' }
                                                        }}
                                                    >
                                                        {post.cta_type === 'call_now' ? 'Call now' : post.cta_type === 'book_now' ? 'Book Now' : 'Learn more'}
                                                    </Button>
                                                </Box>
                                            </Box>
                                        </Card>
                                    </motion.div>
                                ))}
                            </Box>
                        </Box>
                    )}

                </Card>
            </Container>

            {/* ════ INFINITE SCROLLING SERVICE AREAS MARQUEE ════ */}
            <Box sx={{ 
                width: '100%', overflow: 'hidden', pt: 3.5, pb: 4, 
                background: '#FFFFFF', 
                position: 'relative',
                // Adding beautiful fade edges using a CSS mask
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
            }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', mb: 2, textAlign: 'center', letterSpacing: '-0.3px' }}>
                    📍 We proudly serve across Hyderabad
                </Typography>

                {/* ROW 1: Scrolling Left */}
                <Box sx={{ 
                    display: 'flex', gap: 1.5, mb: 1.5, width: 'max-content', 
                    animation: 'scroll-left 40s linear infinite',
                    '@keyframes scroll-left': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(calc(-50% - 6px))' } },
                    '&:hover': { animationPlayState: 'paused' }
                }}>
                    {[...SERVICE_AREAS, ...SERVICE_AREAS].map((area, idx) => (
                        <Chip key={`r1-${idx}`} label={area} size="medium" sx={{ fontWeight: 700, px: 1.5, fontSize: '0.85rem', height: 36, background: '#F8F9FA', color: '#3C4043', border: '1px solid rgba(0,0,0,0.06)' }} />
                    ))}
                </Box>

                {/* ROW 2: Scrolling Right */}
                <Box sx={{ 
                    display: 'flex', gap: 1.5, width: 'max-content', 
                    animation: 'scroll-right 35s linear infinite',
                    '@keyframes scroll-right': { '0%': { transform: 'translateX(calc(-50% - 6px))' }, '100%': { transform: 'translateX(0)' } },
                    '&:hover': { animationPlayState: 'paused' }
                }}>
                    {[...[...SERVICE_AREAS].reverse(), ...[...SERVICE_AREAS].reverse()].map((area, idx) => (
                        <Chip key={`r2-${idx}`} label={area} icon={<VerifiedIcon sx={{ color: '#34A853 !important', fontSize: '1rem !important' }}/>} size="medium" sx={{ fontWeight: 700, px: 1, fontSize: '0.85rem', height: 36, background: '#FFFFFF', color: '#111827', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }} />
                    ))}
                </Box>
            </Box>

            {/* ════ 4. EXPLORE ALL SERVICES — PREMIUM PUZZLE BLOCK ════ */}
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Card sx={{
                    background: '#FFFFFF', // Forces light mode surface
                    borderRadius: '32px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                }}>
                    <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                        <motion.div
                            initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: isFirstVisit ? 0.4 : 0 }}
                        >
                            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827', mb: 2, letterSpacing: '-0.3px' }}>
                                Explore all services
                            </Typography>
                        </motion.div>

                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateRows: 'repeat(2, 1fr)', 
                    gridAutoFlow: 'column',
                    gridAutoColumns: { xs: 'calc(50% - 12px)', sm: 'calc(33.33% - 16px)', md: 'calc(25% - 20px)' },
                    columnGap: { xs: 1.5, sm: 2.5 }, 
                    rowGap: { xs: 3, sm: 4 },
                    px: 1,
                    pb: 1, 
                    overflowX: 'auto', 
                    scrollSnapType: 'x mandatory',
                    scrollPaddingLeft: '8px',
                    WebkitOverflowScrolling: 'touch',
                    '&::-webkit-scrollbar': { display: 'none' },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                }}>
                    {SERVICES.map((svc, i) => (
                        <motion.div
                            key={svc.id}
                            initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: isFirstVisit ? 0.3 + (i % 5) * 0.08 : 0 }}
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            <CardActionArea
                                onClick={() => navigate(svc.route)}
                                disableRipple
                                sx={{
                                    display: 'flex', flexDirection: 'column',
                                    p: 0, transition: 'all 0.25s cubic-bezier(0.2, 0, 0, 1)',
                                    '&:hover': { transform: 'translateY(-6px)' },
                                    '&:active': { transform: 'scale(0.98)' },
                                    borderRadius: '28px',
                                }}
                            >
                                <Box sx={{
                                    width: '100%',
                                    aspectRatio: '1/1.15', // Taller card for icon + badge
                                    background: 'linear-gradient(160deg, #FAFAFA 0%, #F3F4F6 100%)',
                                    borderRadius: '24px',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    mb: 1.5,
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                                    position: 'relative',
                                }}>
                                    <AnimatedServiceIcon id={svc.id} image={svc.image} label={svc.label} />
                                </Box>
                                <Typography sx={{
                                    color: '#111827', fontSize: { xs: '0.85rem', sm: '0.95rem' },
                                    fontWeight: 800, textAlign: 'center', lineHeight: 1.2, letterSpacing: '-0.3px',
                                    px: 0.5
                                }}>
                                    {svc.label}
                                </Typography>
                            </CardActionArea>
                        </motion.div>
                    ))}
                </Box>
            </Box>
        </Card>
    </Container>

            {/* ════ 5. PUZZLE BLOCK: WHY CHOOSE US + WARRANTY ════ */}
            <Container maxWidth="sm" sx={{ mt: 4, mb: 12 }}>
                <motion.div
                    initial={shouldReduce ? false : { opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 }}
                >
                    <Card sx={{
                        background: '#FFFFFF', // Forces light mode surface, fixing invisible text
                        borderRadius: '32px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                    }}>
                        {/* Top Half: Why Choose Us */}
                        <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827', mb: 2 }}>Why choose JamesTronic?</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                                {WHY_CHOOSE_US.map((item, i) => (
                                    <motion.div key={item.title}
                                        initial={shouldReduce ? false : { opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 1.0 + i * 0.08 }}
                                    >
                                        <Box sx={{
                                            p: 2.5, borderRadius: '32px', // Ultra-rounded corners to match screenshot
                                            background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.03)',
                                            height: '100%', display: 'flex', flexDirection: 'column',
                                            transition: 'all 0.2s',
                                            '&:active': { transform: 'scale(0.97)' },
                                        }}>
                                            {/* Pulsing Icon */}
                                            <motion.div
                                                animate={{ 
                                                    scale: [1, 1.15, 1],
                                                    boxShadow: ['0 0 0px rgba(0,0,0,0)', `0 0 20px ${item.color}80`, '0 0 0px rgba(0,0,0,0)']
                                                }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                                                style={{ display: 'inline-flex', marginBottom: '12px', alignSelf: 'flex-start', borderRadius: '50%' }}
                                            >
                                                <Box sx={{ 
                                                    background: item.bg, width: 42, height: 42, 
                                                    borderRadius: '50%', color: item.color, 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                                }}>
                                                    {React.cloneElement(item.icon, { sx: { fontSize: 22 } })}
                                                </Box>
                                            </motion.div>
                                            
                                            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827', mb: 0.4, lineHeight: 1.2 }}>{item.title}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500, lineHeight: 1.3 }}>{item.desc}</Typography>
                                        </Box>
                                    </motion.div>
                                ))}
                            </Box>
                        </Box>

                        {/* Bottom Half: Warranty Footer */}
                        <Box sx={{
                            background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
                            borderTop: '1px solid rgba(16, 185, 129, 0.15)',
                            p: { xs: 2.5, sm: 3 },
                            display: 'flex', alignItems: 'center', gap: 2.5
                        }}>
                            {/* The 5th Pulsing Icon - Warranty */}
                            <motion.div
                                animate={{ 
                                    scale: [1, 1.12, 1],
                                    boxShadow: ['0 4px 12px rgba(16,185,129,0.3)', '0 4px 28px rgba(16,185,129,0.8)', '0 4px 12px rgba(16,185,129,0.3)']
                                }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ borderRadius: '50%', flexShrink: 0 }}
                            >
                                <Box sx={{ p: 1.5, background: '#10B981', borderRadius: '50%', color: '#FFF', display: 'flex' }}>
                                    <VerifiedIcon fontSize="medium" />
                                </Box>
                            </motion.div>
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: '#065F46', fontSize: '1.1rem', mb: 0.5 }}>Up to 180 days warranty</Typography>
                                <Typography sx={{ color: '#047857', fontSize: '0.85rem', fontWeight: 500 }}>Comprehensive protection on all TV parts & screen repairs.</Typography>
                            </Box>
                        </Box>
                    </Card>
                </motion.div>
            </Container>

            {/* ════ BOTTOM NAVIGATION BAR — FIXED ════ */}
            <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, width: '100%' }}>
                <motion.div
                    initial={(shouldReduce || !isFirstVisit) ? false : { y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 25, delay: isFirstVisit ? 1.1 : 0 }}
                >
                    <Box sx={{ 
                        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        borderTop: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
                        pt: 1.5, pb: { xs: 3, sm: 2 }
                    }}>
                        <motion.div whileTap={{ scale: 0.85 }} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <Box onClick={() => navigate('/')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#000' }}>
                                <Box sx={{ background: '#000', color: '#FFF', width: 26, height: 26, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem' }}>JT</Box>
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800 }}>JT</Typography>
                            </Box>
                        </motion.div>
                        <motion.div whileTap={{ scale: 0.85 }} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <Box onClick={() => navigate('/my-tickets')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                                <TrackIcon sx={{ fontSize: 26 }} />
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Track</Typography>
                            </Box>
                        </motion.div>
                        <motion.div whileTap={{ scale: 0.85 }} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <Box onClick={() => navigate('/buy')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                                <ShopIcon sx={{ fontSize: 26 }} />
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Buy</Typography>
                            </Box>
                        </motion.div>
                        <motion.div whileTap={{ scale: 0.85 }} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <Box onClick={() => navigate('/account')} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: '#6B7280', transition: 'color 0.2s', '&:hover': { color: '#000' } }}>
                                <PersonIcon sx={{ fontSize: 26 }} />
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Account</Typography>
                            </Box>
                        </motion.div>
                    </Box>
                </motion.div>
            </Box>

            {/* ════ FULL SCREEN FRAMER MOTION SERVICE UPDATE OVERLAY ════ */}
            <AnimatePresence>
                {selectedUpdate && (
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 30, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        sx={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10000,
                            background: '#111111',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Images Scrollable Row - Natural Viewport Width */}
                        <Box>
                            {selectedUpdate.images && selectedUpdate.images.length > 0 && (
                                <Box sx={{ 
                                    display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', 
                                    '&::-webkit-scrollbar': { display: 'none' } 
                                }}>
                                    {selectedUpdate.images.map((img, idx) => (
                                        <Box key={idx} sx={{ 
                                            width: '100vw', flexShrink: 0, scrollSnapAlign: 'start', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: '#000',
                                            py: 4 // Padding top/bottom ensures the image has breathing room
                                        }}>
                                            <img src={img} alt={`Update ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        {/* Elegant Pagination Dots */}
                        {selectedUpdate.images && selectedUpdate.images.length > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, p: 2, background: '#111' }}>
                                {selectedUpdate.images.map((_, idx) => (
                                    <Box key={idx} sx={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                                ))}
                            </Box>
                        )}
                        
                        {/* Content Area */}
                        <Box sx={{ p: 3, flex: 1, background: '#111' }}>
                            {/* Just JamesTronic Header if no images */}
                            {(!selectedUpdate.images || selectedUpdate.images.length === 0) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                    <Avatar sx={{ width: 44, height: 44, background: '#000', fontSize: '1rem', fontWeight: 900 }}>JT</Avatar>
                                    <Box>
                                        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#E8EAED', lineHeight: 1 }}>JamesTronic</Typography>
                                        <Typography sx={{ fontSize: '0.8rem', color: '#9AA0A6', mt: 0.5 }}>{relativeTime(selectedUpdate.created_at)}</Typography>
                                    </Box>
                                </Box>
                            )}

                            {/* 🌟 New Social Proof Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box sx={{ display: 'flex', color: '#FABB05', gap: 0.2 }}>
                                    {'★★★★★'.split('').map((star, i) => <Typography key={i} sx={{ fontSize: '1.2rem', lineHeight: 1 }}>{star}</Typography>)}
                                </Box>
                                <Chip 
                                    icon={<CheckCircleIcon sx={{ fontSize: '1rem !important', color: '#34A853' }} />} 
                                    label="Verified Job" 
                                    size="small" 
                                    sx={{ background: 'rgba(52, 168, 83, 0.15)', color: '#34A853', fontWeight: 800, fontSize: '0.75rem', border: '1px solid rgba(52, 168, 83, 0.3)' }} 
                                />
                            </Box>

                            <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#FFF', mb: 2, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                                {selectedUpdate.title}
                            </Typography>
                            
                            {/* Fast-Action Top CTA Button (Convenience for readers before scrolling) */}
                            <Button
                                variant="contained"
                                onClick={() => {
                                    if (selectedUpdate.cta_type === 'call_now') window.location.href = 'tel:09052222901';
                                    else navigate(selectedUpdate.cta_link || '/book');
                                }}
                                startIcon={selectedUpdate.cta_type === 'call_now' ? <PhoneIcon /> : undefined}
                                sx={{
                                    mb: 3,
                                    py: 1, px: 2.5,
                                    borderRadius: '12px', 
                                    textTransform: 'none', 
                                    fontWeight: 700, 
                                    fontSize: '0.95rem',
                                    background: 'rgba(66, 133, 244, 0.15)', 
                                    color: '#8AB4F8',
                                    border: '1px solid rgba(138, 180, 248, 0.3)',
                                    '&:hover': { background: 'rgba(66, 133, 244, 0.25)' },
                                    display: 'inline-flex',
                                }}
                            >
                                {selectedUpdate.cta_type === 'call_now' ? 'Call Now' : selectedUpdate.cta_type === 'book_now' ? 'Book Service' : 'Learn More'}
                            </Button>
                            
                            <Typography sx={{ fontSize: '1.05rem', color: '#E8EAED', lineHeight: 1.7, whiteSpace: 'pre-wrap', mb: 4, letterSpacing: '0.01em' }}>
                                {selectedUpdate.description}
                            </Typography>
                            
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />

                            {/* Area Tags (Moved to bottom so they don't break the description flow) */}
                            {selectedUpdate.area_tags && selectedUpdate.area_tags.length > 0 && (
                                <Box sx={{ mb: 4 }}>
                                    <Typography sx={{ fontSize: '0.85rem', color: '#9AA0A6', mb: 1.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Service Areas
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {selectedUpdate.area_tags.map((tag, idx) => (
                                            <Chip key={tag} icon={idx === 0 ? <LocationIcon sx={{ fontSize: '0.9rem !important' }} /> : undefined} label={tag} size="small" sx={{ fontWeight: 600, background: '#202124', color: '#E8EAED', border: '1px solid #303134' }} />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {selectedUpdate.images && selectedUpdate.images.length > 0 && (
                                <Typography sx={{ fontSize: '0.85rem', color: '#9AA0A6', mb: 3, fontWeight: 500 }}>
                                    Posted {relativeTime(selectedUpdate.created_at)}
                                </Typography>
                            )}

                            {/* Premium Framer Motion CTA */}
                            <Box 
                                component={motion.div}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.96 }}
                                sx={{ mb: { xs: 10, sm: 6 }, pr: { xs: 9, sm: 10 } }} // Padding right to sit beautifully next to the FAB
                            >
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={() => {
                                        if (selectedUpdate.cta_type === 'call_now') window.location.href = 'tel:09052222901';
                                        else navigate(selectedUpdate.cta_link || '/book');
                                    }}
                                    startIcon={selectedUpdate.cta_type === 'call_now' ? <PhoneIcon /> : undefined}
                                    sx={{
                                        py: 2, 
                                        borderRadius: '16px', 
                                        textTransform: 'none', 
                                        fontWeight: 800, 
                                        fontSize: '1.15rem',
                                        background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)', 
                                        color: '#FFF',
                                        boxShadow: '0 8px 24px rgba(66, 133, 244, 0.4)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        // Subtle internal animated gradient sweep to make it feel strictly premium and alive
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0, left: '-100%',
                                            width: '50%', height: '100%',
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                            animation: 'shimmerSweep 3s infinite',
                                        },
                                        '@keyframes shimmerSweep': {
                                            '0%': { left: '-100%' },
                                            '100%': { left: '200%' }
                                        }
                                    }}
                                >
                                    {selectedUpdate.cta_type === 'call_now' ? 'Call Now' : selectedUpdate.cta_type === 'book_now' ? 'Book Service Now' : 'Learn More'}
                                </Button>
                            </Box>
                        </Box>

                        {/* Premium Floating Close Button (Bottom Right FAB) */}
                        <Box 
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.5, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5, y: 50 }}
                            transition={{ delay: 0.15, type: 'spring', damping: 20, stiffness: 300 }}
                            sx={{
                                position: 'fixed',
                                bottom: { xs: 32, sm: 40 },
                                right: { xs: 24, sm: 40 },
                                zIndex: 10001,
                            }}
                        >
                            <IconButton 
                                onClick={() => setSelectedUpdate(null)} 
                                sx={{ 
                                    width: 56, 
                                    height: 56, 
                                    background: 'rgba(255, 255, 255, 0.95)', 
                                    color: '#000', 
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(10px)',
                                    '&:hover': { background: '#FFF', transform: 'scale(1.05)' },
                                    transition: 'transform 0.2s ease',
                                }}
                            >
                                <CloseIcon fontSize="medium" />
                            </IconButton>
                        </Box>
                    </Box>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default CustomerLandingPage;
