import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Button
} from '@mui/material';
import {
    Engineering, CheckCircle, Build, Warning, Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [technician, setTechnician] = useState<Technician | null>(null);
    const [tickets, setTickets] = useState<AssignedTicket[]>([]);
    const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

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

            {/* Active Tickets Table */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Active Tickets ({activeTickets.length})
            </Typography>
            <TableContainer component={Paper} sx={{ bgcolor: '#1A2235', backgroundImage: 'none', borderRadius: 3, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <TableRow>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Ticket</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>TV</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Issue</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Priority</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Work Status</TableCell>
                            <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {activeTickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#64748B', borderBottom: 'none' }}>
                                    🎉 No active tickets! You're all caught up.
                                </TableCell>
                            </TableRow>
                        ) : (
                            activeTickets.map(ticket => (
                                <TableRow key={ticket.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, cursor: 'pointer' }}
                                    onClick={() => navigate(`/tech/${ticket.id}`)}
                                >
                                    <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Typography variant="body2" fontWeight={600} color="#00D9FF">{ticket.ticket_number}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Typography variant="body2">{ticket.tv_brand}</Typography>
                                        <Typography variant="caption" color="text.secondary">{ticket.tv_model || ''} {ticket.tv_size || ''}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)', maxWidth: 200 }}>
                                        <Typography variant="body2" noWrap>{ticket.issue_description}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Chip label={ticket.priority} size="small" sx={{
                                            fontWeight: 600,
                                            bgcolor: ticket.priority === 'URGENT' ? 'rgba(239,68,68,0.15)' :
                                                ticket.priority === 'HIGH' ? 'rgba(249,115,22,0.15)' : 'rgba(148,163,184,0.1)',
                                            color: ticket.priority === 'URGENT' ? '#EF4444' :
                                                ticket.priority === 'HIGH' ? '#F97316' : '#94A3B8',
                                        }} />
                                    </TableCell>
                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Chip
                                            label={TECH_STATUS_LABELS[ticket.tech_status || 'ASSIGNED']}
                                            size="small"
                                            sx={{
                                                fontWeight: 600,
                                                bgcolor: `${TECH_STATUS_COLORS[ticket.tech_status || 'ASSIGNED']}18`,
                                                color: TECH_STATUS_COLORS[ticket.tech_status || 'ASSIGNED'],
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <IconButton size="small" sx={{ color: '#00D9FF' }}>
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default TechDashboardPage;
