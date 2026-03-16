import React, { useState, useRef } from 'react';
import {
    Box, Typography, Button, TextField, Container, Card, CardContent,
    InputAdornment, IconButton, FormControl, InputLabel, Select, MenuItem,
    RadioGroup, FormControlLabel, Radio, FormLabel, CircularProgress, Chip, Alert
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    MyLocation as MyLocationIcon,
    CheckCircle as CheckIcon,
    PhoneAndroid as PhoneIcon,
    Tv as TvIcon,
    LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Autocomplete } from '@react-google-maps/api';

const TV_BRANDS = ['Samsung', 'LG', 'Sony', 'Mi/Xiaomi', 'OnePlus', 'TCL', 'Vu', 'Hisense', 'Panasonic', 'Other'];

const CustomerBookingPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialMobile = searchParams.get('mobile') || '';
    const initialService = searchParams.get('service') || 'repair';

    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ ticketNumber: string } | null>(null);

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
    });

    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

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
                // Reverse geocode
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
            case 1: return form.tvBrand && form.issueDescription.trim().length >= 5;
            case 2: return form.address.trim().length >= 5;
            default: return false;
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const { data: ticketNumber, error: rpcErr } = await supabase.rpc('create_customer_booking', {
                p_name: form.customerName,
                p_mobile: form.mobile,
                p_address: form.address,
                p_lat: form.lat || null,
                p_lng: form.lng || null,
                p_tv_brand: form.tvBrand,
                p_tv_model: form.tvModel || null,
                p_tv_size: form.tvSize || null,
                p_issue_description: form.issueDescription,
                p_service_type: form.serviceType === 'installation' ? 'INSTALLATION' : 'REPAIR'
            });

            if (rpcErr) throw rpcErr;
            if (!ticketNumber) throw new Error('Failed to generate ticket number');

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

    // ════ SUCCESS SCREEN ════
    if (success) {
        return (
            <Box sx={{ minHeight: '100dvh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
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
        );
    }

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
                                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Service Type</Typography>
                                <RadioGroup row value={form.serviceType} onChange={e => updateField('serviceType', e.target.value)}>
                                    <FormControlLabel value="repair" control={<Radio sx={{ color: '#D1D5DB', '&.Mui-checked': { color: '#5B4CF2' } }} />} label={<Typography sx={{ color: '#111827', fontSize: '0.9rem', fontWeight: 500 }}>TV Repair</Typography>} />
                                    <FormControlLabel value="installation" control={<Radio sx={{ color: '#D1D5DB', '&.Mui-checked': { color: '#5B4CF2' } }} />} label={<Typography sx={{ color: '#111827', fontSize: '0.9rem', fontWeight: 500 }}>Installation</Typography>} />
                                    <FormControlLabel value="uninstallation" control={<Radio sx={{ color: '#D1D5DB', '&.Mui-checked': { color: '#5B4CF2' } }} />} label={<Typography sx={{ color: '#111827', fontSize: '0.9rem', fontWeight: 500 }}>Unmount</Typography>} />
                                </RadioGroup>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>TV Brand *</Typography>
                                <FormControl fullWidth sx={lightSelectStyle}>
                                    <Select displayEmpty value={form.tvBrand} onChange={e => updateField('tvBrand', e.target.value)}>
                                        <MenuItem value="" disabled>Select Brand</MenuItem>
                                        {TV_BRANDS.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Model (Opt)</Typography>
                                    <TextField fullWidth placeholder="e.g. AU7700" value={form.tvModel} onChange={e => updateField('tvModel', e.target.value)} sx={lightTextFieldStyle} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Size (Opt)</Typography>
                                    <TextField fullWidth placeholder='e.g. 55"' value={form.tvSize} onChange={e => updateField('tvSize', e.target.value)} sx={lightTextFieldStyle} />
                                </Box>
                            </Box>

                            <Box sx={{ mb: 1 }}>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Describe the Issue *</Typography>
                                <TextField
                                    fullWidth placeholder="e.g. Screen is flickering, no display, sound issues..."
                                    value={form.issueDescription} onChange={e => updateField('issueDescription', e.target.value)}
                                    multiline rows={3} sx={lightTextFieldStyle}
                                />
                            </Box>
                        </>
                    )}

                    {/* ═══ Step 2: Location ═══ */}
                    {step === 2 && (
                        <>
                            <Button
                                fullWidth variant="outlined" startIcon={<MyLocationIcon />} onClick={handleGetCurrentLocation}
                                sx={{
                                    mb: 3, py: 1.5, borderRadius: 3, color: '#5B4CF2', borderColor: 'rgba(91,76,242,0.3)',
                                    textTransform: 'none', fontWeight: 700, fontSize: '0.95rem',
                                    '&:hover': { borderColor: '#5B4CF2', backgroundColor: 'rgba(91,76,242,0.05)' }
                                }}
                            >
                                Use My Current Location
                            </Button>

                            <Typography sx={{ color: '#9CA3AF', textAlign: 'center', fontSize: '0.85rem', mb: 3, fontWeight: 500 }}>
                                — OR TYPE MANUALLY —
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

const lightSelectStyle = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#F9FAFB', borderRadius: 2.5, color: '#111827', fontSize: '1rem',
        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
        '&:hover fieldset': { borderColor: '#D1D5DB' },
        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
    },
};

export default CustomerBookingPage;
