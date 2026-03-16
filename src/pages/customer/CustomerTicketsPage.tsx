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
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const CustomerTicketsPage: React.FC = () => {
    const navigate = useNavigate();
    
    const [view, setView] = useState<'LOGIN' | 'OTP' | 'TICKETS'>('LOGIN');
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tickets, setTickets] = useState<any[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('jamestronic_customer_token');
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
            const { data, error: rpcError } = await supabase.rpc('request_customer_otp', {
                p_mobile: mobile
            });

            if (rpcError) throw rpcError;
            
            // For dev/testing only: the RPC returns the mock OTP (123456)
            console.log("Mock OTP to enter:", data);
            
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
                localStorage.setItem('jamestronic_customer_token', token);
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
            // If session is invalid, force logout
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
        const token = localStorage.getItem('jamestronic_customer_token');
        if (token) {
            await supabase.rpc('revoke_customer_session', { p_session_token: token });
        }
        localStorage.removeItem('jamestronic_customer_token');
        setMobile('');
        setOtp('');
        setTickets([]);
        setView('LOGIN');
        setError(null);
    };

    const renderLogin = () => (
        <Card sx={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1 }}>
                    <LoginIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#6C63FF' }} />
                    My Tickets
                </Typography>
                <Typography sx={{ color: '#94A3B8', mb: 4 }}>
                    Enter the mobile number you used to book your service to view and track your tickets.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <form onSubmit={handleSendOtp}>
                    <TextField
                        fullWidth
                        label="Mobile Number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="e.g. 9876543210"
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                color: '#F8FAFC', backgroundColor: 'rgba(15,23,42,0.5)',
                                '& fieldset': { borderColor: 'rgba(148,163,184,0.2)' },
                                '&:hover fieldset': { borderColor: '#6C63FF' },
                                '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
                            },
                        }}
                    />
                    <Button
                        fullWidth type="submit" variant="contained" disabled={loading}
                        sx={{ py: 1.5, background: 'linear-gradient(135deg, #6C63FF, #8B85FF)', fontWeight: 700, borderRadius: 2 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Get OTP'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );

    const renderOtp = () => (
        <Card sx={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1 }}>
                    <OtpIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#10B981' }} />
                    Verify OTP
                </Typography>
                <Typography sx={{ color: '#94A3B8', mb: 4 }}>
                    Enter the OTP sent to {mobile}. <br/>
                    <i>(For testing, use: 123456)</i>
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <form onSubmit={handleVerifyOtp}>
                    <TextField
                        fullWidth label="6-Digit OTP" value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                color: '#F8FAFC', backgroundColor: 'rgba(15,23,42,0.5)',
                                '& fieldset': { borderColor: 'rgba(148,163,184,0.2)' },
                                '&:hover fieldset': { borderColor: '#10B981' },
                                '&.Mui-focused fieldset': { borderColor: '#10B981' },
                            },
                        }}
                    />
                    <Button
                        fullWidth type="submit" variant="contained" disabled={loading}
                        sx={{ py: 1.5, background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 700, borderRadius: 2 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Login'}
                    </Button>
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Button color="inherit" sx={{ color: '#94A3B8' }} onClick={() => setView('LOGIN')}>
                            Change Number
                        </Button>
                    </Box>
                </form>
            </CardContent>
        </Card>
    );

    const renderTickets = () => (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                    My Tickets
                </Typography>
                <Button 
                    startIcon={<LogoutIcon />} onClick={handleLogout} 
                    sx={{ color: '#ef4444', textTransform: 'none' }}
                >
                    Logout
                </Button>
            </Box>

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>}

            {!loading && tickets.length === 0 && (
                <Card sx={{ background: 'rgba(30,41,59,0.5)', border: '1px dashed rgba(148,163,184,0.3)', borderRadius: 3, textAlign: 'center', py: 5 }}>
                    <Typography sx={{ color: '#94A3B8', mb: 2 }}>No service tickets found.</Typography>
                    <Button variant="outlined" onClick={() => navigate('/book')} sx={{ color: '#00D9FF', borderColor: '#00D9FF' }}>
                        Book a Service
                    </Button>
                </Card>
            )}

            {!loading && tickets.length > 0 && (
                <Stack spacing={2}>
                    {tickets.map((ticket: any) => (
                        <Box key={ticket.id}>
                            <Card 
                                onClick={() => navigate(`/track/${ticket.ticket_number}`)}
                                sx={{ 
                                    background: 'rgba(30,41,59,0.4)', 
                                    border: '1px solid rgba(148,163,184,0.1)', 
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        background: 'rgba(30,41,59,0.8)',
                                        borderColor: '#6C63FF',
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box>
                                            <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '1.1rem' }}>
                                                {ticket.ticket_number}
                                            </Typography>
                                            <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                        <Chip 
                                            label={ticket.status === 'DELIVERED' || ticket.status === 'CLOSED' ? 'Completed' : ticket.status === 'CANCELLED' ? 'Cancelled' : 'In Progress'} 
                                            size="small"
                                            color={ticket.status === 'DELIVERED' || ticket.status === 'CLOSED' ? 'success' : ticket.status === 'CANCELLED' ? 'error' : 'primary'}
                                            variant={ticket.status === 'DELIVERED' || ticket.status === 'CLOSED' ? 'filled' : 'outlined'}
                                        />
                                    </Box>
                                    <Divider sx={{ borderColor: 'rgba(148,163,184,0.1)', mb: 1.5 }} />
                                    <Box sx={{ display: 'flex', gap: 3 }}>
                                        <Box>
                                            <Typography sx={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 600 }}>TV BRAND</Typography>
                                            <Typography sx={{ color: '#CBD5E1', fontSize: '0.9rem' }}>{ticket.tv_brand}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography sx={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 600 }}>SERVICE</Typography>
                                            <Typography sx={{ color: '#CBD5E1', fontSize: '0.9rem' }}>
                                                {ticket.service_type === 'INSTALLATION' ? 'Installation' : 'Repair'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Stack>
            )}
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #0A0E1A, #111827)' }}>
            <Box sx={{
                px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: '1px solid rgba(148,163,184,0.05)',
            }}>
                <IconButton onClick={() => navigate('/')} sx={{ color: '#94A3B8' }}>
                    <BackIcon />
                </IconButton>
                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '1.1rem' }}>
                    JamesTronic
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
