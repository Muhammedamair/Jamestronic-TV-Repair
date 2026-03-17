import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Container, Card, CardContent, Button, CircularProgress,
    Avatar, Divider, Stack, Alert, IconButton, TextField
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    LocationOn as LocationIcon,
    ConfirmationNumber as TicketIcon,
    Build as RepairIcon,
    Logout as LogoutIcon,
    ChevronRight as ChevronRightIcon,
    History as HistoryIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

interface CustomerProfile {
    name: string;
    mobile: string;
    address: string;
    total_bookings: number;
}

const CustomerAccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Login state
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState('');
    const [view, setView] = useState<'LOGIN' | 'OTP' | 'PROFILE'>('LOGIN');
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('jamestronic_customer_token');
        if (token) {
            setIsLoggedIn(true);
            setView('PROFILE');
            fetchProfile(token);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchProfile = async (token: string) => {
        setLoading(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_customer_profile', {
                p_session_token: token
            });
            if (rpcError) throw rpcError;
            if (data) setProfile(data);
        } catch (err: any) {
            if (err.message?.includes('Invalid or expired')) {
                handleLogout();
            }
            console.error('Profile fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mobile || mobile.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }
        setActionLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('request_customer_otp', { p_mobile: mobile });
            if (rpcError) throw rpcError;
            console.log("Mock OTP:", data);
            setView('OTP');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length < 4) {
            setError('Please enter a valid OTP.');
            return;
        }
        setActionLoading(true);
        setError(null);
        try {
            const { data: token, error: rpcError } = await supabase.rpc('verify_customer_otp', { p_mobile: mobile, p_otp: otp });
            if (rpcError) throw rpcError;
            if (token) {
                localStorage.setItem('jamestronic_customer_token', token);
                // Also save mobile for booking auto-fill
                localStorage.setItem('jamestronic_customer_mobile', mobile);
                setIsLoggedIn(true);
                setView('PROFILE');
                await fetchProfile(token);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to verify OTP.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = async () => {
        const token = localStorage.getItem('jamestronic_customer_token');
        if (token) {
            try { await supabase.rpc('revoke_customer_session', { p_session_token: token }); } catch { /* ignore */ }
        }
        localStorage.removeItem('jamestronic_customer_token');
        localStorage.removeItem('jamestronic_customer_mobile');
        localStorage.removeItem('jamestronic_customer_name');
        setProfile(null);
        setIsLoggedIn(false);
        setMobile('');
        setOtp('');
        setView('LOGIN');
        setError(null);
    };

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
                    <PersonIcon sx={{ fontSize: 32, color: '#5B4CF2' }} />
                </Box>
                <Typography sx={{ color: '#111827', fontWeight: 800, mb: 1, textAlign: 'center', fontSize: '1.4rem', letterSpacing: '-0.3px' }}>
                    Sign In to Your Account
                </Typography>
                <Typography sx={{ color: '#6B7280', mb: 4, textAlign: 'center', fontSize: '0.95rem' }}>
                    Enter the mobile number you used to book your service.
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
                <form onSubmit={handleSendOtp}>
                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Mobile Number</Typography>
                    <TextField fullWidth value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="e.g. 9876543210" sx={{ mb: 4, ...lightTextFieldStyle }} type="tel" />
                    <Button fullWidth type="submit" variant="contained" disabled={actionLoading || mobile.length < 10}
                        sx={{ py: 1.5, borderRadius: 3, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1.05rem', boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' }, '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' } }}>
                        {actionLoading ? <CircularProgress size={24} sx={{ color: '#FFF' }} /> : 'Send Login Code'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );

    const renderOtp = () => (
        <Card sx={{ background: '#FFF', border: '1px solid #F3F4F6', borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography sx={{ color: '#111827', fontWeight: 800, mb: 1, textAlign: 'center', fontSize: '1.4rem' }}>Verify It's You</Typography>
                <Typography sx={{ color: '#6B7280', mb: 4, textAlign: 'center', fontSize: '0.95rem' }}>
                    Enter the 6-digit code sent to <b>+91 {mobile}</b><br/>
                    <i style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>(Dev OTP: 123456)</i>
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
                <form onSubmit={handleVerifyOtp}>
                    <TextField fullWidth value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" sx={{ mb: 4, ...lightTextFieldStyle }} type="tel" />
                    <Button fullWidth type="submit" variant="contained" disabled={actionLoading || otp.length < 4}
                        sx={{ py: 1.5, borderRadius: 3, background: '#10B981', fontWeight: 800, textTransform: 'none', fontSize: '1.05rem', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', '&:hover': { background: '#059669' }, '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' } }}>
                        {actionLoading ? <CircularProgress size={24} sx={{ color: '#FFF' }} /> : 'Verify & Login'}
                    </Button>
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button color="inherit" sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'none' }} onClick={() => setView('LOGIN')}>Use a different number</Button>
                    </Box>
                </form>
            </CardContent>
        </Card>
    );

    const renderProfile = () => {
        if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: '#5B4CF2' }} /></Box>;

        return (
            <Box>
                {/* Profile Card */}
                <Card sx={{ background: 'linear-gradient(135deg, #5B4CF2 0%, #4338CA 100%)', borderRadius: 5, mb: 3, boxShadow: '0 8px 32px rgba(91,76,242,0.3)' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)', fontSize: '1.4rem', fontWeight: 800 }}>
                                {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: '1.3rem', lineHeight: 1.2 }}>
                                    {profile?.name || 'Customer'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                    <PhoneIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
                                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                                        +91 {profile?.mobile || '—'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', mb: 2 }} />
                        <Box sx={{ display: 'flex', gap: 3 }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: '1.6rem' }}>{profile?.total_bookings || 0}</Typography>
                                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600 }}>Total Bookings</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: '1.6rem' }}>⭐</Typography>
                                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600 }}>Valued Customer</Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem', mb: 2 }}>Quick Actions</Typography>
                <Stack spacing={1.5} sx={{ mb: 3 }}>
                    <Card onClick={() => navigate('/book?service=repair')} sx={{ cursor: 'pointer', background: '#FFF', border: '1px solid #F3F4F6', borderRadius: 3, boxShadow: 'none', transition: 'all 0.2s', '&:hover': { borderColor: '#5B4CF2', boxShadow: '0 4px 16px rgba(91,76,242,0.1)' } }}>
                        <CardContent sx={{ p: 2, pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ background: '#EDE9FE', p: 1.2, borderRadius: 2, display: 'flex' }}><AddIcon sx={{ color: '#5B4CF2' }} /></Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 700, color: '#111827' }}>Book New Service</Typography>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.8rem' }}>TV Repair, Installation, Uninstallation</Typography>
                            </Box>
                            <ChevronRightIcon sx={{ color: '#D1D5DB' }} />
                        </CardContent>
                    </Card>

                    <Card onClick={() => navigate('/buy')} sx={{ cursor: 'pointer', background: '#FFF', border: '1px solid #F3F4F6', borderRadius: 3, boxShadow: 'none', transition: 'all 0.2s', '&:hover': { borderColor: '#10B981', boxShadow: '0 4px 16px rgba(16,185,129,0.1)' } }}>
                        <CardContent sx={{ p: 2, pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ background: '#D1FAE5', p: 1.2, borderRadius: 2, display: 'flex' }}><RepairIcon sx={{ color: '#059669' }} /></Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 700, color: '#111827' }}>Buy Electronics</Typography>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.8rem' }}>Smart TVs, Soundbars & Accessories</Typography>
                            </Box>
                            <ChevronRightIcon sx={{ color: '#D1D5DB' }} />
                        </CardContent>
                    </Card>
                </Stack>

                {/* Address */}
                {profile?.address && (
                    <>
                        <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem', mb: 2 }}>Saved Address</Typography>
                        <Card sx={{ background: '#FFF', border: '1px solid #F3F4F6', borderRadius: 3, boxShadow: 'none', mb: 3 }}>
                            <CardContent sx={{ p: 2, pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ background: '#FEF3C7', p: 1.2, borderRadius: 2, display: 'flex' }}><LocationIcon sx={{ color: '#D97706' }} /></Box>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.9rem', flex: 1, lineHeight: 1.5 }}>{profile.address}</Typography>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Logout */}
                <Button fullWidth variant="outlined" startIcon={<LogoutIcon />} onClick={handleLogout}
                    sx={{ py: 1.5, borderRadius: 3, borderColor: '#FCA5A5', color: '#EF4444', fontWeight: 700, textTransform: 'none', fontSize: '1rem', '&:hover': { background: '#FEF2F2', borderColor: '#EF4444' } }}>
                    Sign Out
                </Button>
            </Box>
        );
    };

    return (
        <Box sx={{ minHeight: '100dvh', background: '#F9FAFB', overflowX: 'hidden', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif', pb: 12 }}>
            <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, background: '#FFF', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
                <IconButton onClick={() => navigate('/')} sx={{ color: '#111827' }}><BackIcon /></IconButton>
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem' }}>My Account</Typography>
            </Box>
            <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
                {view === 'LOGIN' && renderLogin()}
                {view === 'OTP' && renderOtp()}
                {view === 'PROFILE' && renderProfile()}
            </Container>
        </Box>
    );
};

export default CustomerAccountPage;
