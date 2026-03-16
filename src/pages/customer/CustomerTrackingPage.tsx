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

// Map internal statuses to customer-friendly steps
const STATUS_PIPELINE = [
    { key: 'OPEN', label: 'Booked', icon: <TicketIcon />, color: '#5B4CF2', desc: 'Your service request has been received' },
    { key: 'ASSIGNED_PICKUP', label: 'Pickup Scheduled', icon: <TruckIcon />, color: '#F59E0B', desc: 'A transporter is assigned to pick up your TV' },
    { key: 'IN_TRANSIT_PICKUP', label: 'TV Picked Up', icon: <TruckIcon />, color: '#F59E0B', desc: 'Your TV is on its way to our service centre' },
    { key: 'DIAGNOSED', label: 'Diagnosing', icon: <SearchIcon />, color: '#0EA5E9', desc: 'Our expert technician is examining your TV' },
    { key: 'QUOTED', label: 'Quotation Sent', icon: <ScheduleIcon />, color: '#8B5CF6', desc: 'We\'ve sent you a repair estimate via WhatsApp' },
    { key: 'IN_PROGRESS', label: 'Repairing', icon: <RepairIcon />, color: '#F97316', desc: 'Your TV is being repaired by our certified technician' },
    { key: 'PARTS_ORDERED', label: 'Part Ordered', icon: <InventoryIcon />, color: '#F97316', desc: 'A replacement part has been ordered for your TV' },
    { key: 'REPAIR_DONE', label: 'Repair Complete', icon: <VerifiedIcon />, color: '#10B981', desc: 'Your TV has been repaired and tested ✅' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: <TruckIcon />, color: '#10B981', desc: 'Your TV is on its way back to you!' },
    { key: 'DELIVERED', label: 'Delivered', icon: <CheckIcon />, color: '#10B981', desc: 'Your TV has been delivered. Enjoy! 🎉' },
];

const getStepIndex = (status: string): number => {
    const statusMap: Record<string, number> = {
        'OPEN': 0, 'ASSIGNED': 1, 'DIAGNOSED': 3, 'PENDING_REVIEW': 3,
        'QUOTED': 4, 'IN_PROGRESS': 5, 'PARTS_ORDERED': 6, 'REPAIR_DONE': 7,
        'QUALITY_CHECK': 7, 'READY_FOR_DELIVERY': 7, 'OUT_FOR_DELIVERY': 8,
        'DELIVERED': 9, 'CLOSED': 9, 'CANCELLED': -1,
    };
    return statusMap[status] ?? 0;
};

const CustomerTrackingPage: React.FC = () => {
    const { ticketNumber } = useParams<{ ticketNumber: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState('');
    const [isPolling, setIsPolling] = useState(false);

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
                setIsPolling(true);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load ticket details');
            setIsPolling(false);
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
            setIsPolling(false);
        }
    }, [ticketNumber]);

    useEffect(() => {
        if (!isPolling || !ticketNumber) return;
        const intervalId = setInterval(() => fetchTicket(ticketNumber), 10000);
        return () => clearInterval(intervalId);
    }, [isPolling, ticketNumber]);

    const currentStepIndex = ticket ? getStepIndex(ticket.status) : -1;
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
                                        {STATUS_PIPELINE.map((step, i) => {
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
                                                        {i < STATUS_PIPELINE.length - 1 && (
                                                            <Box sx={{ width: 2, height: 32, my: 0.5, backgroundColor: isCompleted ? step.color : '#F3F4F6', transition: 'background-color 0.5s' }} />
                                                        )}
                                                    </Box>

                                                    <Box sx={{ pb: i < STATUS_PIPELINE.length - 1 ? 2 : 0, pt: 1 }}>
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
