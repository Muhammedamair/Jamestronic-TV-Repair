"use client";
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, CircularProgress,
    IconButton, Button, Collapse, Divider, Avatar
} from '@mui/material';
import {
    Engineering, CheckCircle, Build, Warning, Visibility,
    ExpandMore, ExpandLess, Phone, Hardware, AccessTime
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Ticket, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, Technician, TechStatus } from '../../types/database';
import { subscribeToPush, isPushSubscribed, syncPushSubscription } from '../../utils/pushSubscription';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
const TECH_STATUS_LABELS: Record<TechStatus, string> = {
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANT_REPAIR: "Can't Repair",
    PART_REQUIRED: 'Part Required',
};

const TECH_STATUS_COLORS: Record<TechStatus, string> = {
    ASSIGNED: '#6C63FF',
    IN_PROGRESS: '#00D9FF',
    COMPLETED: '#10B981',
    CANT_REPAIR: '#EF4444',
    PART_REQUIRED: '#F59E0B',
};

interface AssignedTicket extends Ticket {
    tech_log_id?: string;
    tech_status?: TechStatus;
    assigned_at?: string;
}

const TechDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { push: navigate } = useRouter();
    const [loading, setLoading] = useState(true);
    const [technician, setTechnician] = useState<Technician | null>(null);
    const [tickets, setTickets] = useState<AssignedTicket[]>([]);
    const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
    const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedTicketId(prev => prev === id ? null : id);
    };

    const playNotificationSound = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            setTimeout(() => { oscillator.stop(); }, 300);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    useEffect(() => {
        isPushSubscribed().then(isSub => {
            setPushEnabled(isSub);
            if (isSub) syncPushSubscription();
        });
    }, []);

    // Sync PWA App Icon Badge
    useEffect(() => {
        if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
            const activeCount = tickets.filter(t => 
                ['ASSIGNED', 'IN_PROGRESS', 'PART_REQUIRED'].includes(t.tech_status || '')
            ).length;
            
            if (activeCount > 0) {
                (navigator as any).setAppBadge(activeCount).catch(console.error);
            } else {
                (navigator as any).clearAppBadge().catch(console.error);
            }
        }
    }, [tickets]);

    useEffect(() => {
        if (!user) return;
        const fetchTech = async () => {
            if (!technician) {
                const { data } = await supabase.from('technicians').select('*').eq('user_id', user.id).single();
                if (data) setTechnician(data);
            }
        };
        fetchTech();
    }, [user]);

    useEffect(() => {
        if (!technician) return;
        const fetchData = async () => {
            setLoading(true);
            // 1. Get assigned tickets
            const { data: ticketData } = await supabase
                .from('tickets')
                .select('*, customer:customers(name, mobile)')
                .eq('assigned_technician_id', technician.id)
                .order('created_at', { ascending: false });

            // 2. Get tech logs for these tickets
            const { data: logData } = await supabase
                .from('ticket_technician_log')
                .select('*')
                .eq('technician_id', technician.id);

            // Merge log data into tickets
            const merged: AssignedTicket[] = (ticketData || []).map(t => {
                const log = (logData || []).find(l => l.ticket_id === t.id);
                return {
                    ...t,
                    tech_log_id: log?.id,
                    tech_status: log?.tech_status as TechStatus || 'ASSIGNED',
                    assigned_at: log?.assigned_at,
                };
            });

            setTickets(merged);
            setLoading(false);
        };
        fetchData();

        // Realtime subscription for ticket assignments
        if (!technician) return;
        const channel = supabase.channel('tech_dashboard_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tickets' },
                () => { fetchData(); } // Re-fetch on any ticket change
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ticket_technician_log', filter: `technician_id=eq.${technician.id}` },
                (payload) => { 
                    fetchData(); 
                    if (payload.eventType === 'INSERT') playNotificationSound();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, technician?.id]);

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#00D9FF' }} />
        </Box>
    );

    if (!technician) return (
        <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography color="text.secondary">Technician profile not found. Contact admin.</Typography>
        </Box>
    );



    const assigned = tickets.filter(t => t.tech_status === 'ASSIGNED');
    const inProgress = tickets.filter(t => t.tech_status === 'IN_PROGRESS');
    const completed = tickets.filter(t => t.tech_status === 'COMPLETED');
    const partRequired = tickets.filter(t => t.tech_status === 'PART_REQUIRED');
    const activeTickets = tickets.filter(t => t.tech_status !== 'COMPLETED' && t.tech_status !== 'CANT_REPAIR');

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>
                    Welcome, {technician.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Your repair workbench — view and update assigned tickets
                </Typography>
            </Box>

            {/* Push Notification Banner */}
            {pushEnabled === false && (
                <Box
                    sx={{
                        mb: 3,
                        p: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(0,217,255,0.1) 100%)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <NotificationsActiveIcon sx={{ color: '#10B981', fontSize: 28 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>
                            Enable Push Notifications
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            Get instant alerts when assigned a new ticket — even when your phone is locked.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={async () => {
                            const result = await subscribeToPush();
                            setPushEnabled(result);
                        }}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
                        }}
                    >
                        Enable
                    </Button>
                </Box>
            )}

            {/* Temporary debug button to force clear VAPID cache */}
            {!pushEnabled && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 3 }}>
                    <Button
                        size="small"
                        sx={{ color: '#94A3B8', fontSize: '0.7rem', textTransform: 'none' }}
                        onClick={async () => {
                            if ('serviceWorker' in navigator) {
                                const regs = await navigator.serviceWorker.getRegistrations();
                                for (let reg of regs) await reg.unregister();
                            }
                            (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).clear();
                            (typeof window !== 'undefined' ? sessionStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).clear();
                            window.location.reload();
                        }}
                    >
                        Fix Stubborn Cache (Tap this first, then Enable)
                    </Button>
                </Box>
            )}

            {/* KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(108,99,255,0.05))', border: '1px solid rgba(108,99,255,0.15)' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="caption" color="text.secondary">Assigned</Typography>
                            <Typography variant="h4" fontWeight={700} color="#6C63FF">{assigned.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(0,217,255,0.1), rgba(0,217,255,0.05))', border: '1px solid rgba(0,217,255,0.15)' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="caption" color="text.secondary">In Progress</Typography>
                            <Typography variant="h4" fontWeight={700} color="#00D9FF">{inProgress.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="caption" color="text.secondary">Completed</Typography>
                            <Typography variant="h4" fontWeight={700} color="#10B981">{completed.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="caption" color="text.secondary">Parts Needed</Typography>
                            <Typography variant="h4" fontWeight={700} color="#F59E0B">{partRequired.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Active Tickets Cards */}
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Build sx={{ color: '#00D9FF' }} /> Active Tickets ({activeTickets.length})
            </Typography>

            {activeTickets.length === 0 ? (
                <Box sx={{ p: 4, mt: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <CheckCircle sx={{ fontSize: 48, color: '#10B981', mb: 1, opacity: 0.8 }} />
                    <Typography variant="h6" color="text.primary" fontWeight={600}>All caught up!</Typography>
                    <Typography variant="body2" color="text.secondary">No active tickets assigned to you right now.</Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {activeTickets.map(ticket => {
                        const isExpanded = expandedTicketId === ticket.id;
                        const statusColor = TECH_STATUS_COLORS[ticket.tech_status || 'ASSIGNED'];
                        const priorityColor = ticket.priority === 'URGENT' ? '#EF4444' : ticket.priority === 'HIGH' ? '#F97316' : '#94A3B8';

                        return (
                            <Card 
                                key={ticket.id} 
                                onClick={() => navigate(`/tech/${ticket.id}`)}
                                sx={{ 
                                    bgcolor: '#1E293B', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderLeft: `4px solid ${statusColor}`,
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.1)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderLeft: `4px solid ${statusColor}`,
                                    }
                                }}
                            >
                                <CardContent sx={{ p: '24px !important' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box>
                                            <Typography variant="caption" fontWeight={700} color="#00D9FF" sx={{ mb: 0.5, display: 'block', letterSpacing: 0.5 }}>
                                                {ticket.ticket_number}
                                            </Typography>
                                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, color: '#F8FAFC' }}>
                                                {ticket.tv_brand} {ticket.tv_model || ''} {ticket.tv_size || ''}
                                            </Typography>
                                        </Box>
                                        <Chip 
                                            label={ticket.priority} 
                                            size="small" 
                                            sx={{ 
                                                bgcolor: `${priorityColor}15`, 
                                                color: priorityColor, 
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                borderRadius: 1
                                            }} 
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                        <Chip
                                            label={TECH_STATUS_LABELS[ticket.tech_status || 'ASSIGNED']}
                                            size="small"
                                            sx={{
                                                bgcolor: `${statusColor}15`,
                                                color: statusColor,
                                                fontWeight: 600,
                                                borderColor: `${statusColor}40`,
                                                border: '1px solid',
                                                borderRadius: 1.5
                                            }}
                                        />
                                        <Chip
                                            icon={<AccessTime sx={{ fontSize: '14px !important', color: 'inherit' }} />}
                                            label={`Created ${new Date(ticket.created_at).toLocaleDateString()}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ 
                                                color: '#94A3B8', 
                                                borderColor: 'rgba(255,255,255,0.1)',
                                                borderRadius: 1.5 
                                            }}
                                        />
                                    </Box>

                                    <Typography 
                                        variant="body2" 
                                        color="#CBD5E1" 
                                        sx={{ 
                                            display: '-webkit-box', 
                                            WebkitLineClamp: isExpanded ? 'unset' : 2, 
                                            WebkitBoxOrient: 'vertical', 
                                            overflow: 'hidden',
                                            lineHeight: 1.6
                                        }}
                                    >
                                        <span style={{ fontWeight: 600, color: '#94A3B8' }}>Issue: </span>
                                        {ticket.issue_description}
                                    </Typography>

                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                        <Box sx={{ mt: 3, pt: 3, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                            <Grid container spacing={2}>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <Typography variant="caption" color="#64748B" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                        <Engineering fontSize="inherit" /> CUSTOMER DETAILS
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600} color="#F8FAFC">{ticket.customer?.name}</Typography>
                                                    <Typography variant="body2" color="#94A3B8" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                        <Phone fontSize="inherit" sx={{ opacity: 0.7 }} /> {ticket.customer?.mobile}
                                                    </Typography>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <Typography variant="caption" color="#64748B" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                        <Hardware fontSize="inherit" /> WARRANTY
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600} color={ticket.warranty_expiry_date && new Date(ticket.warranty_expiry_date) > new Date() ? '#10B981' : '#94A3B8'}>
                                                        {ticket.warranty_expiry_date 
                                                            ? (new Date(ticket.warranty_expiry_date) > new Date() ? 'In Warranty' : 'Expired') 
                                                            : 'No Warranty'}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Collapse>

                                    <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            disableElevation
                                            sx={{ 
                                                bgcolor: 'rgba(0, 217, 255, 0.1)', 
                                                color: '#00D9FF',
                                                border: '1px solid rgba(0, 217, 255, 0.2)',
                                                borderRadius: 2,
                                                py: 1.2,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                fontSize: '0.95rem',
                                                '&:hover': {
                                                    bgcolor: 'rgba(0, 217, 255, 0.2)',
                                                    borderColor: 'rgba(0, 217, 255, 0.3)',
                                                }
                                            }}
                                        >
                                            View Workbench
                                        </Button>
                                        <IconButton 
                                            onClick={(e) => toggleExpand(ticket.id, e)}
                                            sx={{ 
                                                border: '1px solid rgba(255,255,255,0.1)', 
                                                borderRadius: 2,
                                                color: '#94A3B8',
                                                width: 48,
                                                height: 48,
                                                '&:hover': {
                                                    bgcolor: 'rgba(255,255,255,0.05)',
                                                    color: '#F8FAFC'
                                                }
                                            }}
                                        >
                                            {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
};

export default TechDashboardPage;
