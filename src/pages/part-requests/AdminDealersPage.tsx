import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Chip, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Dealer } from '../../types/database';
import { formatDateTime } from '../../utils/formatters';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a secondary Supabase client that does NOT persist the session.
// This allows the Admin to register new users without logging themselves out!
const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'temp-admin-dealer-creation-key'
    }
});

const AdminDealersPage: React.FC = () => {
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Dealer Dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        mobile: '',
        address: '',
        email: '',
        password: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchDealers = async () => {
        const { data, error } = await supabase
            .from('dealers')
            .select('*, bids:part_bids(*)')
            .order('created_at', { ascending: false });
        
        if (data) setDealers(data as Dealer[]);
        if (error) console.error('Error fetching dealers:', error);
        setLoading(false);
    };

    useEffect(() => {
        fetchDealers();
    }, []);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            // STEP 1: Create the Auth User using the temporary client
            const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw new Error(authError.message);
            
            const newUserId = authData.user?.id;
            if (!newUserId) throw new Error('User creation failed, no ID returned.');

            // STEP 2: Assign the DEALER role and profile via secure RPC
            const { error: rpcError } = await supabase.rpc('admin_create_dealer_profile', {
                p_new_user_id: newUserId,
                p_name: formData.name,
                p_contact_person: formData.contact_person,
                p_mobile: formData.mobile,
                p_address: formData.address
            });

            if (rpcError) throw new Error(`Profile creation failed: ${rpcError.message}`);

            // Success
            alert(`Dealer account created successfully! They can log in with: ${formData.email}`);
            setCreateDialogOpen(false);
            setFormData({ name: '', contact_person: '', mobile: '', address: '', email: '', password: '' });
            fetchDealers();

        } catch (err: any) {
            console.error(err);
            alert(`Failed to create dealer: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">Manage Dealers</Typography>
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ borderRadius: 2, px: 3, py: 1 }}
                >
                    Add New Dealer
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ bgcolor: '#1A2235', backgroundImage: 'none', borderRadius: 3, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <TableRow>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Business Name</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Contact Person</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Mobile</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Performance</TableCell>
                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Status</TableCell>
                            <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {dealers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#64748B', borderBottom: 'none' }}>
                                    No dealers found in the system. Click "Add New Dealer" to invite your first partner.
                                </TableCell>
                            </TableRow>
                        ) : (
                            dealers.map(dealer => {
                                const totalBids = dealer.bids?.length || 0;
                                const wonBids = dealer.bids?.filter(b => b.is_accepted) || [];
                                const winRate = totalBids > 0 ? ((wonBids.length / totalBids) * 100).toFixed(0) : '0';
                                const totalRevenue = wonBids.reduce((sum, b) => sum + Number(b.price), 0);
                                
                                return (
                                    <TableRow key={dealer.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, transition: 'background-color 0.2s' }}>
                                        <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Typography fontWeight="bold">{dealer.name}</Typography>
                                            <Typography variant="caption" sx={{ color: '#64748B' }}>Added {formatDateTime(dealer.created_at).split(' ')[0]}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{dealer.contact_person || '-'}</TableCell>
                                        <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{dealer.mobile}</TableCell>
                                        <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Bids Won</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{wonBids.length} / {totalBids}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Win Rate</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: Number(winRate) > 40 ? '#10B981' : (Number(winRate) > 0 ? '#F59E0B' : 'inherit') }}>{winRate}%</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Revenue</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#6C63FF' }}>₹{totalRevenue}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Chip 
                                                label={dealer.status} 
                                                size="small"
                                                color={dealer.status === 'ACTIVE' ? 'success' : 'default'}
                                                sx={{ fontWeight: 'bold' }}
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

            {/* Create Dealer Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3, width: '100%', maxWidth: 600 } }}>
                <form onSubmit={handleCreateSubmit}>
                    <DialogTitle>Invite New Dealer</DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            
                            <Typography variant="subtitle2" color="primary">Dealer Business Info</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        label="Business / Shop Name"
                                        required fullWidth variant="outlined"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        label="Contact Person Name"
                                        required fullWidth variant="outlined"
                                        value={formData.contact_person}
                                        onChange={e => setFormData({...formData, contact_person: e.target.value})}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        label="Mobile Number (WhatsApp)"
                                        required fullWidth variant="outlined"
                                        value={formData.mobile}
                                        onChange={e => setFormData({...formData, mobile: e.target.value})}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        label="Business Address"
                                        multiline rows={2} required fullWidth variant="outlined"
                                        value={formData.address}
                                        onChange={e => setFormData({...formData, address: e.target.value})}
                                    />
                                </Grid>
                            </Grid>

                            <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Dealer Login Credentials</Typography>
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
                                        label="Temporary Password"
                                        required fullWidth variant="outlined"
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                </Grid>
                            </Grid>
                            <Typography variant="caption" sx={{ color: 'warning.main' }}>
                                Note: This will create an account immediately. Please share these credentials securely with the dealer.
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}>
                            {submitting ? 'Creating Account...' : 'Create Account & Profile'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default AdminDealersPage;
