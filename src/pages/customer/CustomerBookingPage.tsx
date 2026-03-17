import React, { useState, useRef, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Container, Card, CardContent,
    InputAdornment, IconButton, CircularProgress, Chip, Alert, Dialog, DialogContent
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    MyLocation as MyLocationIcon,
    CheckCircle as CheckIcon,
    PhoneAndroid as PhoneIcon,
    Tv as TvIcon,
    LocationOn as LocationIcon,
    Edit as EditIcon,
    Build as RepairIcon,
    SettingsInputAntenna as InstallIcon,
    Eject as UninstallIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    FilterFrames as FilterFramesIcon,
    OpenWith as OpenWithIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Autocomplete } from '@react-google-maps/api';

// Brand config — all popular TV brands in India (especially Hyderabad market)
const TV_BRANDS = [
    { name: 'Samsung', color: '#1428A0', bg: '#E8EEFF', accent: '#D0DBFF' },
    { name: 'LG', color: '#A50034', bg: '#FFF0F3', accent: '#FFD6E0' },
    { name: 'Sony', color: '#000000', bg: '#F0F0F0', accent: '#E0E0E0' },
    { name: 'Mi/Xiaomi', color: '#FF6900', bg: '#FFF4EC', accent: '#FFE0CC' },
    { name: 'OnePlus', color: '#EB0029', bg: '#FFF0F0', accent: '#FFD4D4' },
    { name: 'TCL', color: '#004990', bg: '#EDF4FF', accent: '#CCE0FF' },
    { name: 'Vu', color: '#FF3E00', bg: '#FFF3EE', accent: '#FFD8C8' },
    { name: 'Hisense', color: '#00AE4D', bg: '#EEFFF5', accent: '#CCFFE0' },
    { name: 'Panasonic', color: '#003087', bg: '#EDF0FF', accent: '#CCD8FF' },
    { name: 'Toshiba', color: '#E60012', bg: '#FFF0F0', accent: '#FFD4D4' },
    { name: 'Realme', color: '#F5C518', bg: '#FFFBEB', accent: '#FFF0B3' },
    { name: 'Thomson', color: '#00875A', bg: '#EEFFF7', accent: '#B8F0D8' },
    { name: 'Motorola', color: '#5C92FA', bg: '#EEF4FF', accent: '#C8DBFF' },
    { name: 'Aiwa', color: '#D32F2F', bg: '#FFF0EE', accent: '#FFD4CF' },
    { name: 'Other', color: '#6B7280', bg: '#F9FAFB', accent: '#E5E7EB' },
];

const TV_SIZES = ['32"', '40"', '41"', '42"', '43"', '46"', '49"', '50"', '55"', '65"', '75"', '84"', '108"'];

const COMMON_ISSUES = [
    { label: 'No display', image: '/services/issues/black_screen.png' },
    { label: 'Flickering', image: '/services/issues/flickering.png' },
    { label: 'No sound', image: '/services/issues/no_sound.png' },
    { label: 'Power issue', image: '/services/issues/power.png' },
    { label: 'Lines on screen', image: '/services/issues/lines.png' },
    { label: 'Not sure', image: '/services/issues/unknown.png' }
];

// Service type config with 3D icon images
const SERVICE_TYPES = [
    { value: 'repair', label: 'TV Repair', image: '/services/tv_checkup.png', color: '#5B4CF2', bg: 'linear-gradient(135deg, #F3F0FF 0%, #EDE9FE 100%)' },
    { value: 'installation', label: 'TV Installation', image: '/services/tv_installation.png', color: '#10B981', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' },
    { value: 'uninstallation', label: 'TV Uninstallation', image: '/services/tv_uninstallation.png', color: '#F59E0B', bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' },
];

const CustomerBookingPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialMobile = searchParams.get('mobile') || '';
    const initialService = searchParams.get('service') || 'repair';

    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ ticketNumber: string } | null>(null);

    // Pickers
    const [showBrandPicker, setShowBrandPicker] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);

    // Form Data
    const [form, setForm] = useState({
        mobile: initialMobile,
        customerName: '',
        serviceType: initialService,
        tvBrand: '',
        tvModel: '',
        tvSize: '',
        issueDescription: '',
        address: '',
        lat: 0,
        lng: 0,
        bracketStatus: '',
    });

    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    // ═══ AUTO-FILL LOCATION from landing page ═══
    useEffect(() => {
        // Read location already set by the user on the landing page
        const savedLocation = localStorage.getItem('jt_customer_location');
        const selectedAddrId = localStorage.getItem('jt_selected_address_id');
        const savedAddresses = localStorage.getItem('jt_saved_addresses');

        if (selectedAddrId && savedAddresses) {
            // User selected a saved address — use its full address
            try {
                const addrs = JSON.parse(savedAddresses);
                const selected = addrs.find((a: any) => a.id === selectedAddrId);
                if (selected?.fullAddress) {
                    setForm(prev => ({ ...prev, address: selected.fullAddress }));
                    return;
                }
            } catch { /* ignore */ }
        }

        if (savedLocation) {
            try {
                const parsed = JSON.parse(savedLocation);
                // Use the city/fullAddress as the booking address
                const addr = parsed.city || parsed.area || '';
                if (addr) {
                    setForm(prev => ({ ...prev, address: addr }));
                }
            } catch { /* ignore */ }
        }
    }, []);

    const handlePlaceChanged = () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
            setForm(prev => ({
                ...prev,
                address: place.formatted_address || '',
                lat: place.geometry?.location?.lat() || 0,
                lng: place.geometry?.location?.lng() || 0,
            }));
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const geocoder = new google.maps.Geocoder();
                    const result = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
                    if (result.results[0]) {
                        setForm(prev => ({
                            ...prev,
                            address: result.results[0].formatted_address,
                            lat: latitude,
                            lng: longitude,
                        }));
                    }
                } catch {
                    setForm(prev => ({ ...prev, lat: latitude, lng: longitude }));
                }
            },
            (err) => console.error('Geolocation error:', err),
            { enableHighAccuracy: true }
        );
    };

    const updateField = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const canProceed = () => {
        switch (step) {
            case 0: return form.mobile.length >= 10 && form.customerName.trim().length >= 2;
            case 1: 
                if (form.serviceType === 'installation') {
                    return !!form.tvBrand && !!form.tvSize && !!form.bracketStatus;
                }
                return !!form.tvBrand && form.issueDescription.trim().length >= 5;
            case 2: return form.address.trim().length >= 5;
            default: return false;
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            let issueDescToSave = form.issueDescription;
            if (form.serviceType === 'installation') {
                issueDescToSave = `Installation Bracket: ${form.bracketStatus}${form.issueDescription ? `\nInstructions: ${form.issueDescription}` : ''}`;
            }

            const response = await supabase.rpc('create_customer_booking', {
                p_name: form.customerName,
                p_mobile: form.mobile,
                p_address: form.address,
                p_lat: form.lat || null,
                p_lng: form.lng || null,
                p_tv_brand: form.tvBrand,
                p_tv_model: form.tvModel || null,
                p_tv_size: form.tvSize || null,
                p_issue_description: issueDescToSave || 'No specific description provided.',
                p_service_type: form.serviceType === 'installation' ? 'INSTALLATION' : 'REPAIR'
            });

            if (response.error) throw response.error;
            if (!response.data) throw new Error('Failed to generate ticket number');

            const ticketNumber = String(response.data);

            supabase.functions.invoke('send-push-notification', {
                body: {
                    title: '🎫 New Customer Booking!',
                    body: `${form.customerName} booked ${form.serviceType} for ${form.tvBrand} TV. Ticket: ${ticketNumber}`,
                    url: '/admin/tickets',
                    target_admin: true,
                    event_type: 'CUSTOMER_BOOKING',
                    source_table: 'tickets',
                    target_role: 'ADMIN',
                    target_user_name: 'Admin Team',
                }
            }).catch(console.error);

            setSuccess({ ticketNumber });
        } catch (err: any) {
            console.error('Booking error:', err);
            setError(err.message || 'Something went wrong. Please try again or call us.');
        } finally {
            setSubmitting(false);
        }
    };

    // Success screen is now rendered as an overlay inside the main return (see below)
    // This prevents unmounting the Google Maps Autocomplete which causes __e3_ crashes

    const STEPS_CONFIG = [
        { label: 'Your Details', desc: "We'll use this to send you updates" },
        { label: 'TV Information', desc: "Tell us about your TV and the issue" },
        { label: 'Pickup Location', desc: "Where should we pick up your TV?" },
    ];

    return (
        <Box sx={{ minHeight: '100dvh', background: '#F9FAFB', pb: 12, overflowX: 'hidden', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif' }}>
            {/* Header */}
            <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, background: '#FFF', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
                <IconButton onClick={() => navigate('/')} sx={{ color: '#111827' }} edge="start">
                    <BackIcon />
                </IconButton>
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem' }}>
                    Book Service
                </Typography>
            </Box>

            {/* ═══ BRAND PICKER DIALOG — Circular Brand Buttons ═══ */}
            <Dialog
                open={showBrandPicker}
                onClose={() => setShowBrandPicker(false)}
                fullWidth maxWidth="xs"
                PaperProps={{
                    sx: {
                        position: 'fixed', bottom: 0, m: 0, borderRadius: '24px 24px 0 0',
                        background: '#FFF', maxHeight: '75dvh', width: '100%', overflowY: 'auto'
                    }
                }}
            >
                <DialogContent sx={{ p: 2.5, pt: 2 }}>
                    <Box sx={{ width: 40, height: 5, borderRadius: 3, background: '#E5E7EB', mx: 'auto', mb: 2 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#111827', mb: 0.5, px: 0.5 }}>
                        Select TV Brand
                    </Typography>
                    <Typography sx={{ color: '#9CA3AF', fontSize: '0.78rem', mb: 3, px: 0.5 }}>
                        Popular brands in Hyderabad
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                        {TV_BRANDS.map(brand => {
                            const isSelected = form.tvBrand === brand.name;
                            return (
                                <Box
                                    key={brand.name}
                                    onClick={() => { updateField('tvBrand', brand.name); setShowBrandPicker(false); }}
                                    sx={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease-out',
                                        '&:active': { transform: 'scale(0.94)' }
                                    }}
                                >
                                    {/* Circular Brand badge */}
                                    <Box sx={{
                                        width: 68, height: 68, borderRadius: '50%',
                                        background: '#FFF',
                                        border: isSelected ? `2.5px solid ${brand.color}` : '1.5px solid #F3F4F6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        mb: 1, position: 'relative',
                                        boxShadow: isSelected
                                            ? `0 6px 16px ${brand.color}30, inset 0 0 20px ${brand.bg}`
                                            : '0 4px 12px rgba(0,0,0,0.03)',
                                    }}>
                                        <Typography sx={{
                                            fontWeight: 900,
                                            fontSize: brand.name.length <= 4 ? '1.1rem' : '0.8rem',
                                            color: brand.color,
                                            letterSpacing: brand.name.length <= 3 ? '0.5px' : '-0.3px',
                                            lineHeight: 1,
                                            textTransform: brand.name.length <= 4 ? 'uppercase' : 'none',
                                            position: 'relative', zIndex: 1
                                        }}>
                                            {brand.name.length <= 5 ? brand.name : brand.name.split('/')[0]}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{
                                        fontWeight: isSelected ? 800 : 500,
                                        fontSize: '0.75rem',
                                        color: isSelected ? brand.color : '#4B5563',
                                        textAlign: 'center', lineHeight: 1.2,
                                    }}>
                                        {brand.name}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </DialogContent>
            </Dialog>

            {/* ═══ TV SIZE PICKER DIALOG — Premium Bottom Sheet ═══ */}
            <Dialog
                open={showSizePicker}
                onClose={() => setShowSizePicker(false)}
                fullWidth maxWidth="xs"
                PaperProps={{
                    sx: {
                        position: 'fixed', bottom: 0, m: 0, borderRadius: '24px 24px 0 0',
                        background: '#FFF', maxHeight: '60dvh', width: '100%', overflowY: 'auto'
                    }
                }}
            >
                <DialogContent sx={{ p: 2.5, pt: 2 }}>
                    <Box sx={{ width: 40, height: 5, borderRadius: 3, background: '#E5E7EB', mx: 'auto', mb: 2 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#111827', mb: 3, px: 0.5 }}>
                        Select TV Size
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                        {TV_SIZES.map(size => {
                            const isSelected = form.tvSize === size;
                            return (
                                <Box
                                    key={size}
                                    onClick={() => { updateField('tvSize', size); setShowSizePicker(false); }}
                                    sx={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        py: 2, borderRadius: 3, cursor: 'pointer',
                                        transition: 'all 0.1s ease-out',
                                        border: isSelected ? `2px solid #5B4CF2` : '1.5px solid #F3F4F6',
                                        background: isSelected ? '#F3F0FF' : '#FAFAFA',
                                        '&:active': { transform: 'scale(0.95)' }
                                    }}
                                >
                                    <Typography sx={{
                                        fontWeight: isSelected ? 800 : 600,
                                        fontSize: '1rem',
                                        color: isSelected ? '#5B4CF2' : '#374151',
                                    }}>
                                        {size}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </DialogContent>
            </Dialog>

            <Container maxWidth="sm" sx={{ py: 4, px: { xs: 2.5, sm: 3 } }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Progress Indicators */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 5 }}>
                    {[0, 1, 2].map((num) => (
                        <React.Fragment key={num}>
                            <Box sx={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: step >= num ? '#5B4CF2' : '#E5E7EB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: step >= num ? '#FFF' : '#9CA3AF', fontWeight: 700, fontSize: '0.85rem'
                            }}>
                                {step > num ? <CheckIcon sx={{ fontSize: 18 }} /> : (num + 1)}
                            </Box>
                            {num < 2 && (
                                <Box sx={{ width: 40, height: 2, background: step > num ? '#5B4CF2' : '#E5E7EB', mx: 1 }} />
                            )}
                        </React.Fragment>
                    ))}
                </Box>

                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.4rem', textAlign: 'center', mb: 0.5, letterSpacing: '-0.3px' }}>
                    {STEPS_CONFIG[step].label}
                </Typography>
                <Typography sx={{ color: '#6B7280', textAlign: 'center', fontSize: '0.9rem', mb: 4 }}>
                    {STEPS_CONFIG[step].desc}
                </Typography>

                <Box sx={{ background: '#FFF', borderRadius: 5, p: { xs: 3, sm: 4 }, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
                    
                    {/* ═══ Step 0: Mobile & Name ═══ */}
                    {step === 0 && (
                        <>
                            <Box sx={{ mb: 3 }}>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Mobile Number</Typography>
                                <TextField
                                    fullWidth placeholder="9052222901" value={form.mobile}
                                    onChange={e => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    type="tel"
                                    InputProps={{ startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#111827', fontWeight: 600 }}>+91</Typography></InputAdornment> }}
                                    sx={lightTextFieldStyle}
                                />
                            </Box>
                            <Box sx={{ mb: 1 }}>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Your Name</Typography>
                                <TextField
                                    fullWidth placeholder="e.g. Rahul Kumar" value={form.customerName}
                                    onChange={e => updateField('customerName', e.target.value)}
                                    sx={lightTextFieldStyle}
                                />
                            </Box>
                        </>
                    )}

                    {/* ═══ Step 1: TV Info ═══ */}
                    {step === 1 && (
                        <>
                            <Box sx={{ mb: 3 }}>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1.5 }}>Service Type</Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                                    {SERVICE_TYPES.map(option => {
                                        const isActive = form.serviceType === option.value;
                                        return (
                                            <Box
                                                key={option.value}
                                                onClick={() => updateField('serviceType', option.value)}
                                                sx={{
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
                                                    minWidth: 100, py: 2.5, px: 1, borderRadius: 4, cursor: 'pointer',
                                                    transition: 'all 0.2s', flexShrink: 0,
                                                    border: isActive ? `2px solid ${option.color}` : '1.5px solid #F3F4F6',
                                                    background: '#FFF',
                                                    boxShadow: isActive ? `0 8px 20px ${option.color}25` : '0 2px 8px rgba(0,0,0,0.04)',
                                                    '&:active': { transform: 'scale(0.96)' }
                                                }}
                                            >
                                                <Box sx={{
                                                    width: 90, height: 90, borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    overflow: 'hidden', background: '#FFF',
                                                    boxShadow: isActive ? `0 4px 12px ${option.color}40` : '0 2px 8px rgba(0,0,0,0.06)',
                                                    border: isActive ? '3px solid #FFF' : '2px solid #F9FAFB',
                                                    mb: 0.5
                                                }}>
                                                    <img src={option.image} alt={option.label}
                                                        style={{ 
                                                            width: '100%', height: '100%', objectFit: 'cover', 
                                                            filter: isActive ? 'none' : 'grayscale(0.6)',
                                                            transform: 'scale(1.16)', // Zoom in slightly to perfectly crop the square boundaries away
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                                                        }}
                                                    />
                                                </Box>
                                                <Typography sx={{
                                                    fontWeight: isActive ? 800 : 600, fontSize: '0.75rem',
                                                    color: isActive ? option.color : '#6B7280',
                                                    textAlign: 'center', lineHeight: 1.2
                                                }}>
                                                    {option.label}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>TV Brand *</Typography>
                                <Box
                                    onClick={() => setShowBrandPicker(true)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        py: 1.8, px: 2, borderRadius: 2.5, cursor: 'pointer',
                                        background: '#F9FAFB', border: form.tvBrand ? '2px solid #5B4CF2' : '1.5px solid #E5E7EB',
                                        transition: 'all 0.2s', '&:active': { background: '#F3F4F6' }
                                    }}
                                >
                                    <Typography sx={{ color: form.tvBrand ? '#111827' : '#9CA3AF', fontWeight: form.tvBrand ? 700 : 400, fontSize: '1rem' }}>
                                        {form.tvBrand || 'Tap to select brand'}
                                    </Typography>
                                    <Typography sx={{ color: '#9CA3AF', fontSize: '0.9rem' }}>▾</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Model (Opt)</Typography>
                                    <TextField fullWidth placeholder="e.g. AU7700" value={form.tvModel} onChange={e => updateField('tvModel', e.target.value)} sx={lightTextFieldStyle} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>
                                        {form.serviceType === 'installation' ? 'Size *' : 'Size (Opt)'}
                                    </Typography>
                                    <Box
                                        onClick={() => setShowSizePicker(true)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            py: 1.8, px: 2, borderRadius: 2.5, cursor: 'pointer', height: '56px',
                                            background: '#F9FAFB', border: form.tvSize ? '2px solid #5B4CF2' : '1.5px solid #E5E7EB',
                                            transition: 'all 0.2s', '&:active': { background: '#F3F4F6' }
                                        }}
                                    >
                                        <Typography sx={{ color: form.tvSize ? '#111827' : '#9CA3AF', fontWeight: form.tvSize ? 700 : 400, fontSize: '1rem' }}>
                                            {form.tvSize || 'size'}
                                        </Typography>
                                        <Typography sx={{ color: '#9CA3AF', fontSize: '0.9rem' }}>▾</Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {form.serviceType === 'repair' && (
                                <Box sx={{ mb: 1 }}>
                                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1.5 }}>Describe the Issue *</Typography>
                                {/* Quick select options */}
                                <Box sx={{ 
                                    display: 'flex', overflowX: 'auto', gap: 2, pb: 2, mb: 1, pt: 1, px: 0.5, mx: -0.5,
                                    scrollSnapType: 'x mandatory',
                                    WebkitOverflowScrolling: 'touch',
                                    '&::-webkit-scrollbar': { display: 'none' } 
                                }}>
                                    {COMMON_ISSUES.map(issue => {
                                        const isSelected = form.issueDescription === issue.label;
                                        return (
                                            <Box
                                                key={issue.label}
                                                onClick={() => updateField('issueDescription', issue.label)}
                                                sx={{
                                                    flex: '0 0 auto', width: 135,
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                                                    py: 2.5, px: 1.5, borderRadius: 5, cursor: 'pointer',
                                                    scrollSnapAlign: 'start',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    border: isSelected ? '2px solid #5B4CF2' : '1.5px solid #F3F4F6',
                                                    background: isSelected ? 'linear-gradient(135deg, #F3F0FF 0%, #EDE9FE 100%)' : '#FFF',
                                                    boxShadow: isSelected ? '0 8px 16px rgba(91, 76, 242, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                                                    '&:active': { transform: 'scale(0.96)' }
                                                }}
                                            >
                                                {/* Circular Window to crop out the square bounds of the 3D Image */}
                                                <Box sx={{
                                                    width: 90, height: 90, borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyItems: 'center',
                                                    overflow: 'hidden', background: '#FFF',
                                                    boxShadow: isSelected ? '0 4px 12px rgba(91,76,242,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                                    border: isSelected ? '3px solid #FFF' : '2px solid #F9FAFB',
                                                    mb: 0.5
                                                }}>
                                                    <img src={issue.image} alt={issue.label} style={{
                                                        width: '100%', height: '100%', objectFit: 'cover',
                                                        filter: isSelected ? 'none' : 'grayscale(0.6)',
                                                        transform: 'scale(1.16)', // Zoom in to cleanly clip the outer edges, leaving the podium
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }} />
                                                </Box>
                                                <Typography sx={{
                                                    fontWeight: isSelected ? 800 : 600,
                                                    fontSize: '0.85rem',
                                                    color: isSelected ? '#5B4CF2' : '#4B5563',
                                                    textAlign: 'center', lineHeight: 1.2
                                                }}>
                                                    {issue.label}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                                    <TextField
                                        fullWidth placeholder="Or type your issue here..."
                                        value={form.issueDescription} onChange={e => updateField('issueDescription', e.target.value)}
                                        multiline rows={2} sx={lightTextFieldStyle}
                                    />
                                </Box>
                            )}

                            {form.serviceType === 'installation' && (
                                <Box sx={{ mb: 1 }}>
                                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1.5 }}>Wallmount Bracket *</Typography>
                                    <Box sx={{ 
                                        display: 'flex', overflowX: 'auto', gap: 2, pb: 2, mb: 1, pt: 1, px: 0.5, mx: -0.5,
                                        scrollSnapType: 'x mandatory',
                                        WebkitOverflowScrolling: 'touch',
                                        '&::-webkit-scrollbar': { display: 'none' } 
                                    }}>
                                        {[
                                            { label: 'I Have a Bracket', val: 'Customer has bracket', desc: "We'll install yours", icon: <CheckCircleOutlineIcon sx={{ fontSize: 40 }} /> },
                                            { label: 'Non-Movable', val: 'Needs Fixed Bracket', desc: "Standard flat mount", image: '/assets/brackets/bracket-fixed.png' },
                                            { label: 'Movable', val: 'Needs Movable Bracket', desc: "Swivel/tilt mount", image: '/assets/brackets/bracket-movable.png' }
                                        ].map(opt => {
                                            const isSelected = form.bracketStatus === opt.val;
                                            return (
                                                <Box
                                                    key={opt.val}
                                                    onClick={() => updateField('bracketStatus', opt.val)}
                                                    sx={{
                                                        flex: '0 0 auto', width: 140, // Slightly wider to fit descriptions
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                                                        py: 2.5, px: 1.5, borderRadius: 5, cursor: 'pointer',
                                                        scrollSnapAlign: 'start',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        border: isSelected ? '2px solid #5B4CF2' : '1.5px solid #F3F4F6',
                                                        background: isSelected ? 'linear-gradient(135deg, #F3F0FF 0%, #EDE9FE 100%)' : '#FFF',
                                                        boxShadow: isSelected ? '0 8px 16px rgba(91, 76, 242, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                                                        '&:active': { transform: 'scale(0.96)' }
                                                    }}
                                                >
                                                    {/* Circular Window */}
                                                    <Box sx={{
                                                        width: 90, height: 90, borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        background: opt.image ? '#FFF' : (isSelected ? '#5B4CF2' : '#F3F4F6'),
                                                        color: isSelected ? '#FFF' : '#6B7280',
                                                        boxShadow: isSelected ? '0 4px 12px rgba(91,76,242,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                                        border: isSelected ? '3px solid #FFF' : '2px solid #F9FAFB',
                                                        mb: 0.5,
                                                        transition: 'all 0.3s'
                                                    }}>
                                                        {opt.image ? (
                                                            <img src={opt.image} alt={opt.label} style={{
                                                                width: '100%', height: '100%', objectFit: 'cover',
                                                                filter: isSelected ? 'none' : 'grayscale(0.6)',
                                                                transform: 'scale(1.16)', // Zoom in to cleanly clip the outer edges
                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                            }} />
                                                        ) : opt.icon}
                                                    </Box>
                                                    <Typography sx={{
                                                        fontWeight: isSelected ? 800 : 700,
                                                        fontSize: '0.9rem',
                                                        color: isSelected ? '#5B4CF2' : '#111827',
                                                        textAlign: 'center', lineHeight: 1.2
                                                    }}>
                                                        {opt.label}
                                                    </Typography>
                                                    <Typography sx={{
                                                        fontWeight: 500,
                                                        fontSize: '0.75rem',
                                                        color: isSelected ? '#5B4CF2' : '#6B7280',
                                                        opacity: isSelected ? 0.9 : 1,
                                                        textAlign: 'center', lineHeight: 1.2
                                                    }}>
                                                        {opt.desc}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                    <TextField
                                        fullWidth placeholder="Any specific requirements? (Optional)"
                                        value={form.issueDescription} onChange={e => updateField('issueDescription', e.target.value)}
                                        multiline rows={2} sx={lightTextFieldStyle}
                                    />
                                </Box>
                            )}
                        </>
                    )}

                    {/* ═══ Step 2: Location (Auto-filled!) ═══ */}
                    {step === 2 && (
                        <>
                            {/* Show pre-filled location if available */}
                            {form.address && (
                                <Box sx={{ 
                                    background: '#F0FDF4', border: '1.5px solid #D1FAE5', borderRadius: 3, 
                                    p: 2.5, mb: 3, display: 'flex', alignItems: 'center', gap: 2
                                }}>
                                    <Box sx={{ p: 1, background: '#10B981', borderRadius: '50%', color: '#FFF', display: 'flex' }}>
                                        <LocationIcon sx={{ fontSize: 22 }} />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, color: '#065F46', fontSize: '0.8rem', mb: 0.3 }}>
                                            📍 Auto-filled from your location
                                        </Typography>
                                        <Typography sx={{ color: '#047857', fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {form.address}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            <Button
                                fullWidth variant="outlined" startIcon={<MyLocationIcon />} onClick={handleGetCurrentLocation}
                                sx={{
                                    mb: 3, py: 1.5, borderRadius: 3, color: '#5B4CF2', borderColor: 'rgba(91,76,242,0.3)',
                                    textTransform: 'none', fontWeight: 700, fontSize: '0.95rem',
                                    '&:hover': { borderColor: '#5B4CF2', backgroundColor: 'rgba(91,76,242,0.05)' }
                                }}
                            >
                                {form.address ? 'Refresh Location via GPS' : 'Use My Current Location'}
                            </Button>

                            <Typography sx={{ color: '#9CA3AF', textAlign: 'center', fontSize: '0.85rem', mb: 3, fontWeight: 500 }}>
                                — OR EDIT / TYPE MANUALLY —
                            </Typography>

                            <Box sx={{ mb: 1 }}>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Pickup Address *</Typography>
                                <Autocomplete
                                    onLoad={(auto) => { autocompleteRef.current = auto; }} onPlaceChanged={handlePlaceChanged}
                                    options={{ componentRestrictions: { country: 'in' }, types: ['address'] }}
                                >
                                    <TextField
                                        fullWidth placeholder="Start typing your apartment or street..."
                                        value={form.address} onChange={e => updateField('address', e.target.value)}
                                        multiline rows={2} sx={lightTextFieldStyle}
                                    />
                                </Autocomplete>
                            </Box>

                            {form.lat > 0 && (
                                <Chip icon={<CheckIcon sx={{ fontSize: 16, color: '#10B981 !important' }} />} label="GPS location captured"
                                    sx={{ mt: 2, color: '#065F46', backgroundColor: '#D1FAE5', fontWeight: 600, borderRadius: 2 }}
                                />
                            )}
                        </>
                    )}
                </Box>

                <Typography sx={{ color: '#9CA3AF', fontSize: '0.75rem', textAlign: 'center', mt: 4, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <span style={{ fontSize: '1rem' }}>🔒</span> Your information is secure.
                </Typography>
            </Container>

            {/* Sticky Bottom Actions */}
            <Box sx={{
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #E5E7EB',
                p: 2, display: 'flex', gap: 2, zIndex: 100
            }}>
                <Container maxWidth="sm" sx={{ display: 'flex', gap: 2, p: 0 }}>
                    {step > 0 && (
                        <Button 
                            variant="outlined" onClick={() => setStep(s => s - 1)} 
                            sx={{ flex: 1, py: 1.8, borderRadius: 3, color: '#4B5563', borderColor: '#D1D5DB', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#F3F4F6', borderColor: '#D1D5DB' } }}
                        >
                            Back
                        </Button>
                    )}
                    
                    {step < 2 ? (
                        <Button
                            variant="contained" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}
                            sx={{
                                flex: 2, py: 1.8, borderRadius: 3, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1.05rem',
                                boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' },
                                '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' }
                            }}
                        >
                            Continue
                        </Button>
                    ) : (
                        <Button
                            variant="contained" disabled={!canProceed() || submitting} onClick={handleSubmit}
                            sx={{
                                flex: 2, py: 1.8, borderRadius: 3, background: '#10B981', fontWeight: 800, textTransform: 'none', fontSize: '1.05rem',
                                boxShadow: '0 4px 14px rgba(16,185,129,0.3)', '&:hover': { background: '#059669' },
                                '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' }
                            }}
                        >
                            {submitting ? <CircularProgress size={24} sx={{ color: '#FFF' }} /> : 'Confirm Booking'}
                        </Button>
                    )}
                </Container>
            </Box>

            {/* ════ SUCCESS OVERLAY — rendered ON TOP of the form to avoid unmounting Google Maps ════ */}
            {success && (
                <Box sx={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    p: 3, zIndex: 9999 
                }}>
                    <Card sx={{ maxWidth: 440, width: '100%', borderRadius: 4, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: 'none' }}>
                        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                            <Box sx={{ 
                                width: 80, height: 80, borderRadius: '50%', background: '#D1FAE5', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 
                            }}>
                                <CheckIcon sx={{ fontSize: 44, color: '#10B981' }} />
                            </Box>
                            <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.6rem', mb: 1, letterSpacing: '-0.3px' }}>
                                Booking Confirmed! 🎉
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.95rem', mb: 4 }}>
                                Our expert will arrive at your location shortly. Save your ticket number to track progress.
                            </Typography>

                            <Box sx={{ background: '#F3F4F6', borderRadius: 3, py: 2.5, mb: 4 }}>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', mb: 0.5 }}>
                                    Ticket Number
                                </Typography>
                                <Typography sx={{ color: '#5B4CF2', fontWeight: 800, fontSize: '1.6rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                    {success.ticketNumber}
                                </Typography>
                            </Box>

                            <Button fullWidth variant="contained" onClick={() => navigate(`/track/${success.ticketNumber}`)}
                                sx={{
                                    py: 1.8, borderRadius: 3, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1.05rem', 
                                    mb: 2, boxShadow: '0 4px 14px rgba(91,76,242,0.4)', '&:hover': { background: '#4F46E5' }
                                }}
                            >
                                Track Your TV Status
                            </Button>
                            <Button fullWidth variant="text" onClick={() => navigate('/')} sx={{ color: '#6B7280', textTransform: 'none', fontWeight: 600 }}>
                                Back to Home
                            </Button>
                        </CardContent>
                    </Card>
                </Box>
            )}
        </Box>
    );
};

// Clean Light Theme Inputs
const lightTextFieldStyle = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#F9FAFB', borderRadius: 2.5, color: '#111827', fontSize: '1rem',
        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
        '&:hover fieldset': { borderColor: '#D1D5DB' },
        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
    },
};

export default CustomerBookingPage;
