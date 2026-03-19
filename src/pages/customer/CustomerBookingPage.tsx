import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Container, Alert, IconButton, CircularProgress
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

// Sub-components (split for maintainability & animation readiness)
import BookingStep1 from './booking/BookingStep1';
import BookingStep2 from './booking/BookingStep2';
import BookingStep3 from './booking/BookingStep3';
import BookingSuccess from './booking/BookingSuccess';

const CustomerBookingPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialMobile = searchParams.get('mobile') || '';
    const initialService = searchParams.get('service') || 'repair';
    const initialIssueKey = searchParams.get('issue');

    // Map URL keys to EXACT labels used in BookingStep2
    const ISSUE_MAP: Record<string, string> = {
        'no_display': 'No display',
        'flickering': 'Flickering',
        'no_sound': 'No sound',
        'power_issue': 'Power issue',
        'lines': 'Lines on screen',
        'screen_repair': 'Screen Repair', // Using 'Screen Repair' since it wasn't in COMMON_ISSUES but matches textfield 
        'not_sure': 'Not sure'
    };
    const initialIssue = initialIssueKey ? (ISSUE_MAP[initialIssueKey] || '') : '';

    const [step, setStep] = useState(0);
    const [isCheckingSession, setIsCheckingSession] = useState(!!localStorage.getItem('jamestronic_customer_token'));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ ticketNumber: string } | null>(null);

    // Pickers (passed down to BookingStep2)
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
        issueDescription: initialIssue,
        address: '',
        lat: 0,
        lng: 0,
        bracketStatus: '',
    });

    // ═══ SESSION-AWARE AUTO-FILL for returning customers ═══
    useEffect(() => {
        const token = localStorage.getItem('jamestronic_customer_token');
        if (token) {
            supabase.rpc('get_customer_profile', { p_session_token: token }).then(({ data, error: err }) => {
                if (!err && data) {
                    setForm(prev => ({
                        ...prev,
                        mobile: data.mobile || prev.mobile,
                        customerName: data.name || prev.customerName,
                        address: data.address || prev.address,
                    }));
                    
                    // Skip Step 1 if we successfully loaded the mobile number and name
                    if (data.mobile && data.name) {
                        setStep(prev => prev === 0 ? 1 : prev);
                    }
                }
                setIsCheckingSession(false);
            });
        }
    }, []);

    // ═══ AUTO-FILL LOCATION from landing page ═══
    useEffect(() => {
        const savedLocation = localStorage.getItem('jt_customer_location');
        const selectedAddrId = localStorage.getItem('jt_selected_address_id');
        const savedAddresses = localStorage.getItem('jt_saved_addresses');

        if (selectedAddrId && savedAddresses) {
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
                const addr = parsed.city || parsed.area || '';
                if (addr) {
                    setForm(prev => ({ ...prev, address: addr }));
                }
            } catch { /* ignore */ }
        }
    }, []);

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

    const shouldReduce = useReducedMotion();

    const STEPS_CONFIG = [
        { label: 'Your Details', desc: "We'll use this to send you updates" },
        { label: 'TV Information', desc: "Tell us about your TV and the issue" },
        { label: 'Pickup Location', desc: "Where should we pick up your TV?" },
    ];

    return (
        <Box sx={{ minHeight: '100dvh', background: '#F9FAFB', pb: 12, overflowX: 'hidden', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif' }}>
            {/* Header */}
            <Box sx={{ pt: 'calc(env(safe-area-inset-top) + 16px)', pb: 2, px: 2, display: 'flex', alignItems: 'center', gap: 1.5, background: '#FFF', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
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

                {isCheckingSession ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', my: 12, opacity: 0.7 }}>
                        <CircularProgress sx={{ color: '#5B4CF2', mb: 2 }} size={32} thickness={5} />
                        <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', fontWeight: 500 }}>Preparing your booking...</Typography>
                    </Box>
                ) : (
                    <>
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

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step} 
                                initial={shouldReduce ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={shouldReduce ? { opacity: 0, x: 0 } : { opacity: 0, x: -20 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                style={{ width: '100%' }}
                            >
                                <Box sx={{ background: '#FFF', borderRadius: 5, p: { xs: 3, sm: 4 }, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
                                    {step === 0 && (
                                        <BookingStep1 form={form} updateField={updateField} />
                                    )}
                                    {step === 1 && (
                                        <BookingStep2
                                            form={form}
                                            updateField={updateField}
                                            showBrandPicker={showBrandPicker}
                                            setShowBrandPicker={setShowBrandPicker}
                                            showSizePicker={showSizePicker}
                                            setShowSizePicker={setShowSizePicker}
                                        />
                                    )}
                                    {step === 2 && (
                                        <BookingStep3 form={form} updateField={updateField} handleGetCurrentLocation={handleGetCurrentLocation} />
                                    )}
                                </Box>
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}

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
                        <Box sx={{ flex: 2, display: 'flex' }}>
                            <motion.div
                                animate={shouldReduce ? false : { 
                                    scale: canProceed() ? [1, 1.05, 1] : 1,
                                    boxShadow: canProceed() ? ['0 4px 14px rgba(91,76,242,0)', '0 4px 14px rgba(91,76,242,0.5)', '0 4px 14px rgba(91,76,242,0.3)'] : 'none'
                                }}
                                transition={{ duration: 0.4 }}
                                style={{ flex: 1, display: 'flex' }}
                            >
                                <Button
                                    fullWidth
                                    variant="contained" disabled={!canProceed()} onClick={() => setStep(s => s + 1)}
                                    sx={{
                                        py: 1.8, borderRadius: 3, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1.05rem',
                                        boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' },
                                        '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' },
                                        transition: 'background 0.3s'
                                    }}
                                >
                                    Continue
                                </Button>
                            </motion.div>
                        </Box>
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

            {/* ════ SUCCESS OVERLAY ════ */}
            {success && <BookingSuccess ticketNumber={success.ticketNumber} />}
        </Box>
    );
};

export default CustomerBookingPage;
