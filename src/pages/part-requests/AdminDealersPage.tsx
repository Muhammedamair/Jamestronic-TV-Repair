import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Chip, IconButton, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Grid, MenuItem,
    Card, CardContent, Avatar, Collapse, LinearProgress, Tooltip,
} from '@mui/material';
import {
    Add, Edit, ExpandMore, ExpandLess, Store, CheckCircle,
    TrendingUp, AttachMoney, Gavel, LocalShipping,
    Visibility, StickyNote2, EmojiEvents, ShoppingCart,
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Dealer, PartBid, PartRequest } from '../../types/database';
import { formatRelative, formatCurrency } from '../../utils/formatters';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
    const [allBids, setAllBids] = useState<PartBid[]>([]);
    const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDealerId, setExpandedDealerId] = useState<string | null>(null);

    // Create Dialog state
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

    const fetchAll = async () => {
        const [dealerRes, bidsRes, requestsRes] = await Promise.all([
            supabase.from('dealers').select('*, bids:part_bids(*)').order('created_at', { ascending: false }),
            supabase.from('part_bids').select('*').order('created_at', { ascending: false }),
            supabase.from('part_requests').select('*').order('created_at', { ascending: false }),
        ]);
        if (dealerRes.data) setDealers(dealerRes.data as Dealer[]);
        if (bidsRes.data) setAllBids(bidsRes.data);
        if (requestsRes.data) setPartRequests(requestsRes.data);
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

            const { error: rpcError } = await supabase.rpc('admin_create_dealer_profile', {
                p_new_user_id: newUserId,
                p_name: formData.name,
                p_contact_person: formData.contact_person,
                p_mobile: formData.mobile,
                p_address: formData.address
            });
            if (rpcError) throw new Error(`Profile creation failed: ${rpcError.message}`);

            alert(`Dealer account created successfully! They can log in with: ${formData.email}`);
            setCreateDialogOpen(false);
            setFormData({ name: '', contact_person: '', mobile: '', address: '', email: '', password: '' });
            fetchAll();
        } catch (err: any) {
            console.error(err);
            alert(`Failed to create dealer: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (dealer: Dealer) => {
        const newStatus = dealer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await supabase.from('dealers').update({ status: newStatus }).eq('id', dealer.id);
        fetchAll();
    };

    // Performance stats per dealer
    const getStats = (dealer: Dealer) => {
        const bids = dealer.bids || [];
        const totalBids = bids.length;
        const wonBids = bids.filter(b => b.is_accepted);
        const lostBids = bids.filter(b => !b.is_accepted);
        const winRate = totalBids > 0 ? (wonBids.length / totalBids) * 100 : 0;
        const totalRevenue = wonBids.reduce((sum, b) => sum + Number(b.price), 0);
        const avgBidPrice = totalBids > 0 ? bids.reduce((sum, b) => sum + Number(b.price), 0) / totalBids : 0;

        // Get part requests assigned to or bid on by this dealer
        const dealerPartRequestIds = new Set(bids.map(b => b.request_id));
        const relatedRequests = partRequests.filter(r =>
            dealerPartRequestIds.has(r.id) || r.assigned_dealer_id === dealer.id
        );
        const fulfilledRequests = relatedRequests.filter(r => r.status === 'RECEIVED');

        return {
            totalBids,
            wonBids: wonBids.length,
            lostBids: lostBids.length,
            winRate,
            totalRevenue,
            avgBidPrice,
            partsFulfilled: fulfilledRequests.length,
            activeRequests: relatedRequests.filter(r => r.status !== 'RECEIVED' && r.status !== 'CANCELLED').length,
        };
    };

    // Get recent bids for a dealer (for expanded view)
    const getRecentBids = (dealerId: string) => {
        return allBids.filter(b => b.dealer_id === dealerId).slice(0, 5);
    };

    // Find Part Request for a bid
    const getPartRequestForBid = (requestId: string) => {
        return partRequests.find(r => r.id === requestId);
    };

    // Global KPIs
    const totalDealers = dealers.length;
    const activeDealers = dealers.filter(d => d.status === 'ACTIVE').length;
    const globalBids = allBids;
    const globalWonBids = globalBids.filter(b => b.is_accepted);
    const globalWinRate = globalBids.length > 0 ? ((globalWonBids.length / globalBids.length) * 100).toFixed(0) : '0';
    const globalRevenue = globalWonBids.reduce((sum, b) => sum + Number(b.price), 0);

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Dealer Network</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitor your parts supply chain and dealer performance
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
                    Add Dealer
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
                                    <Store fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    DEALERS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#6C63FF' }}>
                                {activeDealers}<Typography component="span" variant="body2" sx={{ color: '#64748B', ml: 0.5 }}>/ {totalDealers}</Typography>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Active partners</Typography>
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
                                    <Gavel fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    TOTAL BIDS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#00D9FF' }}>
                                {globalBids.length}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>{globalWonBids.length} accepted</Typography>
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
                                    <EmojiEvents fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    WIN RATE
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>
                                {globalWinRate}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Network average</Typography>
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
                                    <AttachMoney fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    TOTAL REVENUE
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#F59E0B' }}>
                                {formatCurrency(globalRevenue)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>From accepted bids</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Dealer Cards */}
            {dealers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <Store sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        No dealers found. Click "Add Dealer" to invite your first parts supplier.
                    </Typography>
                </Box>
            ) : (
                dealers.map(dealer => {
                    const stats = getStats(dealer);
                    const isExpanded = expandedDealerId === dealer.id;
                    const recentBids = getRecentBids(dealer.id);

                    return (
                        <Card
                            key={dealer.id}
                            sx={{
                                mb: 2,
                                border: isExpanded ? '1px solid rgba(108,99,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s ease',
                                '&:hover': { border: '1px solid rgba(108,99,255,0.2)' },
                            }}
                        >
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                {/* Dealer Header Row */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar sx={{
                                        width: 48, height: 48,
                                        bgcolor: dealer.status === 'ACTIVE' ? '#6C63FF' : '#475569',
                                        fontWeight: 700, fontSize: '1.1rem',
                                    }}>
                                        {dealer.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                                {dealer.name}
                                            </Typography>
                                            <Chip
                                                label={dealer.status}
                                                size="small"
                                                color={dealer.status === 'ACTIVE' ? 'success' : 'default'}
                                                sx={{ fontWeight: 'bold', cursor: 'pointer', height: 22, fontSize: '0.65rem' }}
                                                onClick={() => toggleStatus(dealer)}
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                                            {dealer.contact_person && (
                                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                                    👤 {dealer.contact_person}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>📱 {dealer.mobile}</Typography>
                                            {dealer.address && (
                                                <Typography variant="caption" sx={{ color: '#475569' }}>
                                                    📍 {dealer.address.length > 40 ? dealer.address.slice(0, 40) + '…' : dealer.address}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" sx={{ color: '#475569' }}>
                                                Added {new Date(dealer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" sx={{ color: '#94A3B8', '&:hover': { color: '#6C63FF' } }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={isExpanded ? 'Collapse' : 'View Bids & Activity'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => setExpandedDealerId(isExpanded ? null : dealer.id)}
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
                                        { label: 'Total Bids', value: stats.totalBids, color: '#6C63FF' },
                                        { label: 'Won', value: stats.wonBids, color: '#10B981' },
                                        { label: 'Lost', value: stats.lostBids, color: '#EF4444' },
                                        { label: 'Revenue', value: formatCurrency(stats.totalRevenue), color: '#F59E0B' },
                                        { label: 'Avg Bid', value: formatCurrency(stats.avgBidPrice), color: '#00D9FF' },
                                    ].map(stat => (
                                        <Grid size={{ xs: 4, sm: 2.4 }} key={stat.label}>
                                            <Box sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor: `${stat.color}08`,
                                                border: `1px solid ${stat.color}15`,
                                                textAlign: 'center',
                                            }}>
                                                <Typography variant="h6" fontWeight={800} sx={{ color: stat.color, lineHeight: 1 }}>
                                                    {stat.value}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.6rem' }}>
                                                    {stat.label}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Win Rate Progress Bar */}
                                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, minWidth: 60 }}>
                                        Win Rate
                                    </Typography>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={stats.winRate}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 4,
                                                    background: stats.winRate > 60
                                                        ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                                                        : stats.winRate > 30
                                                            ? 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)'
                                                            : 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)',
                                                },
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="body2" fontWeight={700} sx={{
                                        color: stats.winRate > 60 ? '#10B981' : stats.winRate > 30 ? '#F59E0B' : '#EF4444',
                                        minWidth: 40, textAlign: 'right',
                                    }}>
                                        {stats.winRate.toFixed(0)}%
                                    </Typography>
                                </Box>

                                {/* Expandable Section */}
                                <Collapse in={isExpanded} timeout="auto">
                                    <Box sx={{ mt: 3 }}>
                                        {/* Recent Bids Table */}
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Gavel fontSize="small" sx={{ color: '#6C63FF' }} />
                                            Recent Bids ({recentBids.length})
                                        </Typography>

                                        {recentBids.length > 0 ? (
                                            <TableContainer component={Paper} sx={{
                                                bgcolor: 'rgba(15,23,42,0.5)',
                                                backgroundImage: 'none',
                                                borderRadius: 2,
                                                mb: 3,
                                            }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Part Requested</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Brand / Model</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Bid Price</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Result</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: { xs: 'none', sm: 'table-cell' } }}>Submitted</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {recentBids.map(bid => {
                                                            const request = getPartRequestForBid(bid.request_id);
                                                            return (
                                                                <TableRow
                                                                    key={bid.id}
                                                                    sx={{ '&:hover': { bgcolor: 'rgba(108,99,255,0.05)' } }}
                                                                >
                                                                    <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Typography variant="body2" fontWeight={600}>
                                                                            {request?.part_name || '—'}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Typography variant="body2">{request?.tv_brand || '—'}</Typography>
                                                                        {request?.tv_model && (
                                                                            <Typography variant="caption" color="text.secondary">{request.tv_model}</Typography>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Typography variant="body2" fontWeight={700} sx={{ color: '#F59E0B' }}>
                                                                            {formatCurrency(bid.price)}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Chip
                                                                            label={bid.is_accepted ? 'Won ✓' : 'Pending'}
                                                                            size="small"
                                                                            sx={{
                                                                                height: 22,
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: 700,
                                                                                backgroundColor: bid.is_accepted ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.12)',
                                                                                color: bid.is_accepted ? '#10B981' : '#94A3B8',
                                                                            }}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)', display: { xs: 'none', sm: 'table-cell' } }}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {formatRelative(bid.created_at)}
                                                                        </Typography>
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
                                                <Gavel sx={{ fontSize: 32, color: '#334155', mb: 1 }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    No bids submitted by this dealer yet
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Dealer Summary */}
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                            <Box sx={{
                                                flex: 1, minWidth: 200, p: 2, borderRadius: 2,
                                                bgcolor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)',
                                            }}>
                                                <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
                                                    Parts Fulfilled
                                                </Typography>
                                                <Typography variant="h5" fontWeight={800} sx={{ color: '#10B981' }}>
                                                    {stats.partsFulfilled}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#64748B' }}>
                                                    Successfully delivered parts
                                                </Typography>
                                            </Box>
                                            <Box sx={{
                                                flex: 1, minWidth: 200, p: 2, borderRadius: 2,
                                                bgcolor: 'rgba(0,217,255,0.05)', border: '1px solid rgba(0,217,255,0.1)',
                                            }}>
                                                <Typography variant="caption" sx={{ color: '#00D9FF', fontWeight: 600 }}>
                                                    Active Requests
                                                </Typography>
                                                <Typography variant="h5" fontWeight={800} sx={{ color: '#00D9FF' }}>
                                                    {stats.activeRequests}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#64748B' }}>
                                                    Open part requests in pipeline
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    );
                })
            )}

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
