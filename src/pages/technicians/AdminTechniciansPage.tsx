import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Chip, IconButton, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Grid, MenuItem
} from '@mui/material';
import { Add, Edit } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Technician, TicketTechnicianLog } from '../../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'temp-admin-tech-creation-key'
    }
});

const AdminTechniciansPage: React.FC = () => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [techLogs, setTechLogs] = useState<TicketTechnicianLog[]>([]);
    const [loading, setLoading] = useState(true);

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

    const fetchTechnicians = async () => {
        const [techRes, logRes] = await Promise.all([
            supabase.from('technicians').select('*').order('created_at', { ascending: false }),
            supabase.from('ticket_technician_log').select('*')
        ]);
        if (techRes.data) setTechnicians(techRes.data);
        if (logRes.data) setTechLogs(logRes.data);
        setLoading(false);
    };

    useEffect(() => { fetchTechnicians(); }, []);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // STEP 1: Create Auth User
            const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
                email: formData.email,
                password: formData.password,
            });
            if (authError) throw new Error(authError.message);
            const newUserId = authData.user?.id;
            if (!newUserId) throw new Error('User creation failed, no ID returned.');

            // STEP 2: Create technician profile via RPC
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
            fetchTechnicians();
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
        fetchTechnicians();
    };

    // Performance stats per technician
    const getStats = (techId: string) => {
        const logs = techLogs.filter(l => l.technician_id === techId);
        const totalAssigned = logs.length;
        const completed = logs.filter(l => l.tech_status === 'COMPLETED');
        const cantRepair = logs.filter(l => l.tech_status === 'CANT_REPAIR');
        const inProgress = logs.filter(l => l.tech_status === 'IN_PROGRESS' || l.tech_status === 'ASSIGNED');
        
        // Average repair time (completed only)
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

        const successRate = totalAssigned > 0 ? ((completed.length / totalAssigned) * 100).toFixed(0) : '0';

        return { totalAssigned, completed: completed.length, cantRepair: cantRepair.length, inProgress: inProgress.length, avgHours, successRate };
    };

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">Manage Technicians</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ borderRadius: 2, px: 3, py: 1 }}
                >
                    Add New Technician
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ bgcolor: '#1A2235', backgroundImage: 'none', borderRadius: 3, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <TableRow>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Technician</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Mobile</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Specialization</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Performance</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Status</TableCell>
                            <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {technicians.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#64748B', borderBottom: 'none' }}>
                                    No technicians found. Click "Add New Technician" to onboard your first repair expert.
                                </TableCell>
                            </TableRow>
                        ) : (
                            technicians.map(tech => {
                                const stats = getStats(tech.id);
                                return (
                                    <TableRow key={tech.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, transition: 'background-color 0.2s' }}>
                                        <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Typography fontWeight="bold">{tech.name}</Typography>
                                            <Typography variant="caption" sx={{ color: '#64748B' }}>
                                                Added {new Date(tech.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            {tech.mobile}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Chip label={tech.specialization || 'All'} size="small" sx={{ bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF', fontWeight: 600 }} />
                                        </TableCell>
                                        <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Assigned</Typography>
                                                    <Typography variant="body2" fontWeight="bold">{stats.totalAssigned}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Done</Typography>
                                                    <Typography variant="body2" fontWeight="bold" color="#10B981">{stats.completed}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Success</Typography>
                                                    <Typography variant="body2" fontWeight="bold" sx={{ color: Number(stats.successRate) > 70 ? '#10B981' : '#F59E0B' }}>
                                                        {stats.successRate}%
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Avg Time</Typography>
                                                    <Typography variant="body2" fontWeight="bold">{stats.avgHours > 0 ? `${stats.avgHours.toFixed(1)}h` : '-'}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Chip
                                                label={tech.status}
                                                size="small"
                                                color={tech.status === 'ACTIVE' ? 'success' : 'default'}
                                                sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                                                onClick={() => toggleStatus(tech)}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <IconButton size="small" sx={{ color: '#94A3B8', '&:hover': { color: '#6C63FF' } }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

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
