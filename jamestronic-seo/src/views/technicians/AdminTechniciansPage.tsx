"use client";
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Chip, IconButton, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Grid, MenuItem,
    Card, CardContent, Avatar, Collapse, LinearProgress, Tooltip,
} from '@mui/material';
import {
    Add, Edit, ExpandMore, ExpandLess, Engineering, CheckCircle,
    Build, Warning, AccessTime, TrendingUp, Assignment, PersonOff,
    Visibility, StickyNote2,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Technician, TicketTechnicianLog, TechStatus, Ticket } from '../../types/database';
import { formatRelative } from '../../utils/formatters';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'temp-admin-tech-creation-key'
    }
});

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

type TicketWithCustomer = Omit<Ticket, 'customer'> & {
    customer?: { name: string; mobile: string };
};

const AdminTechniciansPage: React.FC = () => {
    const { push: navigate } = useRouter();
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [techLogs, setTechLogs] = useState<TicketTechnicianLog[]>([]);
    const [tickets, setTickets] = useState<TicketWithCustomer[]>([]);
    const [techNotes, setTechNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTechId, setExpandedTechId] = useState<string | null>(null);

    // Create Dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        specialization: 'All',
        email: '',
        password: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchAll = async () => {
        const [techRes, logRes, ticketRes, notesRes] = await Promise.all([
            supabase.from('technicians').select('*').order('created_at', { ascending: false }),
            supabase.from('ticket_technician_log').select('*'),
            supabase.from('tickets').select('*, customer:customers(name, mobile)').order('created_at', { ascending: false }),
            supabase.from('ticket_notes').select('*').eq('note_type', 'INTERNAL').order('created_at', { ascending: false }).limit(100),
        ]);
        if (techRes.data) setTechnicians(techRes.data);
        if (logRes.data) setTechLogs(logRes.data);
        if (ticketRes.data) setTickets(ticketRes.data as TicketWithCustomer[]);
        if (notesRes.data) setTechNotes(notesRes.data);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
                email: formData.email,
                password: formData.password,
            });
            if (authError) throw new Error(authError.message);
            const newUserId = authData.user?.id;
            if (!newUserId) throw new Error('User creation failed, no ID returned.');

            const { error: rpcError } = await supabase.rpc('admin_create_technician_profile', {
                p_new_user_id: newUserId,
                p_name: formData.name,
                p_mobile: formData.mobile,
                p_specialization: formData.specialization
            });
            if (rpcError) throw new Error(`Profile creation failed: ${rpcError.message}`);

            alert(`Technician account created! They can log in with: ${formData.email}`);
            setCreateDialogOpen(false);
            setFormData({ name: '', mobile: '', specialization: 'All', email: '', password: '' });
            fetchAll();
        } catch (err: any) {
            console.error(err);
            alert(`Failed to create technician: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (tech: Technician) => {
        const newStatus = tech.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await supabase.from('technicians').update({ status: newStatus }).eq('id', tech.id);
        fetchAll();
    };

    // Performance stats per technician
    const getStats = (techId: string) => {
        const logs = techLogs.filter(l => l.technician_id === techId);
        const totalAssigned = logs.length;
        const completed = logs.filter(l => l.tech_status === 'COMPLETED');
        const cantRepair = logs.filter(l => l.tech_status === 'CANT_REPAIR');
        const inProgress = logs.filter(l => l.tech_status === 'IN_PROGRESS' || l.tech_status === 'ASSIGNED');
        const partRequired = logs.filter(l => l.tech_status === 'PART_REQUIRED');

        let avgHours = 0;
        if (completed.length > 0) {
            const totalMs = completed.reduce((sum, l) => {
                if (l.started_at && l.completed_at) {
                    return sum + (new Date(l.completed_at).getTime() - new Date(l.started_at).getTime());
                }
                return sum;
            }, 0);
            const validCount = completed.filter(l => l.started_at && l.completed_at).length;
            avgHours = validCount > 0 ? totalMs / validCount / (1000 * 60 * 60) : 0;
        }

        const successRate = totalAssigned > 0 ? (completed.length / totalAssigned) * 100 : 0;

        return {
            totalAssigned,
            completed: completed.length,
            cantRepair: cantRepair.length,
            inProgress: inProgress.length,
            partRequired: partRequired.length,
            avgHours,
            successRate
        };
    };

    // Get assigned tickets for a technician
    const getAssignedTickets = (techId: string) => {
        return tickets.filter(t => t.assigned_technician_id === techId);
    };

    // Get tech log for a specific ticket
    const getTicketLog = (techId: string, ticketId: string) => {
        const logs = techLogs.filter(l => l.technician_id === techId && l.ticket_id === ticketId);
        return logs.length > 0 ? logs[logs.length - 1] : null;
    };

    // Get recent notes by technician user_id (via profiles match)
    const getRecentNotes = (techId: string) => {
        const techTicketIds = techLogs.filter(l => l.technician_id === techId).map(l => l.ticket_id);
        return techNotes.filter(n => techTicketIds.includes(n.ticket_id)).slice(0, 3);
    };

    // Global KPIs
    const totalTechs = technicians.length;
    const activeTechs = technicians.filter(t => t.status === 'ACTIVE').length;
    const allLogs = techLogs;
    const totalAssigned = allLogs.length;
    const totalCompleted = allLogs.filter(l => l.tech_status === 'COMPLETED').length;
    const overallCompletionRate = totalAssigned > 0 ? ((totalCompleted / totalAssigned) * 100).toFixed(0) : '0';
    const completedWithTime = allLogs.filter(l => l.tech_status === 'COMPLETED' && l.started_at && l.completed_at);
    const globalAvgHours = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, l) => sum + (new Date(l.completed_at!).getTime() - new Date(l.started_at!).getTime()), 0) / completedWithTime.length / (1000 * 60 * 60)
        : 0;

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Workforce Command Center</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitor, manage, and optimise your repair team
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                        borderRadius: 2, px: 3, py: 1,
                        background: 'linear-gradient(135deg, #6C63FF 0%, #8B85FF 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #5A52E0 0%, #7A74FF 100%)' },
                    }}
                >
                    Add Technician
                </Button>
            </Box>

            {/* Global KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(108,99,255,0.04) 100%)',
                        border: '1px solid rgba(108,99,255,0.15)',
                    }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF' }}>
                                    <Engineering fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    TECHNICIANS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#6C63FF' }}>
                                {activeTechs}<Typography component="span" variant="body2" sx={{ color: '#64748B', ml: 0.5 }}>/ {totalTechs}</Typography>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Active members</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(0,217,255,0.12) 0%, rgba(0,217,255,0.04) 100%)',
                        border: '1px solid rgba(0,217,255,0.15)',
                    }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(0,217,255,0.15)', color: '#00D9FF' }}>
                                    <Assignment fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    TOTAL ASSIGNED
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#00D9FF' }}>
                                {totalAssigned}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Tickets distributed</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)',
                        border: '1px solid rgba(16,185,129,0.15)',
                    }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                                    <TrendingUp fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    COMPLETION RATE
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>
                                {overallCompletionRate}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>{totalCompleted} of {totalAssigned} completed</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
                        border: '1px solid rgba(245,158,11,0.15)',
                    }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                                    <AccessTime fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    AVG REPAIR TIME
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#F59E0B' }}>
                                {globalAvgHours > 0 ? `${globalAvgHours.toFixed(1)}h` : '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Per ticket average</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Technician Cards */}
            {technicians.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <Engineering sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        No technicians found. Click "Add Technician" to onboard your first repair expert.
                    </Typography>
                </Box>
            ) : (
                technicians.map(tech => {
                    const stats = getStats(tech.id);
                    const isExpanded = expandedTechId === tech.id;
                    const assignedTickets = getAssignedTickets(tech.id);
                    const recentNotes = getRecentNotes(tech.id);

                    return (
                        <Card
                            key={tech.id}
                            sx={{
                                mb: 2,
                                border: isExpanded ? '1px solid rgba(108,99,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s ease',
                                '&:hover': { border: '1px solid rgba(108,99,255,0.2)' },
                            }}
                        >
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                {/* Tech Header Row */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar sx={{
                                        width: 48, height: 48,
                                        bgcolor: tech.status === 'ACTIVE' ? '#6C63FF' : '#475569',
                                        fontWeight: 700, fontSize: '1.1rem',
                                    }}>
                                        {tech.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                                {tech.name}
                                            </Typography>
                                            <Chip
                                                label={tech.status}
                                                size="small"
                                                color={tech.status === 'ACTIVE' ? 'success' : 'default'}
                                                sx={{ fontWeight: 'bold', cursor: 'pointer', height: 22, fontSize: '0.65rem' }}
                                                onClick={() => toggleStatus(tech)}
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>{tech.mobile}</Typography>
                                            <Chip label={tech.specialization || 'All'} size="small" sx={{
                                                height: 20, fontSize: '0.6rem', fontWeight: 600,
                                                bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF'
                                            }} />
                                            <Typography variant="caption" sx={{ color: '#475569' }}>
                                                Added {new Date(tech.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" sx={{ color: '#94A3B8', '&:hover': { color: '#6C63FF' } }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={isExpanded ? 'Collapse' : 'View Tickets & Notes'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => setExpandedTechId(isExpanded ? null : tech.id)}
                                                sx={{
                                                    color: isExpanded ? '#6C63FF' : '#94A3B8',
                                                    bgcolor: isExpanded ? 'rgba(108,99,255,0.1)' : 'transparent',
                                                    '&:hover': { color: '#6C63FF', bgcolor: 'rgba(108,99,255,0.08)' },
                                                }}
                                            >
                                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* Performance Stats Bar */}
                                <Grid container spacing={1.5}>
                                    {[
                                        { label: 'Assigned', value: stats.totalAssigned, color: '#6C63FF' },
                                        { label: 'In Progress', value: stats.inProgress, color: '#00D9FF' },
                                        { label: 'Completed', value: stats.completed, color: '#10B981' },
                                        { label: "Can't Repair", value: stats.cantRepair, color: '#EF4444' },
                                        { label: 'Part Required', value: stats.partRequired, color: '#F59E0B' },
                                    ].map(stat => (
                                        <Grid size={{ xs: 4, sm: 2.4 }} key={stat.label}>
                                            <Box sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor: `${stat.color}08`,
                                                border: `1px solid ${stat.color}15`,
                                                textAlign: 'center',
                                            }}>
                                                <Typography variant="h5" fontWeight={800} sx={{ color: stat.color, lineHeight: 1 }}>
                                                    {stat.value}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.6rem' }}>
                                                    {stat.label}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Success Rate Progress Bar */}
                                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, minWidth: 80 }}>
                                        Success Rate
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={stats.successRate}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 4,
                                                    background: stats.successRate > 70
                                                        ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                                                        : stats.successRate > 40
                                                            ? 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)'
                                                            : 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)',
                                                },
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="body2" fontWeight={700} sx={{
                                        color: stats.successRate > 70 ? '#10B981' : stats.successRate > 40 ? '#F59E0B' : '#EF4444',
                                        minWidth: 40, textAlign: 'right',
                                    }}>
                                        {stats.successRate.toFixed(0)}%
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                                        Avg: {stats.avgHours > 0 ? `${stats.avgHours.toFixed(1)}h` : '—'}
                                    </Typography>
                                </Box>

                                {/* Expandable Section */}
                                <Collapse in={isExpanded} timeout="auto">
                                    <Box sx={{ mt: 3 }}>
                                        {/* Assigned Tickets Mini-Table */}
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Assignment fontSize="small" sx={{ color: '#6C63FF' }} />
                                            Assigned Tickets ({assignedTickets.length})
                                        </Typography>

                                        {assignedTickets.length > 0 ? (
                                            <TableContainer component={Paper} sx={{
                                                bgcolor: 'rgba(15,23,42,0.5)',
                                                backgroundImage: 'none',
                                                borderRadius: 2,
                                                mb: 3,
                                            }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Ticket #</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Customer</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: { xs: 'none', sm: 'table-cell' } }}>Brand</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Tech Status</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: { xs: 'none', sm: 'table-cell' } }}>Assigned</TableCell>
                                                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}></TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {assignedTickets.map(ticket => {
                                                            const log = getTicketLog(tech.id, ticket.id);
                                                            const techStatus = (log?.tech_status as TechStatus) || 'ASSIGNED';
                                                            return (
                                                                <TableRow
                                                                    key={ticket.id}
                                                                    hover
                                                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(108,99,255,0.05)' } }}
                                                                >
                                                                    <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Typography variant="body2" fontWeight={600} color="primary">
                                                                            {ticket.ticket_number}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Typography variant="body2">{ticket.customer?.name || '—'}</Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.03)', display: { xs: 'none', sm: 'table-cell' } }}>
                                                                        {ticket.tv_brand}
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Chip
                                                                            label={TECH_STATUS_LABELS[techStatus]}
                                                                            size="small"
                                                                            sx={{
                                                                                height: 22,
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: 700,
                                                                                backgroundColor: TECH_STATUS_COLORS[techStatus] + '20',
                                                                                color: TECH_STATUS_COLORS[techStatus],
                                                                            }}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)', display: { xs: 'none', sm: 'table-cell' } }}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {log?.assigned_at ? formatRelative(log.assigned_at) : '—'}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <IconButton size="small" sx={{ color: '#6C63FF' }}>
                                                                            <Visibility fontSize="small" />
                                                                        </IconButton>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        ) : (
                                            <Box sx={{
                                                p: 3, mb: 3, textAlign: 'center', borderRadius: 2,
                                                bgcolor: 'rgba(15,23,42,0.5)',
                                            }}>
                                                <PersonOff sx={{ fontSize: 32, color: '#334155', mb: 1 }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    No tickets currently assigned to this technician
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Recent Notes Preview */}
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <StickyNote2 fontSize="small" sx={{ color: '#F59E0B' }} />
                                            Latest Tech Notes ({recentNotes.length})
                                        </Typography>

                                        {recentNotes.length > 0 ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {recentNotes.map(note => (
                                                    <Box
                                                        key={note.id}
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: 2,
                                                            bgcolor: 'rgba(245,158,11,0.05)',
                                                            border: '1px solid rgba(245,158,11,0.1)',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                            <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 600 }}>
                                                                Ticket: {tickets.find(t => t.id === note.ticket_id)?.ticket_number || '—'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {formatRelative(note.created_at)}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" sx={{ color: '#CBD5E1', whiteSpace: 'pre-wrap' }}>
                                                            {note.content?.length > 120 ? note.content.slice(0, 120) + '…' : note.content}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                No recent internal notes from this technician's tickets.
                                            </Typography>
                                        )}
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    );
                })
            )}

            {/* Create Technician Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3, width: '100%', maxWidth: 600 } }}>
                <form onSubmit={handleCreateSubmit}>
                    <DialogTitle>Add New Technician</DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Typography variant="subtitle2" color="primary">Technician Info</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        label="Full Name"
                                        required fullWidth variant="outlined"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        label="Mobile Number"
                                        required fullWidth variant="outlined"
                                        value={formData.mobile}
                                        onChange={e => setFormData({...formData, mobile: e.target.value})}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        label="Specialization"
                                        select fullWidth variant="outlined"
                                        value={formData.specialization}
                                        onChange={e => setFormData({...formData, specialization: e.target.value})}
                                    >
                                        <MenuItem value="All">All Types</MenuItem>
                                        <MenuItem value="LED">LED TVs</MenuItem>
                                        <MenuItem value="OLED">OLED TVs</MenuItem>
                                        <MenuItem value="CRT">CRT TVs</MenuItem>
                                        <MenuItem value="Smart TV">Smart TVs</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>

                            <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Login Credentials</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        label="Login Email"
                                        type="email" required fullWidth variant="outlined"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        label="Password"
                                        required fullWidth variant="outlined"
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                </Grid>
                            </Grid>
                            <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                Note: This creates an account immediately. Share credentials securely with the technician.
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create Technician'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default AdminTechniciansPage;
