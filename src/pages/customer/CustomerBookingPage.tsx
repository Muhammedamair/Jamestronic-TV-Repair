import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Container, Card, CardContent,
    InputAdornment, Chip, MenuItem, Select, FormControl, InputLabel,
    CircularProgress, Alert, Stepper, Step, StepLabel, StepContent, IconButton,
    FormLabel, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    ArrowForward as ArrowIcon,
    MyLocation as MyLocationIcon,
    CheckCircle as CheckIcon,
    PhoneAndroid as PhoneIcon,
    Tv as TvIcon,
    LocationOn as LocationIcon,
    Description as DescIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const TV_BRANDS = ['Samsung', 'LG', 'Sony', 'Mi/Xiaomi', 'OnePlus', 'TCL', 'Vu', 'Hisense', 'Panasonic', 'Other'];
const LIBRARIES: ("places")[] = ['places'];

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

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
    });

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
            // 1. Call secure RPC to handle customer and ticket creation atomically
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

            // 4. Notify admin via push
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

    // Success Screen
    if (success) {
        return (
            <Box sx={{
                minHeight: '100dvh',
                background: 'linear-gradient(180deg, #0A0E1A, #111827)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                p: 2
            }}>
                <Card sx={{
                    maxWidth: 440, width: '100%',
                    background: 'rgba(30,41,59,0.6)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 4, textAlign: 'center'
                }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'rgba(16,185,129,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', mb: 3,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                                '0%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.3)' },
                                '70%': { boxShadow: '0 0 0 20px rgba(16,185,129,0)' },
                                '100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0)' },
                            }
                        }}>
                            <CheckIcon sx={{ fontSize: 44, color: '#10B981' }} />
                        </Box>
                        <Typography sx={{ color: '#10B981', fontWeight: 800, fontSize: '1.5rem', mb: 1 }}>
                            Booking Confirmed! 🎉
                        </Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.9rem', mb: 3 }}>
                            Our team will contact you shortly to schedule the pickup.
                        </Typography>

                        <Card sx={{
                            background: 'rgba(15,23,42,0.6)',
                            border: '1px solid rgba(148,163,184,0.1)',
                            borderRadius: 2, mb: 3
                        }}>
                            <CardContent sx={{ py: 2 }}>
                                <Typography sx={{ color: '#64748B', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.1em' }}>
                                    Ticket Number
                                </Typography>
                                <Typography sx={{
                                    color: '#F59E0B', fontWeight: 800, fontSize: '1.4rem',
                                    fontFamily: 'monospace', letterSpacing: '0.05em'
                                }}>
                                    {success.ticketNumber}
                                </Typography>
                                <Typography sx={{ color: '#64748B', fontSize: '0.75rem', mt: 0.5 }}>
                                    Save this number to track your TV repair status
                                </Typography>
                            </CardContent>
                        </Card>

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={() => navigate(`/track/${success.ticketNumber}`)}
                            sx={{
                                py: 1.5, borderRadius: 2.5,
                                background: 'linear-gradient(135deg, #00D9FF, #6C63FF)',
                                fontWeight: 700, textTransform: 'none', fontSize: '0.95rem', mb: 1.5,
                                '&:hover': { background: 'linear-gradient(135deg, #00B4D8, #5B54E6)' }
                            }}
                        >
                            🔍 Track Your TV Status
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/')}
                            sx={{ color: '#94A3B8', textTransform: 'none' }}
                        >
                            Back to Home
                        </Button>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    const STEPS_CONFIG = [
        { label: 'Your Details', icon: <PhoneIcon /> },
        { label: 'TV Information', icon: <TvIcon /> },
        { label: 'Pickup Location', icon: <LocationIcon /> },
    ];

    return (
        <Box sx={{
            minHeight: '100dvh',
            background: 'linear-gradient(180deg, #0A0E1A, #111827)',
        }}>
            {/* Header */}
            <Box sx={{
                px: 2, py: 1.5,
                display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: '1px solid rgba(148,163,184,0.05)',
            }}>
                <IconButton onClick={() => navigate('/')} sx={{ color: '#94A3B8' }}>
                    <BackIcon />
                </IconButton>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '1.1rem' }}>
                    Book Service
                </Typography>
            </Box>

            <Container maxWidth="sm" sx={{ py: 3 }}>
                {error && (
                    <Alert severity="error" sx={{
                        mb: 2, backgroundColor: 'rgba(239,68,68,0.1)',
                        color: '#F8FAFC', border: '1px solid rgba(239,68,68,0.3)',
                        '& .MuiAlert-icon': { color: '#EF4444' }
                    }}>
                        {error}
                    </Alert>
                )}

                {/* Step Indicator */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 4 }}>
                    {STEPS_CONFIG.map((s, i) => (
                        <Box key={i} sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                        }}>
                            <Box sx={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: i <= step
                                    ? 'linear-gradient(135deg, #6C63FF, #8B85FF)'
                                    : 'rgba(30,41,59,0.6)',
                                border: `2px solid ${i <= step ? '#6C63FF' : 'rgba(148,163,184,0.15)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: i <= step ? '#FFF' : '#475569',
                                fontSize: '0.75rem', fontWeight: 700,
                                transition: 'all 0.3s',
                            }}>
                                {i < step ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
                            </Box>
                            {i < STEPS_CONFIG.length - 1 && (
                                <Box sx={{
                                    width: { xs: 40, sm: 60 }, height: 2,
                                    backgroundColor: i < step ? '#6C63FF' : 'rgba(148,163,184,0.1)',
                                    borderRadius: 1, transition: 'background-color 0.3s'
                                }} />
                            )}
                        </Box>
                    ))}
                </Box>

                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '1.2rem', textAlign: 'center', mb: 0.5 }}>
                    {STEPS_CONFIG[step].label}
                </Typography>
                <Typography sx={{ color: '#64748B', textAlign: 'center', fontSize: '0.85rem', mb: 3 }}>
                    {step === 0 ? 'We\'ll use this to send you updates' :
                     step === 1 ? 'Tell us about your TV and the issue' :
                     'Where should we pick up your TV?'}
                </Typography>

                {/* ═══ Step 0: Mobile & Name ═══ */}
                {step === 0 && (
                    <Card sx={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <TextField
                                fullWidth
                                label="Mobile Number"
                                placeholder="9885422901"
                                value={form.mobile}
                                onChange={e => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                type="tel"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#94A3B8', fontWeight: 600 }}>+91</Typography></InputAdornment>,
                                }}
                                sx={{ mb: 2.5, ...textFieldStyle }}
                            />
                            <TextField
                                fullWidth
                                label="Your Name"
                                placeholder="e.g. Rahul Kumar"
                                value={form.customerName}
                                onChange={e => updateField('customerName', e.target.value)}
                                sx={{ ...textFieldStyle }}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* ═══ Step 1: TV Info ═══ */}
                {step === 1 && (
                    <Card sx={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <FormControl fullWidth sx={{ mb: 2.5, ...selectStyle }}>
                                <InputLabel sx={{ color: '#94A3B8' }}>TV Brand *</InputLabel>
                                <Select
                                    value={form.tvBrand}
                                    label="TV Brand *"
                                    onChange={e => updateField('tvBrand', e.target.value)}
                                >
                                    {TV_BRANDS.map(b => (
                                        <MenuItem key={b} value={b}>{b}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Service Type */}
                            <FormControl sx={{ mb: 2.5 }}>
                                <FormLabel sx={{ color: '#94A3B8', fontSize: '0.85rem', mb: 1 }}>Service Type</FormLabel>
                                <RadioGroup
                                    row
                                    value={form.serviceType}
                                    onChange={e => updateField('serviceType', e.target.value)}
                                >
                                    <FormControlLabel
                                        value="repair"
                                        control={<Radio sx={{ color: '#64748B', '&.Mui-checked': { color: '#6C63FF' } }} />}
                                        label={<Typography sx={{ color: '#CBD5E1', fontSize: '0.9rem' }}>🔧 TV Repair</Typography>}
                                    />
                                    <FormControlLabel
                                        value="installation"
                                        control={<Radio sx={{ color: '#64748B', '&.Mui-checked': { color: '#10B981' } }} />}
                                        label={<Typography sx={{ color: '#CBD5E1', fontSize: '0.9rem' }}>📺 TV Installation</Typography>}
                                    />
                                </RadioGroup>
                            </FormControl>

                            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                                <TextField
                                    fullWidth
                                    label="TV Model (optional)"
                                    placeholder="e.g. UA55AU7700"
                                    value={form.tvModel}
                                    onChange={e => updateField('tvModel', e.target.value)}
                                    sx={textFieldStyle}
                                />
                                <TextField
                                    fullWidth
                                    label="TV Size (optional)"
                                    placeholder='e.g. 55"'
                                    value={form.tvSize}
                                    onChange={e => updateField('tvSize', e.target.value)}
                                    sx={textFieldStyle}
                                />
                            </Box>

                            <TextField
                                fullWidth
                                label="Describe the Issue *"
                                placeholder="e.g. Screen is flickering, no display, sound issues..."
                                value={form.issueDescription}
                                onChange={e => updateField('issueDescription', e.target.value)}
                                multiline
                                rows={3}
                                sx={textFieldStyle}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* ═══ Step 2: Location ═══ */}
                {step === 2 && (
                    <Card sx={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<MyLocationIcon />}
                                onClick={handleGetCurrentLocation}
                                sx={{
                                    mb: 2.5, py: 1.5, borderRadius: 2,
                                    color: '#00D9FF', borderColor: 'rgba(0,217,255,0.3)',
                                    textTransform: 'none', fontWeight: 600,
                                    '&:hover': { borderColor: '#00D9FF', backgroundColor: 'rgba(0,217,255,0.05)' }
                                }}
                            >
                                📍 Use My Current Location
                            </Button>

                            <Typography sx={{ color: '#475569', textAlign: 'center', fontSize: '0.8rem', mb: 2 }}>
                                — or type your address —
                            </Typography>

                            {isLoaded ? (
                                <Autocomplete
                                    onLoad={(auto) => { autocompleteRef.current = auto; }}
                                    onPlaceChanged={handlePlaceChanged}
                                    options={{
                                        componentRestrictions: { country: 'in' },
                                        types: ['address'],
                                    }}
                                >
                                    <TextField
                                        fullWidth
                                        label="Pickup Address *"
                                        placeholder="Start typing your address..."
                                        value={form.address}
                                        onChange={e => updateField('address', e.target.value)}
                                        multiline
                                        rows={2}
                                        sx={textFieldStyle}
                                    />
                                </Autocomplete>
                            ) : (
                                <TextField
                                    fullWidth
                                    label="Pickup Address *"
                                    placeholder="Enter your full address"
                                    value={form.address}
                                    onChange={e => updateField('address', e.target.value)}
                                    multiline
                                    rows={2}
                                    sx={textFieldStyle}
                                />
                            )}

                            {form.lat > 0 && (
                                <Chip
                                    icon={<CheckIcon sx={{ fontSize: 14, color: '#10B981 !important' }} />}
                                    label="GPS location captured"
                                    size="small"
                                    sx={{
                                        mt: 1.5, color: '#10B981',
                                        backgroundColor: 'rgba(16,185,129,0.1)',
                                        border: '1px solid rgba(16,185,129,0.2)',
                                    }}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Navigation Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                    {step > 0 ? (
                        <Button
                            onClick={() => setStep(s => s - 1)}
                            startIcon={<BackIcon />}
                            sx={{ color: '#94A3B8', textTransform: 'none', fontWeight: 600 }}
                        >
                            Back
                        </Button>
                    ) : <Box />}

                    {step < 2 ? (
                        <Button
                            variant="contained"
                            disabled={!canProceed()}
                            onClick={() => setStep(s => s + 1)}
                            endIcon={<ArrowIcon />}
                            sx={{
                                px: 4, py: 1.3, borderRadius: 2.5,
                                background: 'linear-gradient(135deg, #6C63FF, #8B85FF)',
                                fontWeight: 700, textTransform: 'none',
                                '&:hover': { background: 'linear-gradient(135deg, #5B54E6, #7B75FF)' },
                                '&.Mui-disabled': { background: 'rgba(30,41,59,0.6)', color: '#475569' }
                            }}
                        >
                            Continue
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            disabled={!canProceed() || submitting}
                            onClick={handleSubmit}
                            endIcon={submitting ? <CircularProgress size={18} sx={{ color: '#FFF' }} /> : <CheckIcon />}
                            sx={{
                                px: 4, py: 1.3, borderRadius: 2.5,
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                fontWeight: 700, textTransform: 'none', fontSize: '1rem',
                                boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
                                '&:hover': { background: 'linear-gradient(135deg, #059669, #047857)' },
                                '&.Mui-disabled': { background: 'rgba(30,41,59,0.6)', color: '#475569' }
                            }}
                        >
                            {submitting ? 'Booking...' : 'Confirm Booking'}
                        </Button>
                    )}
                </Box>

                {/* Security Note */}
                <Typography sx={{
                    color: '#334155', fontSize: '0.7rem', textAlign: 'center', mt: 4, px: 2
                }}>
                    🔒 Your information is secure. We only use it to process your service request.
                </Typography>
            </Container>
        </Box>
    );
};

// Shared TextField styling
const textFieldStyle = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(15,23,42,0.5)',
        borderRadius: 2,
        color: '#F8FAFC',
        '& fieldset': { borderColor: 'rgba(148,163,184,0.15)' },
        '&:hover fieldset': { borderColor: 'rgba(108,99,255,0.4)' },
        '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
    },
    '& .MuiInputLabel-root': { color: '#94A3B8' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6C63FF' },
};

const selectStyle = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(15,23,42,0.5)',
        borderRadius: 2,
        color: '#F8FAFC',
        '& fieldset': { borderColor: 'rgba(148,163,184,0.15)' },
        '&:hover fieldset': { borderColor: 'rgba(108,99,255,0.4)' },
        '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
    },
    '& .MuiInputLabel-root': { color: '#94A3B8' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#6C63FF' },
    '& .MuiSelect-icon': { color: '#94A3B8' },
};

export default CustomerBookingPage;
