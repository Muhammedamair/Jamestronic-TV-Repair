"use client";
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Chip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CardMedia, Switch, FormControlLabel, Checkbox, FormGroup,
    Avatar, LinearProgress, Tooltip, MenuItem,
} from '@mui/material';
import {
    Add, PhotoCamera, Delete, LocalShipping, DirectionsCar, TwoWheeler, Map,
    ShoppingCart, Gavel, CheckCircle, HourglassEmpty, Cancel,
    RateReview, TrendingUp, AttachMoney,
} from '@mui/icons-material';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { supabase } from '../../supabaseClient';
import { PartRequest, PartBid, Dealer, PartRequestStatus, Transporter } from '../../types/database';
import { formatDateTime, formatCurrency, formatRelative } from '../../utils/formatters';

// Dark Store (JamesTronic) fixed address
const DARK_STORE_ADDRESS = 'Jamestronic TV Repair & Installation, Main Road, Laxman Nagar, Friends Colony, Gulshan Colony, Qutub Shahi Tombs, Manikonda, Hyderabad, Telangana 500008';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING_REVIEW: { label: 'Pending Review', color: '#F59E0B', icon: <RateReview fontSize="small" /> },
    OPEN: { label: 'Open', color: '#00D9FF', icon: <ShoppingCart fontSize="small" /> },
    BIDS_RECEIVED: { label: 'Bids Received', color: '#6C63FF', icon: <Gavel fontSize="small" /> },
    APPROVED: { label: 'Approved', color: '#10B981', icon: <CheckCircle fontSize="small" /> },
    RECEIVED: { label: 'Received', color: '#34D399', icon: <LocalShipping fontSize="small" /> },
    CANCELLED: { label: 'Cancelled', color: '#EF4444', icon: <Cancel fontSize="small" /> },
};

const PartRequestsPage: React.FC = () => {
    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Image Viewer state
    const [viewImages, setViewImages] = useState<{ urls: string[], index: number } | null>(null);

    // New Request Dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        part_name: '',
        tv_brand: '',
        tv_model: '',
        tv_size: '',
        description: ''
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Dealer targeting state
    const [allDealers, setAllDealers] = useState<Dealer[]>([]);
    const [broadcastAll, setBroadcastAll] = useState(true);
    const [selectedDealerIds, setSelectedDealerIds] = useState<string[]>([]);

    // Transport booking state
    const [transportDialogOpen, setTransportDialogOpen] = useState(false);
    const [transportDealerAddress, setTransportDealerAddress] = useState('');
    const [transportPartRequestId, setTransportPartRequestId] = useState<string | null>(null);
    const [transporters, setTransporters] = useState<Transporter[]>([]);
    const [selectedTransporterId, setSelectedTransporterId] = useState('');
    const [assigningTransporter, setAssigningTransporter] = useState(false);

    // Review & Broadcast state
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [reviewRequest, setReviewRequest] = useState<PartRequest | null>(null);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    const fetchRequests = async () => {
        const { data } = await supabase
            .from('part_requests')
            .select('*, bids:part_bids(*, dealer:dealers(*)), transport_jobs(*)')
            .order('created_at', { ascending: false });
        
        if (data) setRequests(data as PartRequest[]);
        setLoading(false);
    };

    const fetchDealers = async () => {
        const { data } = await supabase.from('dealers').select('*').eq('status', 'ACTIVE').order('name');
        if (data) setAllDealers(data as Dealer[]);
    };

    const fetchTransporters = async () => {
        const { data } = await supabase.from('transporters').select('*').eq('status', 'ACTIVE').order('name');
        if (data) setTransporters(data as Transporter[]);
    };

    useEffect(() => {
        fetchRequests();
        fetchDealers();
        fetchTransporters();

        const channel = supabase.channel('admin-part-requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'part_requests' }, () => {
                fetchRequests();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'part_bids' }, () => {
                fetchRequests();
                playNotificationSound();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        let uploadedUrls: string[] = [];

        if (selectedFiles.length > 0) {
            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `requests/${Date.now()}_${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('procurement-images')
                    .upload(filePath, file);
                    
                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('procurement-images')
                        .getPublicUrl(filePath);
                    uploadedUrls.push(publicUrl);
                } else {
                    console.error('Error uploading image:', uploadError);
                }
            }
        }

        const { data: insertedData, error } = await supabase.from('part_requests').insert({
            part_name: formData.part_name,
            tv_brand: formData.tv_brand,
            tv_model: formData.tv_model,
            tv_size: formData.tv_size,
            description: formData.description,
            image_urls: uploadedUrls,
            target_dealer_ids: broadcastAll ? null : selectedDealerIds
        }).select().single();
        
        if (!error && insertedData) {
            supabase.functions.invoke('send-push-notification', {
                body: {
                    request_id: insertedData.id,
                    part_name: formData.part_name,
                    tv_brand: formData.tv_brand,
                    target_dealer_ids: broadcastAll ? null : selectedDealerIds,
                    event_type: 'PART_REQUEST_BROADCAST',
                    source_id: insertedData.id,
                    source_table: 'part_requests',
                    target_role: 'DEALER',
                    target_user_name: 'All Dealers'
                }
            }).then(res => {
                console.log('Push response:', res.data);
            }).catch(err => {
                console.error('Push notification error:', err);
            });

            setCreateDialogOpen(false);
            setFormData({ part_name: '', tv_brand: '', tv_model: '', tv_size: '', description: '' });
            setSelectedFiles([]);
            setBroadcastAll(true);
            setSelectedDealerIds([]);
            fetchRequests();
        } else {
            console.error(error);
            alert('Failed to create part request.');
        }
        setSubmitting(false);
    };

    const handleReviewBroadcast = async () => {
        if (!reviewRequest) return;
        setReviewSubmitting(true);
        
        const { error } = await supabase.from('part_requests').update({
            status: 'OPEN',
            target_dealer_ids: broadcastAll ? null : selectedDealerIds
        }).eq('id', reviewRequest.id);

        if (!error) {
            supabase.functions.invoke('send-push-notification', {
                body: {
                    request_id: reviewRequest.id,
                    part_name: reviewRequest.part_name,
                    tv_brand: reviewRequest.tv_brand,
                    target_dealer_ids: broadcastAll ? null : selectedDealerIds,
                    event_type: 'PART_REQUEST_BROADCAST',
                    source_id: reviewRequest.id,
                    source_table: 'part_requests',
                    target_role: 'DEALER',
                    target_user_name: 'All Dealers'
                }
            }).catch(console.error);

            setReviewDialogOpen(false);
            setReviewRequest(null);
            setBroadcastAll(true);
            setSelectedDealerIds([]);
            fetchRequests();
        } else {
            alert('Failed to broadcast request.');
        }
        setReviewSubmitting(false);
    };

    const handleApproveBid = async (request: PartRequest, bid: PartBid) => {
        if (!window.confirm(`Approve bid from ${bid.dealer?.name} for ₹${bid.price}?`)) return;

        await supabase.from('part_bids').update({ is_accepted: true }).eq('id', bid.id);
        await supabase.from('part_requests')
            .update({ 
                status: 'APPROVED',
                assigned_dealer_id: bid.dealer_id,
                approved_price: bid.price
            })
            .eq('id', request.id);
            
        fetchRequests();
    };

    const openTransportDialog = (dealerAddress: string, partRequestId?: string) => {
        setTransportDealerAddress(dealerAddress || 'Hyderabad, Telangana');
        setTransportPartRequestId(partRequestId || null);
        setSelectedTransporterId('');
        setTransportDialogOpen(true);
    };

    const handleAssignTransporter = async () => {
        if (!selectedTransporterId || !transportPartRequestId) return;
        setAssigningTransporter(true);
        try {
            // Generate 6-digit OTP for pickup verification
            const pickupOtp = String(Math.floor(100000 + Math.random() * 900000));

            const acceptedBid = requests.find(r => r.id === transportPartRequestId)
                ?.bids?.find(b => b.is_accepted);
            const { error } = await supabase.from('transport_jobs').insert({
                part_request_id: transportPartRequestId,
                transporter_id: selectedTransporterId,
                pickup_address: transportDealerAddress,
                pickup_contact_name: acceptedBid?.dealer?.name || '',
                pickup_contact_mobile: acceptedBid?.dealer?.mobile || '',
                drop_address: DARK_STORE_ADDRESS,
                item_description: requests.find(r => r.id === transportPartRequestId)?.part_name || 'Part pickup',
                pickup_otp: pickupOtp,
            });
            if (error) throw error;

            // Send push notification to the transporter
            try {
                // Get user_id from local array or fetch from DB
                let transporterUserId = transporters.find(t => t.id === selectedTransporterId)?.user_id;
                
                if (!transporterUserId) {
                    // Fallback: query DB directly for user_id
                    const { data: tData } = await supabase
                        .from('transporters')
                        .select('user_id')
                        .eq('id', selectedTransporterId)
                        .single();
                    transporterUserId = tData?.user_id;
                    console.log('Fetched transporter user_id from DB:', transporterUserId);
                }

                if (transporterUserId) {
                    const pushResult = await supabase.functions.invoke('send-push-notification', {
                        body: {
                            title: '🚚 New Delivery Assigned!',
                            body: `Pickup from ${acceptedBid?.dealer?.name || 'dealer'}. Open to accept.`,
                            url: '/transport',
                            target_user_ids: [transporterUserId],
                            event_type: 'TRANSPORT_ASSIGNED',
                            source_id: transportPartRequestId,
                            source_table: 'transport_jobs',
                            target_role: 'TRANSPORTER',
                            target_user_name: transporters.find(t => t.id === selectedTransporterId)?.name || 'Transporter'
                        }
                    });
                    console.log('✅ Transporter push notification result:', pushResult.data);
                    if (pushResult.error) {
                        console.error('Push function error:', pushResult.error);
                    }
                } else {
                    console.warn('⚠️ Transporter has no linked user_id. Cannot send push notification.');
                }
            } catch (pushErr) {
                console.error('Push notification failed:', pushErr);
            }

            setTransportDialogOpen(false);
            setTimeout(() => {
                alert(`✅ Transporter assigned!\n\n🔐 Pickup OTP: ${pickupOtp}\n\nShare this OTP with the dealer. The transporter must enter this code to verify pickup.`);
            }, 100);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
        setAssigningTransporter(false);
    };

    const getGoogleMapsUrl = () => {
        const pickup = encodeURIComponent(transportDealerAddress);
        const drop = encodeURIComponent(DARK_STORE_ADDRESS);
        return `https://www.google.com/maps/dir/?api=1&origin=${pickup}&destination=${drop}&travelmode=driving`;
    };

    const getRapidoUrl = () => `https://www.rapido.bike`;
    const getPorterUrl = () => `https://porter.in`;

    const ImageThumbnail = ({ urls, index }: { urls: string[], index: number }) => (
        <Card 
            sx={{ width: 60, height: 60, cursor: 'pointer', flexShrink: 0, borderRadius: 2, mr: 1, border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setViewImages({ urls, index })}
        >
            <CardMedia component="img" image={urls[index]} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Card>
    );

    // ----------- KPI Calculations -----------
    const totalRequests = requests.length;
    const pendingReview = requests.filter(r => r.status === 'PENDING_REVIEW').length;
    const openRequests = requests.filter(r => r.status === 'OPEN' || r.status === 'BIDS_RECEIVED').length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED' || r.status === 'RECEIVED').length;
    const totalBids = requests.reduce((sum, r) => sum + (r.bids?.length || 0), 0);
    const totalSpend = requests.reduce((sum, r) => sum + (r.approved_price || 0), 0);

    // ----------- Status Filters -----------
    const statusFilterOptions = [
        { label: 'All', value: 'ALL', color: '#F1F5F9', count: totalRequests },
        { label: 'Pending Review', value: 'PENDING_REVIEW', color: '#F59E0B', count: pendingReview },
        { label: 'Open', value: 'OPEN', color: '#00D9FF', count: openRequests },
        { label: 'Approved', value: 'APPROVED', color: '#10B981', count: approvedRequests },
        { label: 'Cancelled', value: 'CANCELLED', color: '#EF4444', count: requests.filter(r => r.status === 'CANCELLED').length },
    ];

    const filteredRequests = requests.filter(req => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'OPEN') return req.status === 'OPEN' || req.status === 'BIDS_RECEIVED';
        if (statusFilter === 'APPROVED') return req.status === 'APPROVED' || req.status === 'RECEIVED';
        return req.status === statusFilter;
    });

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Procurement Hub</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage part requests, dealer bids, and supply chain
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
                    Broadcast Request
                </Button>
            </Box>

            {/* Global KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 2.4 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(108,99,255,0.04) 100%)',
                        border: '1px solid rgba(108,99,255,0.15)',
                    }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF' }}>
                                    <ShoppingCart sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.6rem' }}>
                                    TOTAL
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#6C63FF' }}>
                                {totalRequests}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Requests</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 2.4 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
                        border: '1px solid rgba(245,158,11,0.15)',
                    }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                                    <RateReview sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.6rem' }}>
                                    PENDING
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#F59E0B' }}>
                                {pendingReview}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Need Review</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 2.4 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(0,217,255,0.12) 0%, rgba(0,217,255,0.04) 100%)',
                        border: '1px solid rgba(0,217,255,0.15)',
                    }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(0,217,255,0.15)', color: '#00D9FF' }}>
                                    <Gavel sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.6rem' }}>
                                    BIDS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#00D9FF' }}>
                                {totalBids}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Received</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 2.4 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)',
                        border: '1px solid rgba(16,185,129,0.15)',
                    }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                                    <CheckCircle sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.6rem' }}>
                                    APPROVED
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>
                                {approvedRequests}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Fulfilled</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 2.4 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)',
                        border: '1px solid rgba(239,68,68,0.15)',
                    }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                                    <AttachMoney sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.6rem' }}>
                                    SPEND
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#EF4444' }}>
                                {formatCurrency(totalSpend)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Approved total</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Status Filter Chips */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {statusFilterOptions.map(sf => (
                            <Chip
                                key={sf.value}
                                label={`${sf.label} (${sf.count})`}
                                size="small"
                                onClick={() => setStatusFilter(sf.value)}
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    backgroundColor: statusFilter === sf.value ? `${sf.color}20` : 'transparent',
                                    color: statusFilter === sf.value ? sf.color : '#64748B',
                                    border: `1px solid ${statusFilter === sf.value ? `${sf.color}40` : 'rgba(148,163,184,0.15)'}`,
                                    '&:hover': { backgroundColor: `${sf.color}15` },
                                }}
                            />
                        ))}
                    </Box>
                </CardContent>
            </Card>

            {/* Part Request Cards */}
            {filteredRequests.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <ShoppingCart sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
                    <Typography color="text.secondary">
                        {statusFilter === 'ALL' ? 'No part requests yet. Click "Broadcast Request" to get started.' : 'No requests matching this filter.'}
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filteredRequests.map(req => {
                        const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.OPEN;
                        const bidCount = req.bids?.length || 0;
                        const acceptedBid = req.bids?.find(b => b.is_accepted);

                        return (
                            <Grid size={{ xs: 12 }} key={req.id}>
                                <Card sx={{
                                    border: req.status === 'PENDING_REVIEW'
                                        ? '1px solid rgba(245,158,11,0.3)'
                                        : '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': { border: '1px solid rgba(108,99,255,0.2)' },
                                }}>
                                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                        {/* Request Header */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <Avatar sx={{
                                                    width: 44, height: 44,
                                                    bgcolor: `${statusConf.color}15`,
                                                    color: statusConf.color,
                                                }}>
                                                    {statusConf.icon}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={700} sx={{ color: '#E2E8F0', lineHeight: 1.2 }}>
                                                        {req.part_name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                                            📺 {req.tv_brand} {req.tv_size ? `${req.tv_size}"` : ''} {req.tv_model || ''}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: '#475569' }}>
                                                            {formatRelative(req.created_at)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                {bidCount > 0 && (
                                                    <Chip
                                                        icon={<Gavel sx={{ fontSize: '14px !important' }} />}
                                                        label={`${bidCount} Bid${bidCount !== 1 ? 's' : ''}`}
                                                        size="small"
                                                        sx={{
                                                            height: 24, fontSize: '0.7rem', fontWeight: 700,
                                                            bgcolor: 'rgba(108,99,255,0.12)', color: '#6C63FF',
                                                        }}
                                                    />
                                                )}
                                                <Chip
                                                    label={statusConf.label}
                                                    size="small"
                                                    sx={{
                                                        height: 24, fontSize: '0.7rem', fontWeight: 700,
                                                        bgcolor: `${statusConf.color}20`,
                                                        color: statusConf.color,
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                        
                                        {req.description && (
                                            <Typography variant="body2" sx={{
                                                color: '#94A3B8', mb: 2, fontStyle: 'italic',
                                                bgcolor: 'rgba(255,255,255,0.03)', p: 1.5, borderRadius: 2,
                                            }}>
                                                {req.description}
                                            </Typography>
                                        )}

                                        {/* Images */}
                                        {req.image_urls && req.image_urls.length > 0 && (
                                            <Box sx={{ display: 'flex', overflowX: 'auto', mb: 2, pb: 1, gap: 1 }}>
                                                {req.image_urls.map((_, i) => <ImageThumbnail key={i} urls={req.image_urls!} index={i} />)}
                                            </Box>
                                        )}

                                        {/* Approved Bid Summary */}
                                        {acceptedBid && (
                                            <Box sx={{
                                                p: 2, mb: 2, borderRadius: 2,
                                                bgcolor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1,
                                            }}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
                                                        ✅ Approved Dealer
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#E2E8F0' }}>
                                                        {acceptedBid.dealer?.name || 'Unknown'}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="h6" fontWeight={800} sx={{ color: '#10B981' }}>
                                                    {formatCurrency(acceptedBid.price)}
                                                </Typography>
                                                {/* Show Book Transport ONLY if no transport job exists for this request */}
                                                {!(req as any).transport_jobs?.length && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<LocalShipping />}
                                                    onClick={() => openTransportDialog(acceptedBid.dealer?.address || '', req.id)}
                                                    sx={{
                                                        borderRadius: 2, textTransform: 'none', fontSize: '0.75rem',
                                                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                                        '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' }
                                                    }}
                                                >
                                                    Book Transport
                                                </Button>
                                                )}
                                                {(req as any).transport_jobs?.length > 0 && (
                                                    <Chip
                                                        icon={<LocalShipping sx={{ fontSize: '16px !important' }} />}
                                                        label={`Transport ${(req as any).transport_jobs[0].status === 'DELIVERED' ? 'Delivered ✅' : 'Booked'}`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: (req as any).transport_jobs[0].status === 'DELIVERED' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                            color: (req as any).transport_jobs[0].status === 'DELIVERED' ? '#10B981' : '#F59E0B',
                                                            fontWeight: 600,
                                                            borderRadius: 1.5
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        )}

                                        {/* Pending Review Action */}
                                        {req.status === 'PENDING_REVIEW' && (
                                            <Box sx={{ p: 2, bgcolor: 'rgba(245,158,11,0.05)', borderRadius: 2, border: '1px solid rgba(245,158,11,0.2)' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ color: '#F59E0B' }}>
                                                            Action Required: Review Technician Request
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                                            Review the details before broadcasting to the dealer network.
                                                        </Typography>
                                                    </Box>
                                                    <Button 
                                                        variant="contained" 
                                                        color="warning" 
                                                        size="small"
                                                        onClick={() => {
                                                            setReviewRequest(req);
                                                            setBroadcastAll(true);
                                                            setSelectedDealerIds([]);
                                                            setReviewDialogOpen(true);
                                                        }}
                                                        sx={{ fontWeight: 'bold', borderRadius: 2, textTransform: 'none' }}
                                                    >
                                                        Review & Broadcast
                                                    </Button>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Bids Table (for non-pending requests) */}
                                        {req.status !== 'PENDING_REVIEW' && req.bids && req.bids.length > 0 && (
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mb: 1, display: 'block' }}>
                                                    DEALER BIDS
                                                </Typography>
                                                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(15,23,42,0.5)', backgroundImage: 'none', borderRadius: 2 }}>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Dealer</TableCell>
                                                                <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Price</TableCell>
                                                                <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Photos</TableCell>
                                                                <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Notes</TableCell>
                                                                <TableCell align="right" sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Action</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {req.bids.map(bid => (
                                                                <TableRow key={bid.id} sx={{ '&:hover': { bgcolor: 'rgba(108,99,255,0.05)' } }}>
                                                                    <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Typography variant="body2" fontWeight={600}>{bid.dealer?.name || 'Unknown'}</Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Typography variant="body2" fontWeight={700} sx={{ color: '#F59E0B' }}>
                                                                            {formatCurrency(bid.price)}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        {bid.image_urls && bid.image_urls.length > 0 ? (
                                                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                                {bid.image_urls.map((url, i) => (
                                                                                    <Box 
                                                                                        key={i} 
                                                                                        onClick={() => setViewImages({ urls: bid.image_urls!, index: i })}
                                                                                        sx={{ 
                                                                                            width: 36, height: 36, cursor: 'pointer', borderRadius: 1, 
                                                                                            backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                                                                                            border: '1px solid rgba(255,255,255,0.2)'
                                                                                        }} 
                                                                                    />
                                                                                ))}
                                                                            </Box>
                                                                        ) : (
                                                                            <Typography variant="caption" color="text.secondary">—</Typography>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        <Typography variant="body2">{bid.notes || '—'}</Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                        {bid.is_accepted ? (
                                                                            <Chip label="Accepted ✓" size="small" sx={{
                                                                                height: 22, fontSize: '0.65rem', fontWeight: 700,
                                                                                bgcolor: 'rgba(16,185,129,0.2)', color: '#10B981',
                                                                            }} />
                                                                        ) : req.status === 'OPEN' || req.status === 'BIDS_RECEIVED' ? (
                                                                            <Button
                                                                                variant="outlined" color="primary" size="small"
                                                                                onClick={() => handleApproveBid(req, bid)}
                                                                                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}
                                                                            >
                                                                                Approve
                                                                            </Button>
                                                                        ) : null}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>
                                        )}

                                        {/* No bids message */}
                                        {req.status !== 'PENDING_REVIEW' && (!req.bids || req.bids.length === 0) && (
                                            <Typography variant="body2" sx={{ color: '#475569', mt: 1, fontStyle: 'italic' }}>
                                                No bids received yet. Dealers have been notified.
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Transport Booking Dialog */}
            <Dialog open={transportDialogOpen} onClose={() => setTransportDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3, width: '100%', maxWidth: 460 } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShipping sx={{ color: '#F59E0B' }} />
                        <Typography variant="h6" fontWeight="bold">Book Transport</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Box sx={{ flex: 1, pr: 2 }}>
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>PICKUP (Dealer)</Typography>
                                <Typography variant="body2" sx={{ color: '#E2E8F0', fontWeight: 600, wordBreak: 'break-word' }}>{transportDealerAddress}</Typography>
                            </Box>
                            <Button size="small" onClick={() => { navigator.clipboard.writeText(transportDealerAddress); }} sx={{ minWidth: 'auto', color: '#6C63FF', textTransform: 'none', fontSize: '0.7rem' }}>Copy</Button>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1, pr: 2 }}>
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>DROP (Dark Store)</Typography>
                                <Typography variant="body2" sx={{ color: '#E2E8F0', fontWeight: 600, wordBreak: 'break-word' }}>{DARK_STORE_ADDRESS}</Typography>
                            </Box>
                            <Button size="small" onClick={() => { navigator.clipboard.writeText(DARK_STORE_ADDRESS); }} sx={{ minWidth: 'auto', color: '#6C63FF', textTransform: 'none', fontSize: '0.7rem' }}>Copy</Button>
                        </Box>
                    </Box>

                    {/* Assign Transporter Section */}
                    <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <Typography variant="subtitle2" sx={{ color: '#F59E0B', mb: 1.5, fontWeight: 700 }}>🚀 Assign Your Transporter</Typography>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Select Transporter"
                            value={selectedTransporterId}
                            onChange={e => setSelectedTransporterId(e.target.value)}
                            sx={{ mb: 1.5 }}
                        >
                            <MenuItem value="" disabled>Choose a transporter...</MenuItem>
                            {transporters.map(t => (
                                <MenuItem key={t.id} value={t.id}>{t.name} ({t.vehicle_type}{t.vehicle_number ? ` • ${t.vehicle_number}` : ''})</MenuItem>
                            ))}
                        </TextField>
                        <Button
                            fullWidth
                            variant="contained"
                            disabled={!selectedTransporterId || assigningTransporter}
                            onClick={handleAssignTransporter}
                            startIcon={assigningTransporter ? <CircularProgress size={18} color="inherit" /> : <LocalShipping />}
                            sx={{
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                fontWeight: 700, textTransform: 'none', borderRadius: 2, py: 1.2,
                                '&:hover': { background: 'linear-gradient(135deg, #D97706, #B45309)' },
                            }}
                        >
                            {assigningTransporter ? 'Assigning...' : 'Assign & Notify Transporter'}
                        </Button>
                    </Box>

                    <Typography variant="subtitle2" sx={{ color: '#94A3B8', mb: 1.5 }}>Or use an external service:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Button fullWidth variant="outlined" startIcon={<TwoWheeler />}
                            onClick={() => { navigator.clipboard.writeText(`Pickup: ${transportDealerAddress}\nDrop: ${DARK_STORE_ADDRESS}`); window.open(getRapidoUrl(), '_blank'); }}
                            sx={{ justifyContent: 'flex-start', borderRadius: 2, py: 1.5, color: '#FCD34D', borderColor: 'rgba(252,211,77,0.3)', '&:hover': { bgcolor: 'rgba(252,211,77,0.08)', borderColor: '#FCD34D' } }}
                        >
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="body2" fontWeight="bold">Rapido</Typography>
                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>2-Wheeler • Addresses copied</Typography>
                            </Box>
                        </Button>
                        <Button fullWidth variant="outlined" startIcon={<DirectionsCar />}
                            onClick={() => { navigator.clipboard.writeText(`Pickup: ${transportDealerAddress}\nDrop: ${DARK_STORE_ADDRESS}`); window.open(getPorterUrl(), '_blank'); }}
                            sx={{ justifyContent: 'flex-start', borderRadius: 2, py: 1.5, color: '#60A5FA', borderColor: 'rgba(96,165,250,0.3)', '&:hover': { bgcolor: 'rgba(96,165,250,0.08)', borderColor: '#60A5FA' } }}
                        >
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="body2" fontWeight="bold">Porter</Typography>
                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>4-Wheeler • Addresses copied</Typography>
                            </Box>
                        </Button>
                        <Button fullWidth variant="contained" startIcon={<Map />}
                            onClick={() => window.open(getGoogleMapsUrl(), '_blank')}
                            sx={{ justifyContent: 'flex-start', borderRadius: 2, py: 1.5, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' } }}
                        >
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="body2" fontWeight="bold">Google Maps Directions</Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Route auto-filled</Typography>
                            </Box>
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setTransportDialogOpen(false)} sx={{ color: 'text.secondary' }}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Create Request Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3, width: '100%', maxWidth: 500 } }}>
                <form onSubmit={handleCreateSubmit}>
                    <DialogTitle>Broadcast Part Request</DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField label="Part Name (e.g. Backlight, Motherboard)" required fullWidth variant="outlined" value={formData.part_name} onChange={e => setFormData({...formData, part_name: e.target.value})} />
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}><TextField label="TV Brand" required fullWidth variant="outlined" value={formData.tv_brand} onChange={e => setFormData({...formData, tv_brand: e.target.value})} /></Grid>
                                <Grid size={{ xs: 6 }}><TextField label="TV Size (inch)" type="number" fullWidth variant="outlined" value={formData.tv_size} onChange={e => setFormData({...formData, tv_size: e.target.value})} /></Grid>
                            </Grid>
                            <TextField label="TV Model Number (Optional)" fullWidth variant="outlined" value={formData.tv_model} onChange={e => setFormData({...formData, tv_model: e.target.value})} />
                            <TextField label="Additional Notes/Description" multiline rows={3} fullWidth variant="outlined" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />

                            <Box sx={{ mt: 1 }}>
                                <Button component="label" variant="outlined" startIcon={<PhotoCamera />} sx={{ borderRadius: 2, color: '#94A3B8', borderColor: 'rgba(255,255,255,0.2)' }}>
                                    Attach Reference Photos
                                    <input type="file" hidden multiple accept="image/*" onChange={handleFileSelect} />
                                </Button>
                                {selectedFiles.length > 0 && (
                                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {selectedFiles.map((file, i) => (
                                            <Box key={i} sx={{ position: 'relative', width: 60, height: 60, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                                                <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <IconButton size="small" onClick={() => removeFile(i)} sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.6)', p: 0.2, '&:hover': { bgcolor: 'rgba(239,68,68,0.8)' } }}>
                                                    <Delete sx={{ fontSize: 14, color: '#FFF' }} />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>

                            <Box sx={{ mt: 1, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <FormControlLabel
                                    control={<Switch checked={broadcastAll} onChange={(e) => { setBroadcastAll(e.target.checked); if (e.target.checked) setSelectedDealerIds([]); }} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6C63FF' } }} />}
                                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{broadcastAll ? '📡 Broadcast to All Dealers' : '🎯 Send to Selected Dealers'}</Typography>}
                                />
                                {!broadcastAll && (
                                    <FormGroup sx={{ mt: 1, pl: 1 }}>
                                        {allDealers.length === 0 ? (
                                            <Typography variant="caption" sx={{ color: '#64748B' }}>No active dealers found.</Typography>
                                        ) : (
                                            allDealers.map(d => (
                                                <FormControlLabel key={d.id}
                                                    control={<Checkbox checked={selectedDealerIds.includes(d.id)} onChange={(e) => { if (e.target.checked) setSelectedDealerIds(prev => [...prev, d.id]); else setSelectedDealerIds(prev => prev.filter(id => id !== d.id)); }} sx={{ color: '#64748B', '&.Mui-checked': { color: '#6C63FF' } }} />}
                                                    label={<Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{d.name}</Typography><Typography variant="caption" sx={{ color: '#64748B' }}>{d.contact_person} • {d.mobile}</Typography></Box>}
                                                />
                                            ))
                                        )}
                                    </FormGroup>
                                )}
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, pt: 0 }}>
                        <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}>{submitting ? 'Broadcasting...' : 'Broadcast to Dealers'}</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Review & Broadcast Dialog */}
            <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3 } }}>
                <DialogTitle>Broadcast Technician Request</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Select the dealers you want to send this part request to.</Typography>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <FormControlLabel
                            control={<Switch checked={broadcastAll} onChange={(e) => { setBroadcastAll(e.target.checked); if (e.target.checked) setSelectedDealerIds([]); }} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6C63FF' } }} />}
                            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{broadcastAll ? '📡 Broadcast to All Dealers' : '🎯 Send to Selected Dealers'}</Typography>}
                        />
                        {!broadcastAll && (
                            <FormGroup sx={{ mt: 1, pl: 1, maxHeight: 200, overflowY: 'auto' }}>
                                {allDealers.length === 0 ? (
                                    <Typography variant="caption" sx={{ color: '#64748B' }}>No active dealers found.</Typography>
                                ) : (
                                    allDealers.map(d => (
                                        <FormControlLabel key={d.id}
                                            control={<Checkbox checked={selectedDealerIds.includes(d.id)} onChange={(e) => { if (e.target.checked) setSelectedDealerIds(prev => [...prev, d.id]); else setSelectedDealerIds(prev => prev.filter(id => id !== d.id)); }} sx={{ color: '#64748B', '&.Mui-checked': { color: '#6C63FF' } }} />}
                                            label={<Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{d.name}</Typography><Typography variant="caption" sx={{ color: '#64748B' }}>{d.contact_person} • {d.mobile}</Typography></Box>}
                                        />
                                    ))
                                )}
                            </FormGroup>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setReviewDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button onClick={handleReviewBroadcast} variant="contained" color="warning" disabled={reviewSubmitting}>{reviewSubmitting ? 'Broadcasting...' : 'Broadcast to Dealers'}</Button>
                </DialogActions>
            </Dialog>

            {/* Fullscreen Image Gallery */}
            <Lightbox
                open={!!viewImages}
                close={() => setViewImages(null)}
                index={viewImages ? viewImages.index : 0}
                slides={viewImages ? viewImages.urls.map(url => ({ src: url })) : []}
                plugins={[Zoom]}
                zoom={{ maxZoomPixelRatio: 5 }}
            />
        </Box>
    );
};

export default PartRequestsPage;
