import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Chip, Card, CardContent, Avatar,
    Grid, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Collapse, IconButton,
} from '@mui/material';
import {
    Add, LocalShipping, CheckCircle, DirectionsCar, TwoWheeler,
    ExpandMore, ExpandLess, Assignment, Schedule, Visibility,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Transporter, TransportJob, TRANSPORT_JOB_STATUS_LABELS, TRANSPORT_JOB_STATUS_COLORS } from '../../types/database';
import { formatRelative } from '../../utils/formatters';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'temp-admin-transporter-creation-key'
    }
});

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
    'Bike': <TwoWheeler />,
    'Auto': <DirectionsCar />,
    'Mini Truck': <LocalShipping />,
    'Truck': <LocalShipping />,
};

const AdminTransportersPage: React.FC = () => {
    const navigate = useNavigate();
    const [transporters, setTransporters] = useState<Transporter[]>([]);
    const [jobs, setJobs] = useState<TransportJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

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

            setCreateDialogOpen(false);
            setFormData({ name: '', mobile: '', vehicle_type: 'Bike', vehicle_number: '', email: '', password: '' });
            fetchAll();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
        setSubmitting(false);
    };

    const getTransporterJobs = (transporterId: string) =>
        jobs.filter(j => j.transporter_id === transporterId);

    const activeJobs = jobs.filter(j => !['DELIVERED', 'CANCELLED'].includes(j.status)).length;
    const completedToday = jobs.filter(j => {
        if (j.status !== 'DELIVERED' || !j.completed_at) return false;
        const today = new Date().toDateString();
        return new Date(j.completed_at).toDateString() === today;
    }).length;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress sx={{ color: '#F59E0B' }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{
                        background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
                        backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        Transporter Network
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Manage your fleet and track deliveries
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        fontWeight: 700, borderRadius: 2, textTransform: 'none',
                        boxShadow: '0 6px 20px rgba(245,158,11,0.35)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #D97706, #B45309)',
                            transform: 'translateY(-2px)',
                        },
                    }}
                >
                    Add Transporter
                </Button>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {[
                    { title: 'Total Fleet', value: transporters.length, icon: <LocalShipping />, color: '#F59E0B' },
                    { title: 'Active Jobs', value: activeJobs, icon: <Assignment />, color: '#3B82F6' },
                    { title: 'Completed Today', value: completedToday, icon: <CheckCircle />, color: '#10B981' },
                    { title: 'Active Transporters', value: transporters.filter(t => t.status === 'ACTIVE').length, icon: <DirectionsCar />, color: '#00D9FF' },
                ].map((kpi, i) => (
                    <Grid size={{ xs: 6, md: 3 }} key={i}>
                        <Card sx={{
                            background: 'rgba(26, 34, 53, 0.7)', backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(148, 163, 184, 0.1)',
                            boxShadow: `0 4px 20px -2px ${kpi.color}15`,
                            transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 28px -4px ${kpi.color}30` },
                        }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {kpi.title}
                                        </Typography>
                                        <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, color: kpi.color, textShadow: `0 2px 10px ${kpi.color}40` }}>
                                            {kpi.value}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 1.2, borderRadius: 2.5, backgroundColor: `${kpi.color}18`, color: kpi.color }}>
                                        {kpi.icon}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Transporter Cards */}
            {transporters.map(transporter => {
                const tJobs = getTransporterJobs(transporter.id);
                const activeCount = tJobs.filter(j => !['DELIVERED', 'CANCELLED'].includes(j.status)).length;
                const completedCount = tJobs.filter(j => j.status === 'DELIVERED').length;
                const isExpanded = expandedId === transporter.id;

                return (
                    <Card key={transporter.id} sx={{
                        mb: 2, background: 'rgba(26, 34, 53, 0.7)', backdropFilter: 'blur(10px)',
                        border: `1px solid ${isExpanded ? 'rgba(245,158,11,0.25)' : 'rgba(148, 163, 184, 0.1)'}`,
                        transition: 'all 0.3s',
                    }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Avatar sx={{
                                    bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B',
                                    width: 48, height: 48, fontWeight: 700, fontSize: '1.1rem',
                                }}>
                                    {transporter.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#E2E8F0' }}>
                                        {transporter.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        📱 {transporter.mobile} • {transporter.vehicle_type}
                                        {transporter.vehicle_number && ` • ${transporter.vehicle_number}`}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Chip label={`${activeCount} active`} size="small" sx={{
                                        bgcolor: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontWeight: 700,
                                        border: '1px solid rgba(59,130,246,0.25)',
                                    }} />
                                    <Chip label={`${completedCount} done`} size="small" sx={{
                                        bgcolor: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 700,
                                        border: '1px solid rgba(16,185,129,0.25)',
                                    }} />
                                    <Chip label={transporter.status} size="small" sx={{
                                        bgcolor: transporter.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                        color: transporter.status === 'ACTIVE' ? '#10B981' : '#EF4444',
                                        fontWeight: 700, border: `1px solid ${transporter.status === 'ACTIVE' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                    }} />
                                    <IconButton size="small" onClick={() => setExpandedId(isExpanded ? null : transporter.id)}
                                        sx={{ color: '#94A3B8' }}>
                                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                </Box>
                            </Box>
                        </CardContent>

                        <Collapse in={isExpanded}>
                            <Box sx={{ px: 2.5, pb: 2.5 }}>
                                {tJobs.length > 0 ? (
                                    <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(148,163,184,0.1)', overflow: 'hidden' }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: 'rgba(15,23,42,0.6)' }}>
                                                <TableRow>
                                                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>Pickup</TableCell>
                                                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>Drop</TableCell>
                                                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>Status</TableCell>
                                                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>Assigned</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {tJobs.slice(0, 5).map(job => (
                                                    <TableRow key={job.id} sx={{
                                                        '&:hover': { bgcolor: 'rgba(245,158,11,0.05)' },
                                                        '& td': { borderBottom: '1px solid rgba(148,163,184,0.05)' }
                                                    }}>
                                                        <TableCell sx={{ color: '#CBD5E1', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {job.pickup_address}
                                                        </TableCell>
                                                        <TableCell sx={{ color: '#CBD5E1', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {job.drop_address}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={TRANSPORT_JOB_STATUS_LABELS[job.status]}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: `${TRANSPORT_JOB_STATUS_COLORS[job.status]}15`,
                                                                    color: TRANSPORT_JOB_STATUS_COLORS[job.status],
                                                                    fontWeight: 700, fontSize: '0.7rem',
                                                                    border: `1px solid ${TRANSPORT_JOB_STATUS_COLORS[job.status]}30`,
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ color: '#94A3B8' }}>
                                                            <Typography variant="caption">{formatRelative(job.assigned_at)}</Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <Typography color="text.secondary">No jobs assigned yet</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Collapse>
                    </Card>
                );
            })}

            {transporters.length === 0 && (
                <Card sx={{
                    background: 'rgba(26, 34, 53, 0.7)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                }}>
                    <CardContent sx={{ py: 8, textAlign: 'center' }}>
                        <LocalShipping sx={{ fontSize: 48, color: '#F59E0B', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" fontWeight={700} sx={{ color: '#E2E8F0', mb: 1 }}>
                            No Transporters Yet
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 3 }}>
                            Add your first transporter to start managing deliveries
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                fontWeight: 700, borderRadius: 2, textTransform: 'none',
                            }}
                        >
                            Add First Transporter
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create Transporter Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth
                PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3, border: '1px solid rgba(245,158,11,0.2)' } }}>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShipping sx={{ color: '#F59E0B' }} />
                        <Typography variant="h6" fontWeight={700}>Add Transporter</Typography>
                    </Box>
                </DialogTitle>
                <form onSubmit={handleCreateSubmit}>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField fullWidth label="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <TextField fullWidth label="Mobile Number" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} required inputProps={{ inputMode: 'tel', maxLength: 10 }} />
                        <TextField fullWidth select label="Vehicle Type" value={formData.vehicle_type} onChange={e => setFormData({ ...formData, vehicle_type: e.target.value })}>
                            <MenuItem value="Bike">🏍️ Bike</MenuItem>
                            <MenuItem value="Auto">🛺 Auto</MenuItem>
                            <MenuItem value="Mini Truck">🚐 Mini Truck</MenuItem>
                            <MenuItem value="Truck">🚛 Truck</MenuItem>
                        </TextField>
                        <TextField fullWidth label="Vehicle Number (optional)" value={formData.vehicle_number} onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })} placeholder="e.g. TS 09 AB 1234" />
                        <TextField fullWidth label="Login Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                        <TextField fullWidth label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required inputProps={{ minLength: 6 }} />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}
                            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Add />}
                            sx={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', fontWeight: 700, textTransform: 'none' }}>
                            {submitting ? 'Creating...' : 'Create Transporter'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default AdminTransportersPage;
