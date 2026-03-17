import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Container, Card, CardContent, Chip,
    CircularProgress, Alert, Button, IconButton, TextField,
    InputAdornment
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    ConfirmationNumber as TicketIcon,
    LocalShipping as TruckIcon,
    Build as RepairIcon,
    CheckCircle as CheckIcon,
    Schedule as ScheduleIcon,
    Search as SearchIcon,
    Inventory as InventoryIcon,
    Verified as VerifiedIcon,
    SupportAgent as SupportIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import PWAInstallPrompt from '../../components/PWAInstallPrompt';

// Map internal REPAIR statuses to customer-friendly steps
const REPAIR_PIPELINE = [
    { key: 'CREATED', label: 'Booked', icon: <TicketIcon />, color: '#6C63FF', desc: 'Your service request has been received' },
    { key: 'DIAGNOSED', label: 'Diagnosing', icon: <SearchIcon />, color: '#8B85FF', desc: 'Our expert technician is prioritizing your TV issue' },
    { key: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled', icon: <ScheduleIcon />, color: '#F59E0B', desc: 'A transporter is assigned to pick up your TV' },
    { key: 'PICKED_UP', label: 'TV Picked Up', icon: <TruckIcon />, color: '#F59E0B', desc: 'Your TV is on its way to our service centre' },
    { key: 'IN_REPAIR', label: 'Repairing', icon: <RepairIcon />, color: '#00D9FF', desc: 'Your TV is actively being repaired by our technician' },
    { key: 'QUOTATION_SENT', label: 'Quotation Sent', icon: <SupportIcon />, color: '#F97316', desc: 'We\'ve sent you a repair estimate via WhatsApp' },
    { key: 'APPROVED', label: 'Repair Approved', icon: <CheckIcon />, color: '#10B981', desc: 'You have approved the repair cost' },
    { key: 'REPAIRED', label: 'Repair Complete', icon: <VerifiedIcon />, color: '#10B981', desc: 'Your TV has been successfully repaired and tested ✅' },
    { key: 'DELIVERY_SCHEDULED', label: 'Out for Delivery', icon: <TruckIcon />, color: '#3B82F6', desc: 'Your TV is on its way back to you!' },
    { key: 'DELIVERED', label: 'Delivered', icon: <CheckIcon />, color: '#10B981', desc: 'Your TV has been delivered. Enjoy! 🎉' },
];

// Map internal INSTALLATION statuses to customer-friendly steps
const INSTALLATION_PIPELINE = [
    { key: 'CREATED', label: 'Booked', icon: <TicketIcon />, color: '#6C63FF', desc: 'Your installation request has been received' },
    { key: 'CONFIRMED', label: 'Confirmed', icon: <CheckIcon />, color: '#10B981', desc: 'Your installation slot is confirmed' },
    { key: 'EN_ROUTE', label: 'Technician Dispatched', icon: <TruckIcon />, color: '#3B82F6', desc: 'Our technician is on the way to your location' },
    { key: 'INSTALLED', label: 'TV Installed', icon: <VerifiedIcon />, color: '#00D9FF', desc: 'Your TV has been successfully installed ✅' },
    { key: 'PAYMENT_COLLECTED', label: 'Payment Collected', icon: <CheckIcon />, color: '#F59E0B', desc: 'Payment has been settled' },
    { key: 'CLOSED', label: 'Completed', icon: <CheckIcon />, color: '#10B981', desc: 'Installation process is complete. Enjoy! 🎉' },
];

const CustomerTrackingPage: React.FC = () => {
    const { ticketNumber } = useParams<{ ticketNumber: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState('');

    const fetchTicket = async (ticketNum: string) => {
        try {
            const { data, error: fetchError } = await supabase.rpc('get_ticket_tracking', { p_ticket_number: ticketNum });
            if (fetchError) throw fetchError;
            if (!data) {
                setError(`No ticket found with number "${ticketNum}". Please check and try again.`);
                setTicket(null);
            } else {
                setTicket(data);
                setError(null);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load ticket details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ticketNumber) {
            setLoading(true);
            fetchTicket(ticketNumber);
        } else {
            setLoading(false);
        }
    }, [ticketNumber]);

    // Real-time synchronization
    useEffect(() => {
        if (!ticketNumber) return;

        const channel = supabase.channel(`customer_tracking_${ticketNumber}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tickets',
                filter: `ticket_number=eq.${ticketNumber}`
            }, (payload) => {
                // Instantly update the displayed status from the payload
                if (payload.new && payload.new.status) {
                    setTicket((prev: any) => prev ? { ...prev, status: payload.new.status } : prev);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ticketNumber]);

    const activePipeline = ticket?.service_type === 'INSTALLATION' ? INSTALLATION_PIPELINE : REPAIR_PIPELINE;
    
    // Find the actual index by matching the exact key, merging CLOSED with DELIVERED/Completed
    let currentStepIndex = -1;
    if (ticket) {
        if (ticket.status === 'CLOSED') {
            currentStepIndex = activePipeline.length - 1; // Last step
        } else {
            currentStepIndex = activePipeline.findIndex(p => p.key === ticket.status);
            // Fallback: If status somehow jumps backwards or isn't in array, we keep it visually active at least
            if (currentStepIndex === -1 && ticket.status !== 'CANCELLED') currentStepIndex = 0; 
        }
    }
    const isCancelled = ticket?.status === 'CANCELLED';

    return (
        <Box sx={{ minHeight: '100dvh', background: '#F9FAFB', pb: 10, overflowX: 'hidden', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif' }}>
            {/* Header */}
            <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, background: '#FFF', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
                <IconButton onClick={() => navigate('/')} sx={{ color: '#111827' }} edge="start">
                    <BackIcon />
                </IconButton>
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem' }}>
                    Track Your TV
                </Typography>
            </Box>

            <Container maxWidth="sm" sx={{ py: 4, px: { xs: 2.5, sm: 3 } }}>
                {!ticketNumber && (
                    <Card sx={{ background: '#FFF', borderRadius: 5, p: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6', mb: 4 }}>
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                                <SearchIcon sx={{ fontSize: 32, color: '#9CA3AF' }} />
                            </Box>
                            <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.2rem', mb: 1, letterSpacing: '-0.3px' }}>
                                Find Your Repair
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', mb: 3 }}>
                                Enter your ticket number to see live status updates.
                            </Typography>
                            
                            <TextField
                                fullWidth placeholder="e.g. JT-20260317001" value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchInput.trim() && navigate(`/track/${searchInput.trim()}`)}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: '#F9FAFB', borderRadius: 2.5, color: '#111827', fontSize: '1rem',
                                        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
                                        '&:hover fieldset': { borderColor: '#D1D5DB' },
                                        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
                                    },
                                }}
                            />
                            <Button
                                fullWidth variant="contained" disabled={!searchInput.trim()}
                                onClick={() => navigate(`/track/${searchInput.trim()}`)}
                                sx={{
                                    py: 1.5, borderRadius: 2.5, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1rem',
                                    boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' },
                                    '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' }
                                }}
                            >
                                Track Status
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress sx={{ color: '#5B4CF2' }} />
                    </Box>
                )}

                {error && !loading && (
                    <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                {ticket && !loading && (
                    <>
                        <Card sx={{ background: '#FFF', borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6', mb: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                                    <Box>
                                        <Typography sx={{ color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                                            Ticket Number
                                        </Typography>
                                        <Typography sx={{ color: '#111827', fontWeight: 900, fontSize: '1.4rem', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                                            {ticket.ticket_number}
                                        </Typography>
                                    </Box>
                                    {isCancelled ? (
                                        <Chip label="Cancelled" color="error" size="small" sx={{ fontWeight: 700, borderRadius: 2 }} />
                                    ) : currentStepIndex >= 9 ? (
                                        <Chip label="Completed ✅" color="success" size="small" sx={{ fontWeight: 700, borderRadius: 2 }} />
                                    ) : (
                                        <Chip
                                            label="In Progress" size="small"
                                            sx={{
                                                fontWeight: 700, color: '#0369A1', backgroundColor: '#E0F2FE', borderRadius: 2,
                                                animation: 'pulse 2s infinite',
                                                '@keyframes pulse': {
                                                    '0%': { boxShadow: '0 0 0 0 rgba(14,165,233,0.3)' },
                                                    '70%': { boxShadow: '0 0 0 8px rgba(14,165,233,0)' },
                                                    '100%': { boxShadow: '0 0 0 0 rgba(14,165,233,0)' },
                                                }
                                            }}
                                        />
                                    )}
                                </Box>
                                
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 2, background: '#F9FAFB', borderRadius: 3, border: '1px solid #F3F4F6' }}>
                                    <Box>
                                        <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>TV Brand</Typography>
                                        <Typography sx={{ color: '#111827', fontSize: '0.95rem', fontWeight: 700 }}>{ticket.tv_brand || '—'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>Service</Typography>
                                        <Typography sx={{ color: '#111827', fontSize: '0.95rem', fontWeight: 700 }}>
                                            {ticket.service_type === 'INSTALLATION' ? '📺 Installation' : '🔧 Repair'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>Booked On</Typography>
                                        <Typography sx={{ color: '#111827', fontSize: '0.9rem', fontWeight: 500 }}>
                                            {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Status Timeline */}
                        <Card sx={{ background: '#FFF', borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
                            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                                <Typography sx={{ color: '#111827', fontWeight: 800, mb: 4, fontSize: '1.2rem', letterSpacing: '-0.3px' }}>
                                    📍 Repair Progress
                                </Typography>

                                {isCancelled ? (
                                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                                        This service request has been cancelled. Please contact us for more info.
                                    </Alert>
                                ) : (
                                    <Box>
                                        {activePipeline.map((step, i) => {
                                            const isCompleted = i < currentStepIndex;
                                            const isCurrent = i === currentStepIndex;
                                            const isFuture = i > currentStepIndex;

                                            return (
                                                <Box key={step.key} sx={{ display: 'flex', mb: 0 }}>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2.5 }}>
                                                        <Box sx={{
                                                            width: 40, height: 40, borderRadius: '50%',
                                                            background: isCompleted ? `${step.color}15` : isCurrent ? `${step.color}20` : '#F3F4F6',
                                                            border: `2px solid ${isCompleted || isCurrent ? step.color : '#E5E7EB'}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: isCompleted ? step.color : isCurrent ? step.color : '#9CA3AF',
                                                            transition: 'all 0.5s',
                                                            ...(isCurrent && {
                                                                animation: 'glow 2s infinite',
                                                                '@keyframes glow': {
                                                                    '0%': { boxShadow: `0 0 0 0 ${step.color}40` },
                                                                    '70%': { boxShadow: `0 0 0 10px ${step.color}00` },
                                                                    '100%': { boxShadow: `0 0 0 0 ${step.color}00` },
                                                                }
                                                            }),
                                                            '& svg': { fontSize: 20 }
                                                        }}>
                                                            {isCompleted ? <CheckIcon sx={{ fontSize: 20 }} /> : step.icon}
                                                        </Box>
                                                        {i < activePipeline.length - 1 && (
                                                            <Box sx={{ width: 2, height: 32, my: 0.5, backgroundColor: isCompleted ? step.color : '#F3F4F6', transition: 'background-color 0.5s' }} />
                                                        )}
                                                    </Box>

                                                    <Box sx={{ pb: i < activePipeline.length - 1 ? 2 : 0, pt: 1 }}>
                                                        <Typography sx={{ color: isCompleted || isCurrent ? '#111827' : '#9CA3AF', fontWeight: isCurrent ? 800 : 700, fontSize: '1rem', transition: 'color 0.3s', letterSpacing: '-0.2px' }}>
                                                            {step.label}
                                                            {isCurrent && (
                                                                <Chip label="Current Phase" size="small" sx={{ ml: 1.5, height: 20, fontSize: '0.65rem', fontWeight: 800, color: step.color, backgroundColor: `${step.color}15`, border: 'none' }} />
                                                            )}
                                                        </Typography>
                                                        {(isCompleted || isCurrent) && (
                                                            <Typography sx={{ color: '#6B7280', fontSize: '0.85rem', mt: 0.5, lineHeight: 1.4 }}>
                                                                {step.desc}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                            <Button
                                variant="outlined" startIcon={<SupportIcon />} href="https://wa.me/919052222901" target="_blank"
                                sx={{ py: 1.5, px: 3, color: '#10B981', borderColor: '#A7F3D0', textTransform: 'none', fontWeight: 700, borderRadius: 3, background: '#ECFDF5', '&:hover': { borderColor: '#10B981', background: '#D1FAE5' } }}
                            >
                                Chat with Support on WhatsApp
                            </Button>
                        </Box>
                    </>
                )}
            </Container>

            <PWAInstallPrompt />
        </Box>
    );
};

export default CustomerTrackingPage;
