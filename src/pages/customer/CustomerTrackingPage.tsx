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

// Map internal statuses to customer-friendly steps
const STATUS_PIPELINE = [
    { key: 'OPEN', label: 'Booked', icon: <TicketIcon />, color: '#6C63FF', desc: 'Your service request has been received' },
    { key: 'ASSIGNED_PICKUP', label: 'Pickup Scheduled', icon: <TruckIcon />, color: '#F59E0B', desc: 'A transporter is assigned to pick up your TV' },
    { key: 'IN_TRANSIT_PICKUP', label: 'TV Picked Up', icon: <TruckIcon />, color: '#F59E0B', desc: 'Your TV is on its way to our service centre' },
    { key: 'DIAGNOSED', label: 'Diagnosing', icon: <SearchIcon />, color: '#00D9FF', desc: 'Our expert technician is examining your TV' },
    { key: 'QUOTED', label: 'Quotation Sent', icon: <ScheduleIcon />, color: '#A855F7', desc: 'We\'ve sent you a repair estimate via WhatsApp' },
    { key: 'IN_PROGRESS', label: 'Repairing', icon: <RepairIcon />, color: '#F97316', desc: 'Your TV is being repaired by our certified technician' },
    { key: 'PARTS_ORDERED', label: 'Part Ordered', icon: <InventoryIcon />, color: '#F97316', desc: 'A replacement part has been ordered for your TV' },
    { key: 'REPAIR_DONE', label: 'Repair Complete', icon: <VerifiedIcon />, color: '#10B981', desc: 'Your TV has been repaired and tested ✅' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: <TruckIcon />, color: '#10B981', desc: 'Your TV is on its way back to you!' },
    { key: 'DELIVERED', label: 'Delivered', icon: <CheckIcon />, color: '#10B981', desc: 'Your TV has been delivered. Enjoy! 🎉' },
];

// Map actual ticket status to pipeline index
const getStepIndex = (status: string): number => {
    // Map various internal statuses to our customer pipeline
    const statusMap: Record<string, number> = {
        'OPEN': 0,
        'ASSIGNED': 1,  // Transporter assigned for pickup
        'DIAGNOSED': 3,
        'PENDING_REVIEW': 3,
        'QUOTED': 4,
        'IN_PROGRESS': 5,
        'PARTS_ORDERED': 6,
        'REPAIR_DONE': 7,
        'QUALITY_CHECK': 7,
        'READY_FOR_DELIVERY': 7,
        'OUT_FOR_DELIVERY': 8,
        'DELIVERED': 9,
        'CLOSED': 9,
        'CANCELLED': -1,
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
            const { data, error: fetchError } = await supabase.rpc('get_ticket_tracking', {
                p_ticket_number: ticketNum
            });

            if (fetchError) throw fetchError;
            if (!data) {
                setError(`No ticket found with number "${ticketNum}". Please check and try again.`);
                setTicket(null);
            } else {
                setTicket(data);
                setError(null);
                setIsPolling(true); // Start polling once we successfully find it
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

    // Secure Polling mechanism (replaces Realtime to prevent RLS data leaks)
    useEffect(() => {
        if (!isPolling || !ticketNumber) return;

        const intervalId = setInterval(() => {
            fetchTicket(ticketNumber);
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(intervalId);
    }, [isPolling, ticketNumber]);

    const currentStepIndex = ticket ? getStepIndex(ticket.status) : -1;
    const isCancelled = ticket?.status === 'CANCELLED';

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
                    Track Your TV
                </Typography>
            </Box>

            <Container maxWidth="sm" sx={{ py: 3 }}>
                {/* Search Bar (if no ticket number in URL) */}
                {!ticketNumber && (
                    <Card sx={{
                        background: 'rgba(30,41,59,0.5)',
                        border: '1px solid rgba(148,163,184,0.1)',
                        borderRadius: 3, mb: 3
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography sx={{ color: '#F8FAFC', fontWeight: 600, mb: 2 }}>
                                Enter your ticket number
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <TextField
                                    fullWidth
                                    placeholder="e.g. JT-20260317001"
                                    value={searchInput}
                                    onChange={e => setSearchInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && searchInput.trim() && navigate(`/track/${searchInput.trim()}`)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: 2, color: '#F8FAFC',
                                            '& fieldset': { borderColor: 'rgba(148,163,184,0.15)' },
                                            '&:hover fieldset': { borderColor: 'rgba(0,217,255,0.4)' },
                                            '&.Mui-focused fieldset': { borderColor: '#00D9FF' },
                                        },
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    disabled={!searchInput.trim()}
                                    onClick={() => navigate(`/track/${searchInput.trim()}`)}
                                    sx={{
                                        px: 3, borderRadius: 2,
                                        background: 'linear-gradient(135deg, #00D9FF, #6C63FF)',
                                        fontWeight: 700, textTransform: 'none',
                                    }}
                                >
                                    Track
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {/* Loading */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress sx={{ color: '#6C63FF' }} />
                    </Box>
                )}

                {/* Error */}
                {error && !loading && (
                    <Alert severity="warning" sx={{
                        mb: 3, backgroundColor: 'rgba(245,158,11,0.1)',
                        color: '#F8FAFC', border: '1px solid rgba(245,158,11,0.3)',
                        '& .MuiAlert-icon': { color: '#F59E0B' }
                    }}>
                        {error}
                    </Alert>
                )}

                {/* Ticket Found */}
                {ticket && !loading && (
                    <>
                        {/* Ticket Info Card */}
                        <Card sx={{
                            background: 'rgba(30,41,59,0.5)',
                            border: '1px solid rgba(108,99,255,0.15)',
                            borderRadius: 3, mb: 3
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Box>
                                        <Typography sx={{ color: '#64748B', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                                            Ticket Number
                                        </Typography>
                                        <Typography sx={{ color: '#F59E0B', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'monospace' }}>
                                            {ticket.ticket_number}
                                        </Typography>
                                    </Box>
                                    {isCancelled ? (
                                        <Chip label="Cancelled" color="error" size="small" variant="outlined" />
                                    ) : currentStepIndex >= 9 ? (
                                        <Chip label="Completed ✅" color="success" size="small" variant="outlined" />
                                    ) : (
                                        <Chip
                                            label="In Progress"
                                            size="small"
                                            sx={{
                                                color: '#00D9FF',
                                                backgroundColor: 'rgba(0,217,255,0.1)',
                                                border: '1px solid rgba(0,217,255,0.3)',
                                                animation: 'pulse 2s infinite',
                                                '@keyframes pulse': {
                                                    '0%': { boxShadow: '0 0 0 0 rgba(0,217,255,0.2)' },
                                                    '70%': { boxShadow: '0 0 0 8px rgba(0,217,255,0)' },
                                                    '100%': { boxShadow: '0 0 0 0 rgba(0,217,255,0)' },
                                                }
                                            }}
                                        />
                                    )}
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                    <Box>
                                        <Typography sx={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 600 }}>TV Brand</Typography>
                                        <Typography sx={{ color: '#CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}>{ticket.tv_brand || '—'}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography sx={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 600 }}>Service</Typography>
                                        <Typography sx={{ color: '#CBD5E1', fontSize: '0.9rem', fontWeight: 600 }}>
                                            {ticket.service_type === 'INSTALLATION' ? '📺 Installation' : '🔧 Repair'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Typography sx={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 600 }}>Booked On</Typography>
                                        <Typography sx={{ color: '#CBD5E1', fontSize: '0.85rem' }}>
                                            {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Status Timeline */}
                        <Card sx={{
                            background: 'rgba(30,41,59,0.4)',
                            border: '1px solid rgba(148,163,184,0.08)',
                            borderRadius: 3,
                        }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Typography sx={{ color: '#F8FAFC', fontWeight: 700, mb: 3, fontSize: '1rem' }}>
                                    📍 Repair Progress
                                </Typography>

                                {isCancelled ? (
                                    <Alert severity="error" sx={{
                                        backgroundColor: 'rgba(239,68,68,0.1)',
                                        color: '#F8FAFC', border: '1px solid rgba(239,68,68,0.3)',
                                    }}>
                                        This service request has been cancelled. Please contact us for more info.
                                    </Alert>
                                ) : (
                                    <Box>
                                        {STATUS_PIPELINE.map((step, i) => {
                                            const isCompleted = i < currentStepIndex;
                                            const isCurrent = i === currentStepIndex;
                                            const isFuture = i > currentStepIndex;

                                            return (
                                                <Box key={step.key} sx={{ display: 'flex', mb: i < STATUS_PIPELINE.length - 1 ? 0 : 0 }}>
                                                    {/* Timeline line + dot */}
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                                                        <Box sx={{
                                                            width: 36, height: 36,
                                                            borderRadius: '50%',
                                                            background: isCompleted ? `${step.color}20` :
                                                                       isCurrent ? `${step.color}30` :
                                                                       'rgba(30,41,59,0.6)',
                                                            border: `2px solid ${isCompleted || isCurrent ? step.color : 'rgba(148,163,184,0.1)'}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: isCompleted ? step.color :
                                                                   isCurrent ? step.color :
                                                                   '#334155',
                                                            transition: 'all 0.5s',
                                                            ...(isCurrent && {
                                                                animation: 'glow 2s infinite',
                                                                '@keyframes glow': {
                                                                    '0%': { boxShadow: `0 0 0 0 ${step.color}40` },
                                                                    '70%': { boxShadow: `0 0 0 10px ${step.color}00` },
                                                                    '100%': { boxShadow: `0 0 0 0 ${step.color}00` },
                                                                }
                                                            }),
                                                            '& svg': { fontSize: 18 }
                                                        }}>
                                                            {isCompleted ? <CheckIcon sx={{ fontSize: 18 }} /> : step.icon}
                                                        </Box>
                                                        {i < STATUS_PIPELINE.length - 1 && (
                                                            <Box sx={{
                                                                width: 2, height: 28,
                                                                backgroundColor: isCompleted ? step.color : 'rgba(148,163,184,0.08)',
                                                                transition: 'background-color 0.5s',
                                                            }} />
                                                        )}
                                                    </Box>

                                                    {/* Content */}
                                                    <Box sx={{ pb: i < STATUS_PIPELINE.length - 1 ? 1.5 : 0, pt: 0.5 }}>
                                                        <Typography sx={{
                                                            color: isCompleted || isCurrent ? '#F1F5F9' : '#475569',
                                                            fontWeight: isCurrent ? 700 : 600,
                                                            fontSize: '0.9rem',
                                                            transition: 'color 0.3s',
                                                        }}>
                                                            {step.label}
                                                            {isCurrent && (
                                                                <Chip
                                                                    label="Current"
                                                                    size="small"
                                                                    sx={{
                                                                        ml: 1, height: 18, fontSize: '0.6rem',
                                                                        color: step.color,
                                                                        backgroundColor: `${step.color}15`,
                                                                        border: `1px solid ${step.color}30`,
                                                                    }}
                                                                />
                                                            )}
                                                        </Typography>
                                                        {(isCompleted || isCurrent) && (
                                                            <Typography sx={{
                                                                color: '#64748B', fontSize: '0.75rem', mt: 0.3
                                                            }}>
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

                        {/* Help CTA */}
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={<SupportIcon />}
                                href="https://wa.me/919885422901"
                                target="_blank"
                                sx={{
                                    color: '#10B981', borderColor: 'rgba(16,185,129,0.3)',
                                    textTransform: 'none', fontWeight: 600, borderRadius: 2,
                                    '&:hover': { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.05)' }
                                }}
                            >
                                💬 Chat with Us on WhatsApp
                            </Button>
                        </Box>
                    </>
                )}
            </Container>
        </Box>
    );
};

export default CustomerTrackingPage;
