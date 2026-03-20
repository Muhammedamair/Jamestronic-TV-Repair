"use client";
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Chip, IconButton, Grid, MenuItem,
    Card, CardContent, Avatar, Collapse, LinearProgress, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import {
    Add, Edit, ExpandMore, ExpandLess, LocalShipping, CheckCircle,
    TwoWheeler, DirectionsCar, AccessTime, TrendingUp, Assignment,
    Visibility, Route, MyLocation, Speed, Lock, VerifiedUser,
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import {
    Transporter, TransportJob, TransportJobStatus,
    TRANSPORT_JOB_STATUS_LABELS, TRANSPORT_JOB_STATUS_COLORS,
} from '../../types/database';
import { formatRelative } from '../../utils/formatters';
import LiveTrackingMap from '../../components/LiveTrackingMap';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'temp-admin-transporter-creation-key'
    }
});

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
    'Bike': <TwoWheeler fontSize="small" />,
    'Auto': <DirectionsCar fontSize="small" />,
    'Mini Truck': <LocalShipping fontSize="small" />,
    'Truck': <LocalShipping fontSize="small" />,
};

const AdminTransportersPage: React.FC = () => {
    const [transporters, setTransporters] = useState<Transporter[]>([]);
    const [jobs, setJobs] = useState<TransportJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [trackingJobId, setTrackingJobId] = useState<string | null>(null);

    // Create Dialog
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '', mobile: '', vehicle_type: 'Bike', vehicle_number: '', email: '', password: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchAll = async () => {
        const [transRes, jobsRes] = await Promise.all([
            supabase.from('transporters').select('*').order('created_at', { ascending: false }),
            supabase.from('transport_jobs').select('*').order('created_at', { ascending: false }),
        ]);
        if (transRes.data) setTransporters(transRes.data);
        if (jobsRes.data) setJobs(jobsRes.data);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    // ⚡ Real-time subscription for transport_jobs (so admin sees status changes live)
    useEffect(() => {
        const channel = supabase
            .channel('admin-transport-jobs')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transport_jobs',
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setJobs(prev => [payload.new as TransportJob, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setJobs(prev => prev.map(j => j.id === (payload.new as TransportJob).id ? payload.new as TransportJob : j));
                } else if (payload.eventType === 'DELETE') {
                    setJobs(prev => prev.filter(j => j.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

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

            const { error: rpcError } = await supabase.rpc('admin_create_transporter_profile', {
                p_new_user_id: newUserId,
                p_name: formData.name,
                p_mobile: formData.mobile,
                p_vehicle_type: formData.vehicle_type,
                p_vehicle_number: formData.vehicle_number || null,
            });
            if (rpcError) throw new Error(rpcError.message);

            alert(`Transporter account created! They can log in with: ${formData.email}`);
            setCreateDialogOpen(false);
            setFormData({ name: '', mobile: '', vehicle_type: 'Bike', vehicle_number: '', email: '', password: '' });
            fetchAll();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
        setSubmitting(false);
    };

    const toggleStatus = async (transporter: Transporter) => {
        const newStatus = transporter.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await supabase.from('transporters').update({ status: newStatus }).eq('id', transporter.id);
        fetchAll();
    };

    // Stats per transporter
    const getStats = (transporterId: string) => {
        const tJobs = jobs.filter(j => j.transporter_id === transporterId);
        const total = tJobs.length;
        const assigned = tJobs.filter(j => j.status === 'ASSIGNED').length;
        const accepted = tJobs.filter(j => j.status === 'ACCEPTED').length;
        const pickedUp = tJobs.filter(j => j.status === 'PICKED_UP').length;
        const inTransit = tJobs.filter(j => j.status === 'IN_TRANSIT').length;
        const delivered = tJobs.filter(j => j.status === 'DELIVERED').length;
        const cancelled = tJobs.filter(j => j.status === 'CANCELLED').length;

        // Average delivery time (from assigned_at to completed_at)
        let avgHours = 0;
        const completedWithTime = tJobs.filter(j => j.status === 'DELIVERED' && j.assigned_at && j.completed_at);
        if (completedWithTime.length > 0) {
            const totalMs = completedWithTime.reduce((sum, j) =>
                sum + (new Date(j.completed_at!).getTime() - new Date(j.assigned_at).getTime()), 0);
            avgHours = totalMs / completedWithTime.length / (1000 * 60 * 60);
        }

        const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;

        return { total, assigned, accepted, pickedUp, inTransit, delivered, cancelled, avgHours, deliveryRate };
    };

    const getTransporterJobs = (transporterId: string) =>
        jobs.filter(j => j.transporter_id === transporterId);

    // Global KPIs
    const totalFleet = transporters.length;
    const activeFleet = transporters.filter(t => t.status === 'ACTIVE').length;
    const totalJobs = jobs.length;
    const totalDelivered = jobs.filter(j => j.status === 'DELIVERED').length;
    const activeJobs = jobs.filter(j => !['DELIVERED', 'CANCELLED'].includes(j.status)).length;
    const overallDeliveryRate = totalJobs > 0 ? ((totalDelivered / totalJobs) * 100).toFixed(0) : '0';
    const completedWithTime = jobs.filter(j => j.status === 'DELIVERED' && j.assigned_at && j.completed_at);
    const globalAvgHours = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, j) => sum + (new Date(j.completed_at!).getTime() - new Date(j.assigned_at).getTime()), 0) / completedWithTime.length / (1000 * 60 * 60)
        : 0;

    const trackingJob = trackingJobId ? jobs.find(j => j.id === trackingJobId) : null;

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Transport Command Center</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitor, manage, and track your delivery fleet
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                        borderRadius: 2, px: 3, py: 1,
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' },
                    }}
                >
                    Add Transporter
                </Button>
            </Box>

            {/* Global KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
                        border: '1px solid rgba(245,158,11,0.15)',
                    }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                                    <LocalShipping fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    FLEET
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#F59E0B' }}>
                                {activeFleet}<Typography component="span" variant="body2" sx={{ color: '#64748B', ml: 0.5 }}>/ {totalFleet}</Typography>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Active transporters</Typography>
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
                                    TOTAL JOBS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#00D9FF' }}>
                                {totalJobs}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>{activeJobs} currently active</Typography>
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
                                    DELIVERY RATE
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>
                                {overallDeliveryRate}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>{totalDelivered} of {totalJobs} delivered</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(108,99,255,0.04) 100%)',
                        border: '1px solid rgba(108,99,255,0.15)',
                    }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF' }}>
                                    <AccessTime fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    AVG DELIVERY TIME
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#6C63FF' }}>
                                {globalAvgHours > 0 ? `${globalAvgHours.toFixed(1)}h` : '—'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Per job average</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Live Tracking Map (if a job is in transit) */}
            {trackingJob && (
                <Card sx={{ mb: 3, border: '1px solid rgba(59,130,246,0.25)' }}>
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <MyLocation sx={{ color: '#3B82F6' }} />
                                <Typography variant="subtitle1" fontWeight={700}>Live Tracking</Typography>
                                <Chip label={TRANSPORT_JOB_STATUS_LABELS[trackingJob.status]} size="small" sx={{
                                    bgcolor: `${TRANSPORT_JOB_STATUS_COLORS[trackingJob.status]}15`,
                                    color: TRANSPORT_JOB_STATUS_COLORS[trackingJob.status],
                                    fontWeight: 700, border: `1px solid ${TRANSPORT_JOB_STATUS_COLORS[trackingJob.status]}30`,
                                }} />
                                {trackingJob.otp_verified && (
                                    <Chip icon={<VerifiedUser sx={{ fontSize: 14 }} />} label="OTP Verified" size="small"
                                        sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 600, '& .MuiChip-icon': { color: '#10B981' } }} />
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {trackingJob.pickup_otp && !trackingJob.otp_verified && (
                                    <Chip icon={<Lock sx={{ fontSize: 14 }} />} label={`OTP: ${trackingJob.pickup_otp}`} size="small"
                                        sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontWeight: 700, border: '1px solid rgba(245,158,11,0.2)', '& .MuiChip-icon': { color: '#F59E0B' } }} />
                                )}
                                <Button size="small" onClick={() => setTrackingJobId(null)} sx={{ color: '#94A3B8' }}>Close</Button>
                            </Box>
                        </Box>
                        <LiveTrackingMap
                            pickupLat={trackingJob.pickup_lat}
                            pickupLng={trackingJob.pickup_lng}
                            dropLat={trackingJob.drop_lat}
                            dropLng={trackingJob.drop_lng}
                            liveLat={trackingJob.live_lat}
                            liveLng={trackingJob.live_lng}
                            vehicleType={transporters.find(t => t.id === trackingJob.transporter_id)?.vehicle_type}
                            height={350}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Transporter Cards */}
            {transporters.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <LocalShipping sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        No transporters found. Click "Add Transporter" to onboard your first delivery person.
                    </Typography>
                </Box>
            ) : (
                transporters.map(transporter => {
                    const stats = getStats(transporter.id);
                    const isExpanded = expandedId === transporter.id;
                    const tJobs = getTransporterJobs(transporter.id);
                    const inTransitJob = tJobs.find(j => j.status === 'IN_TRANSIT');

                    return (
                        <Card
                            key={transporter.id}
                            sx={{
                                mb: 2,
                                border: isExpanded ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s ease',
                                '&:hover': { border: '1px solid rgba(245,158,11,0.2)' },
                            }}
                        >
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                {/* Header Row */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar sx={{
                                        width: 48, height: 48,
                                        bgcolor: transporter.status === 'ACTIVE' ? '#F59E0B' : '#475569',
                                        fontWeight: 700, fontSize: '1.1rem',
                                    }}>
                                        {transporter.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                                {transporter.name}
                                            </Typography>
                                            <Chip
                                                label={transporter.status}
                                                size="small"
                                                color={transporter.status === 'ACTIVE' ? 'success' : 'default'}
                                                sx={{ fontWeight: 'bold', cursor: 'pointer', height: 22, fontSize: '0.65rem' }}
                                                onClick={() => toggleStatus(transporter)}
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>📱 {transporter.mobile}</Typography>
                                            <Chip
                                                icon={VEHICLE_ICONS[transporter.vehicle_type] as React.ReactElement || undefined}
                                                label={transporter.vehicle_type}
                                                size="small"
                                                sx={{
                                                    height: 20, fontSize: '0.6rem', fontWeight: 600,
                                                    bgcolor: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                                                    '& .MuiChip-icon': { color: '#F59E0B', fontSize: 14 }
                                                }}
                                            />
                                            {transporter.vehicle_number && (
                                                <Typography variant="caption" sx={{ color: '#475569' }}>
                                                    {transporter.vehicle_number}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" sx={{ color: '#475569' }}>
                                                Added {new Date(transporter.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {inTransitJob && (
                                            <Tooltip title="Track Live Location">
                                                <IconButton size="small"
                                                    onClick={() => setTrackingJobId(inTransitJob.id)}
                                                    sx={{ color: '#3B82F6', bgcolor: 'rgba(59,130,246,0.1)', '&:hover': { bgcolor: 'rgba(59,130,246,0.2)' } }}>
                                                    <MyLocation fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title={isExpanded ? 'Collapse' : 'View Jobs'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => setExpandedId(isExpanded ? null : transporter.id)}
                                                sx={{
                                                    color: isExpanded ? '#F59E0B' : '#94A3B8',
                                                    bgcolor: isExpanded ? 'rgba(245,158,11,0.1)' : 'transparent',
                                                    '&:hover': { color: '#F59E0B', bgcolor: 'rgba(245,158,11,0.08)' },
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
                                        { label: 'Assigned', value: stats.assigned, color: '#6C63FF' },
                                        { label: 'Accepted', value: stats.accepted, color: '#F59E0B' },
                                        { label: 'Picked Up', value: stats.pickedUp, color: '#00D9FF' },
                                        { label: 'In Transit', value: stats.inTransit, color: '#3B82F6' },
                                        { label: 'Delivered', value: stats.delivered, color: '#10B981' },
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

                                {/* Delivery Rate Progress Bar */}
                                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, minWidth: 80 }}>
                                        Delivery Rate
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={stats.deliveryRate}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 4,
                                                    background: stats.deliveryRate > 70
                                                        ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                                                        : stats.deliveryRate > 40
                                                            ? 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)'
                                                            : 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)',
                                                },
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="body2" fontWeight={700} sx={{
                                        color: stats.deliveryRate > 70 ? '#10B981' : stats.deliveryRate > 40 ? '#F59E0B' : '#EF4444',
                                        minWidth: 40, textAlign: 'right',
                                    }}>
                                        {stats.deliveryRate.toFixed(0)}%
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                                        Avg: {stats.avgHours > 0 ? `${stats.avgHours.toFixed(1)}h` : '—'}
                                    </Typography>
                                </Box>

                                {/* Expandable Section: Job History */}
                                <Collapse in={isExpanded} timeout="auto">
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Route fontSize="small" sx={{ color: '#F59E0B' }} />
                                            Transport Jobs ({tJobs.length})
                                        </Typography>

                                        {tJobs.length > 0 ? (
                                            <TableContainer component={Paper} sx={{
                                                bgcolor: 'rgba(15,23,42,0.5)',
                                                backgroundImage: 'none',
                                                borderRadius: 2,
                                            }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Pickup</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Drop</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Item</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>OTP</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Status</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Assigned</TableCell>
                                                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}></TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {tJobs.slice(0, 10).map(job => (
                                                            <TableRow
                                                                key={job.id}
                                                                hover
                                                                sx={{ '&:hover': { bgcolor: 'rgba(245,158,11,0.05)' } }}
                                                            >
                                                                <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.03)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    <Typography variant="body2">{job.pickup_address}</Typography>
                                                                </TableCell>
                                                                <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.03)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    <Typography variant="body2">{job.drop_address}</Typography>
                                                                </TableCell>
                                                                <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <Typography variant="caption">{job.item_description || '—'}</Typography>
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    {job.pickup_otp ? (
                                                                        <Chip
                                                                            icon={job.otp_verified ? <VerifiedUser sx={{ fontSize: 12 }} /> : <Lock sx={{ fontSize: 12 }} />}
                                                                            label={job.otp_verified ? 'Verified' : job.pickup_otp}
                                                                            size="small"
                                                                            sx={{
                                                                                height: 22, fontSize: '0.65rem', fontWeight: 700,
                                                                                bgcolor: job.otp_verified ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                                                color: job.otp_verified ? '#10B981' : '#F59E0B',
                                                                                '& .MuiChip-icon': { color: job.otp_verified ? '#10B981' : '#F59E0B' },
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Typography variant="caption" color="text.secondary">—</Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <Chip
                                                                        label={TRANSPORT_JOB_STATUS_LABELS[job.status]}
                                                                        size="small"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: 700,
                                                                            backgroundColor: TRANSPORT_JOB_STATUS_COLORS[job.status] + '20',
                                                                            color: TRANSPORT_JOB_STATUS_COLORS[job.status],
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {formatRelative(job.assigned_at)}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    {(job.status === 'IN_TRANSIT' || job.status === 'PICKED_UP') && (
                                                                        <Tooltip title="Track Live">
                                                                            <IconButton size="small" onClick={() => setTrackingJobId(job.id)}
                                                                                sx={{ color: '#3B82F6' }}>
                                                                                <MyLocation fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        ) : (
                                            <Box sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'rgba(15,23,42,0.5)' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No jobs assigned to this transporter yet
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    );
                })
            )}

            {/* Create Transporter Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3, width: '100%', maxWidth: 600 } }}>
                <form onSubmit={handleCreateSubmit}>
                    <DialogTitle>Add New Transporter</DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Typography variant="subtitle2" color="primary">Transporter Info</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField label="Full Name" required fullWidth variant="outlined"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField label="Mobile Number" required fullWidth variant="outlined"
                                        value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                        inputProps={{ inputMode: 'tel', maxLength: 10 }} />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField label="Vehicle Type" select fullWidth variant="outlined"
                                        value={formData.vehicle_type} onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })}>
                                        <MenuItem value="Bike">🏍️ Bike</MenuItem>
                                        <MenuItem value="Auto">🛺 Auto</MenuItem>
                                        <MenuItem value="Mini Truck">🚐 Mini Truck</MenuItem>
                                        <MenuItem value="Truck">🚛 Truck</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField label="Vehicle Number (optional)" fullWidth variant="outlined"
                                        value={formData.vehicle_number} onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
                                        placeholder="e.g. TS 09 AB 1234" />
                                </Grid>
                            </Grid>

                            <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Login Credentials</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField label="Login Email" type="email" required fullWidth variant="outlined"
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField label="Password" required fullWidth variant="outlined"
                                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        inputProps={{ minLength: 6 }} />
                                </Grid>
                            </Grid>
                            <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                Note: This creates an account immediately. Share credentials securely with the transporter.
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}
                            sx={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                            {submitting ? 'Creating...' : 'Create Transporter'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default AdminTransportersPage;
