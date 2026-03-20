"use client";
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Container, Card, CardContent, Chip,
    CircularProgress, Alert, Button, IconButton, TextField,
    Stack, Divider
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    ConfirmationNumber as TicketIcon,
    Login as LoginIcon,
    VpnKey as OtpIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { keyframes } from '@mui/system';

const shimmerKeyframe = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const CustomerTicketsPage: React.FC = () => {
    const { push: navigate } = useRouter();
    const shouldReduce = useReducedMotion();
    
    // Stagger container
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    
    // Stagger item
    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    const [view, setView] = useState<'LOGIN' | 'OTP' | 'TICKETS'>('LOGIN');
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tickets, setTickets] = useState<any[]>([]);

    useEffect(() => {
        const token = (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).getItem('jamestronic_customer_token');
        if (token) {
            setView('TICKETS');
            fetchTickets(token);
        }
    }, []);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mobile || mobile.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fnError } = await supabase.functions.invoke('send-customer-otp', {
                body: { mobile }
            });

            if (fnError) throw fnError;
            if (data?.error) throw new Error(data.error);
            setView('OTP');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP. Have you booked a repair yet?');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length < 4) {
            setError('Please enter a valid OTP.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data: token, error: rpcError } = await supabase.rpc('verify_customer_otp', {
                p_mobile: mobile,
                p_otp: otp
            });

            if (rpcError) throw rpcError;
            
            if (token) {
                (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).setItem('jamestronic_customer_token', token);
                setView('TICKETS');
                await fetchTickets(token);
            } else {
                throw new Error("Invalid OTP");
            }
        } catch (err: any) {
            setError(err.message || 'Failed to verify OTP.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTickets = async (token: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_customer_tickets', {
                p_session_token: token
            });

            if (rpcError) throw rpcError;
            setTickets(data || []);
        } catch (err: any) {
            if (err.message?.includes('Invalid or expired')) {
                handleLogout();
            } else {
                setError(err.message || 'Failed to load tickets.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const token = (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).getItem('jamestronic_customer_token');
        if (token) {
            await supabase.rpc('revoke_customer_session', { p_session_token: token });
        }
        (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).removeItem('jamestronic_customer_token');
        setMobile('');
        setOtp('');
        setTickets([]);
        setView('LOGIN');
        setError(null);
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

    const renderLogin = () => (
        <Card sx={{ background: '#FFF', border: '1px solid #F3F4F6', borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                    <LoginIcon sx={{ fontSize: 32, color: '#5B4CF2' }} />
                </Box>
                <Typography sx={{ color: '#111827', fontWeight: 800, mb: 1, textAlign: 'center', fontSize: '1.4rem', letterSpacing: '-0.3px' }}>
                    Welcome Back
                </Typography>
                <Typography sx={{ color: '#6B7280', mb: 4, textAlign: 'center', fontSize: '0.95rem' }}>
                    Enter the mobile number you used to book your service to view your active repairs.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

                <form onSubmit={handleSendOtp}>
                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Mobile Number</Typography>
                    <TextField
                        fullWidth value={mobile} onChange={(e) => setMobile(e.target.value)}
                        placeholder="e.g. 9876543210" sx={{ mb: 4, ...lightTextFieldStyle }}
                        type="tel"
                    />
                    <Button
                        fullWidth type="submit" variant="contained" disabled={loading || mobile.length < 10}
                        sx={{
                            py: 1.5, borderRadius: 3, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1.05rem',
                            boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' },
                            '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' }
                        }}
                    >
                        {loading ? <CircularProgress size={24} sx={{ color: '#FFF' }} /> : 'Send Login Code'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );

    const renderOtp = () => (
        <Card sx={{ background: '#FFF', border: '1px solid #F3F4F6', borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                    <OtpIcon sx={{ fontSize: 32, color: '#10B981' }} />
                </Box>
                <Typography sx={{ color: '#111827', fontWeight: 800, mb: 1, textAlign: 'center', fontSize: '1.4rem', letterSpacing: '-0.3px' }}>
                    Verify It's You
                </Typography>
                <Typography sx={{ color: '#6B7280', mb: 4, textAlign: 'center', fontSize: '0.95rem' }}>
                    Enter the 6-digit code we sent to <br/><b>+91 {mobile}</b> <br/>
                    <i style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>(Mock OTP: 123456)</i>
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

                <form onSubmit={handleVerifyOtp}>
                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>6-Digit OTP</Typography>
                    <TextField
                        fullWidth value={otp} onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456" sx={{ mb: 4, ...lightTextFieldStyle }}
                        type="tel"
                    />
                    <Button
                        fullWidth type="submit" variant="contained" disabled={loading || otp.length < 4}
                        sx={{
                            py: 1.5, borderRadius: 3, background: '#10B981', fontWeight: 800, textTransform: 'none', fontSize: '1.05rem',
                            boxShadow: '0 4px 14px rgba(16,185,129,0.3)', '&:hover': { background: '#059669' },
                            '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' }
                        }}
                    >
                        {loading ? <CircularProgress size={24} sx={{ color: '#FFF' }} /> : 'Verify & Login'}
                    </Button>
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button color="inherit" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'none' }} onClick={() => setView('LOGIN')}>
                            Use a different number
                        </Button>
                    </Box>
                </form>
            </CardContent>
        </Card>
    );

    const renderTickets = () => (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.5px' }}>
                    My Repairs
                </Typography>
                <Button 
                    startIcon={<LogoutIcon />} onClick={handleLogout} 
                    sx={{ color: '#EF4444', textTransform: 'none', fontWeight: 600, background: '#FEF2F2', borderRadius: 2, px: 2, '&:hover': { background: '#FEE2E2' } }}
                >
                    Logout
                </Button>
            </Box>

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress sx={{ color: '#5B4CF2' }} /></Box>}

            {!loading && tickets.length === 0 && (
                <Card sx={{ background: '#FFF', border: '2px dashed #E5E7EB', borderRadius: 4, textAlign: 'center', py: 6, boxShadow: 'none' }}>
                    <Typography sx={{ color: '#6B7280', mb: 2, fontWeight: 500 }}>No service tickets found.</Typography>
                    <Button variant="contained" onClick={() => navigate('/book')} sx={{ background: '#5B4CF2', textTransform: 'none', fontWeight: 600, borderRadius: 2, boxShadow: 'none', '&:hover': { background: '#4F46E5', boxShadow: 'none' } }}>
                        Book a Service Now
                    </Button>
                </Card>
            )}

            {!loading && tickets.length > 0 && (
                <Stack component={motion.div} variants={shouldReduce ? {} : containerVariants} initial="hidden" animate="show" spacing={2}>
                    {tickets.map((ticket: any) => (
                        <motion.div key={ticket.id} variants={shouldReduce ? {} : itemVariants}>
                            <Card 
                                onClick={() => navigate(`/track/${ticket.ticket_number}`)}
                                sx={{ 
                                    background: '#FFF', 
                                    border: '1px solid #F3F4F6', 
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                    '&:hover': {
                                        borderColor: '#5B4CF2',
                                        boxShadow: '0 8px 24px rgba(91,76,242,0.1)',
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                            >
                                <CardContent sx={{ p: 2.5, pb: '20px !important' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box>
                                            <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'monospace' }}>
                                                {ticket.ticket_number}
                                            </Typography>
                                            <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', mt: 0.5 }}>
                                                {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Typography>
                                        </Box>
                                        <Chip 
                                            label={ticket.status === 'DELIVERED' || ticket.status === 'CLOSED' ? 'Completed' : ticket.status === 'CANCELLED' ? 'Cancelled' : 'Track Status'} 
                                            size="small"
                                            sx={{ 
                                                fontWeight: 800, borderRadius: 2,
                                                ...(ticket.status === 'DELIVERED' || ticket.status === 'CLOSED' 
                                                    ? { 
                                                        background: 'linear-gradient(110deg, #D1FAE5 40%, #A7F3D0 50%, #D1FAE5 60%)', 
                                                        backgroundSize: '200% 100%',
                                                        animation: `${shimmerKeyframe} 2s infinite linear`,
                                                        color: '#065F46' 
                                                      } 
                                                    : ticket.status === 'CANCELLED' 
                                                    ? { background: '#FEE2E2', color: '#991B1B' } 
                                                    : { background: '#E0E7FF', color: '#3730A3' })
                                            }}
                                        />
                                </Box>
                                <Divider sx={{ borderColor: '#F3F4F6', mb: 2 }} />
                                <Box sx={{ display: 'flex', gap: 3, background: '#F9FAFB', p: 1.5, borderRadius: 2 }}>
                                    <Box>
                                        <Typography sx={{ color: '#9CA3AF', fontSize: '0.7rem', fontWeight: 700, mb: 0.3 }}>BRAND</Typography>
                                        <Typography sx={{ color: '#111827', fontSize: '0.9rem', fontWeight: 600 }}>{ticket.tv_brand}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ color: '#9CA3AF', fontSize: '0.7rem', fontWeight: 700, mb: 0.3 }}>SERVICE</Typography>
                                        <Typography sx={{ color: '#111827', fontSize: '0.9rem', fontWeight: 600 }}>
                                            {ticket.service_type === 'INSTALLATION' ? 'Installation' : 'Repair'}
                                        </Typography>
                                    </Box>
                                </Box>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </Stack>
            )}
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100dvh', background: '#F9FAFB', overflowX: 'hidden', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif' }}>
            {/* Header */}
            <Box sx={{
                pt: 'calc(env(safe-area-inset-top) + 16px)', pb: 2, px: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                background: '#FFF', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10
            }}>
                <IconButton onClick={() => navigate('/')} sx={{ color: '#111827' }}>
                    <BackIcon />
                </IconButton>
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem' }}>
                    JamesTronic Account
                </Typography>
            </Box>

            <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
                {view === 'LOGIN' && renderLogin()}
                {view === 'OTP' && renderOtp()}
                {view === 'TICKETS' && renderTickets()}
            </Container>
        </Box>
    );
};

export default CustomerTicketsPage;
