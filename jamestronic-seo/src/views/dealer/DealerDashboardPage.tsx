"use client";
import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, Button,
    CircularProgress, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    InputAdornment, Avatar, IconButton, CardMedia, Backdrop, Tabs, Tab
} from '@mui/material';
import { PhotoCamera, Delete, NotificationsActive, LocalShipping, Lock, VerifiedUser } from '@mui/icons-material';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { supabase } from '../../supabaseClient';
import { PartRequest, PartBid, Dealer, TransportJob, TRANSPORT_JOB_STATUS_LABELS, TRANSPORT_JOB_STATUS_COLORS } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/formatters';
import { subscribeToPush, isPushSubscribed, syncPushSubscription } from '../../utils/pushSubscription';

const DealerDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [dealerProfile, setDealerProfile] = useState<Dealer | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [transportJobs, setTransportJobs] = useState<TransportJob[]>([]);

    // Image Viewer state
    const [viewImages, setViewImages] = useState<{ urls: string[], index: number } | null>(null);

    // Bid Dialog state
    const [bidDialogOpen, setBidDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PartRequest | null>(null);
    const [bidPrice, setBidPrice] = useState('');
    const [bidNotes, setBidNotes] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [submittingBid, setSubmittingBid] = useState(false);

    // Push notification state
    const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            const { data } = await supabase.from('dealers').select('*').eq('user_id', user.id).single();
            if (data) {
                setDealerProfile(data as Dealer);
            } else {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    // Check push subscription status on mount
    useEffect(() => {
        isPushSubscribed().then(isSub => {
            setPushEnabled(isSub);
            if (isSub) syncPushSubscription();
        });
    }, []);

    useEffect(() => {
        if (!dealerProfile) return;

        const fetchRequests = async () => {
            const { data } = await supabase.from('part_requests')
                .select('*, bids:part_bids(*)')
                .order('created_at', { ascending: false });
            if (data) setRequests(data as PartRequest[]);
            setLoading(false);
        };

        fetchRequests();

        // Fetch transport jobs linked to this dealer's accepted bids
        // RLS policy ensures dealer only sees their own jobs
        const fetchTransportJobs = async () => {
            const { data: tjData } = await supabase
                .from('transport_jobs')
                .select('*')
                .in('status', ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'])
                .order('created_at', { ascending: false });
            if (tjData) setTransportJobs(tjData as TransportJob[]);
        };
        fetchTransportJobs();

        const channel = supabase.channel(`dealer-${dealerProfile.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'part_requests' }, () => {
                fetchRequests();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'part_bids' }, () => {
                fetchRequests();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_jobs' }, () => {
                fetchTransportJobs();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [dealerProfile]);

    const handleOpenBid = (request: PartRequest) => {
        setSelectedRequest(request);
        setBidPrice('');
        setBidNotes('');
        setSelectedFiles([]);
        setBidDialogOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const submitBid = async () => {
        if (!selectedRequest || !dealerProfile || !bidPrice) return;
        setSubmittingBid(true);

        let uploadedUrls: string[] = [];

        if (selectedFiles.length > 0) {
            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `bids/${Date.now()}_${fileName}`;
                
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

        const { error } = await supabase.from('part_bids').insert({
            request_id: selectedRequest.id,
            dealer_id: dealerProfile.id,
            price: parseFloat(bidPrice),
            notes: bidNotes,
            image_urls: uploadedUrls
        });

        if (!error) {
            setBidDialogOpen(false);
            const { data } = await supabase.from('part_requests')
                .select('*, bids:part_bids(*)')
                .order('created_at', { ascending: false });
            if (data) setRequests(data as PartRequest[]);
        } else {
            console.error('Failed to submit bid:', error);
            alert('Failed to submit bid. You may have already bid on this item.');
        }
        setSubmittingBid(false);
    };

    // Sync PWA App Icon Badge for Dealer (Open Requests)
    useEffect(() => {
        if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
            const openCount = requests.filter(r => r.status === 'OPEN').length;
            if (openCount > 0) {
                (navigator as any).setAppBadge(openCount).catch(console.error);
            } else {
                (navigator as any).clearAppBadge().catch(console.error);
            }
        }
    }, [requests]);

    const ImageThumbnail = ({ urls, index }: { urls: string[], index: number }) => (
        <Card 
            sx={{ width: 60, height: 60, cursor: 'pointer', flexShrink: 0, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setViewImages({ urls, index })}
        >
            <CardMedia component="img" image={urls[index]} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Card>
    );

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress sx={{ color: '#6C63FF' }} />
        </Box>
    );
    
    if (!dealerProfile) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error">Your account is not linked to a Dealer profile.</Typography>
                <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>Please contact the administrator to set up your profile.</Typography>
            </Box>
        );
    }



    const openRequests = requests.filter(r => r.status === 'OPEN');
    const myApprovedRequests = requests.filter(r => 
        r.status === 'APPROVED' && r.bids?.some(b => b.dealer_id === dealerProfile.id && b.is_accepted)
    );
    const historyRequests = requests.filter(r => !openRequests.includes(r) && !myApprovedRequests.includes(r));
    const totalBids = requests.reduce((sum, r) => sum + (r.bids?.filter(b => b.dealer_id === dealerProfile.id).length || 0), 0);

    let displayedRequests = requests;
    if (activeTab === 0) displayedRequests = openRequests;
    else if (activeTab === 1) displayedRequests = myApprovedRequests;
    else displayedRequests = historyRequests;

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Push Notification Banner */}
            {pushEnabled === false && (
                <Box
                    sx={{
                        mb: 2,
                        p: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.1) 100%)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <NotificationsActive sx={{ color: '#F59E0B', fontSize: 28 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#F59E0B' }}>
                            Enable Push Notifications
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            Get instant alerts when new part requests are broadcast — even when your phone is locked.
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
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' }
                        }}
                    >
                        Enable
                    </Button>
                </Box>
            )}
            {/* Dealer Profile Header */}
            <Box
                sx={{
                    mb: 3,
                    p: 2.5,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(16,185,129,0.08) 100%)',
                    border: '1px solid rgba(108,99,255,0.15)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: '#6C63FF',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                        }}
                    >
                        {dealerProfile.name?.charAt(0)?.toUpperCase() || 'D'}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {dealerProfile.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                            {dealerProfile.address || 'Dealer Partner'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Box sx={{ flex: 1, textAlign: 'center', py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#F59E0B' }}>{openRequests.length}</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>Open</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center', py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#10B981' }}>{myApprovedRequests.length}</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>Approved</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center', py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#6C63FF' }}>{totalBids}</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>My Bids</Typography>
                    </Box>
                </Box>
            </Box>

            {/* 🔐 Upcoming Pickups with OTP */}
            {transportJobs.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <LocalShipping sx={{ color: '#F59E0B', fontSize: 20 }} />
                        <Typography variant="subtitle1" fontWeight={700}>Upcoming Pickups</Typography>
                        <Chip label={transportJobs.length} size="small" sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontWeight: 700, height: 22 }} />
                    </Box>
                    {transportJobs.map(job => (
                        <Card key={job.id} sx={{
                            mb: 1.5,
                            background: job.otp_verified
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 100%)'
                                : 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.03) 100%)',
                            border: job.otp_verified
                                ? '1px solid rgba(16,185,129,0.2)'
                                : '1px solid rgba(245,158,11,0.2)',
                        }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                    <Box>
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
                                        <Typography variant="caption" sx={{ color: '#64748B', ml: 1 }}>
                                            📦 {job.item_description || 'Package pickup'}
                                        </Typography>
                                    </Box>
                                    {job.otp_verified && (
                                        <Chip icon={<VerifiedUser sx={{ fontSize: 14 }} />} label="Verified" size="small"
                                            sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 700, '& .MuiChip-icon': { color: '#10B981' } }} />
                                    )}
                                </Box>

                                {/* OTP Display - the main thing the dealer needs */}
                                {job.pickup_otp && !job.otp_verified && (
                                    <Box sx={{
                                        p: 2, borderRadius: 2, textAlign: 'center', mb: 1.5,
                                        background: 'rgba(245,158,11,0.08)',
                                        border: '2px dashed rgba(245,158,11,0.3)',
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                                            <Lock sx={{ fontSize: 18, color: '#F59E0B' }} />
                                            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                                PICKUP VERIFICATION CODE
                                            </Typography>
                                        </Box>
                                        <Typography variant="h3" sx={{
                                            fontWeight: 900, letterSpacing: '0.3em', color: '#F59E0B',
                                            fontFamily: 'monospace',
                                        }}>
                                            {job.pickup_otp}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                                            Share this code with the transporter when they arrive
                                        </Typography>
                                    </Box>
                                )}

                                <Typography variant="caption" sx={{ color: '#64748B' }}>
                                    Drop: {job.drop_address}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            {/* Section Header Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)', mb: 3 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(_, newValue) => setActiveTab(newValue)} 
                    variant="fullWidth"
                    textColor="inherit"
                    TabIndicatorProps={{ style: { backgroundColor: '#6C63FF' } }}
                    sx={{
                        '& .MuiTab-root': { color: '#94A3B8', fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' },
                        '& .Mui-selected': { color: '#FFF !important' }
                    }}
                >
                    <Tab label={`New Requests (${openRequests.length})`} />
                    <Tab label={`My Approved (${myApprovedRequests.length})`} />
                    <Tab label="History" />
                </Tabs>
            </Box>

            {/* Request Cards */}
            {displayedRequests.length === 0 ? (
                <Card sx={{ textAlign: 'center', p: 5, borderRadius: 3, bgcolor: '#1A2235' }}>
                    <Typography variant="h6" color="text.secondary">No requests found in this tab.</Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: '#64748B' }}>
                        {activeTab === 0 ? 'New requests from JamesTronic will appear here in real-time.' : 'Check back later for updates.'}
                    </Typography>
                </Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {displayedRequests.map(req => {
                        const myBid = req.bids?.find(b => b.dealer_id === dealerProfile.id);
                        const isOpen = req.status === 'OPEN';
                        const isApproved = req.status === 'APPROVED';
                        const bidAccepted = myBid?.is_accepted;

                        return (
                            <Card
                                key={req.id}
                                sx={{
                                    borderRadius: 3,
                                    bgcolor: '#1A2235',
                                    borderLeft: `4px solid ${isOpen ? '#F59E0B' : bidAccepted ? '#10B981' : '#6C63FF'}`,
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: `0 4px 20px ${isOpen ? 'rgba(245,158,11,0.1)' : 'rgba(108,99,255,0.1)'}`,
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                    {/* Top: Part name + Status */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#E2E8F0', lineHeight: 1.3 }}>
                                            {req.part_name}
                                        </Typography>
                                        <Chip
                                            label={req.status}
                                            size="small"
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.7rem',
                                                height: 24,
                                                bgcolor: isOpen ? 'rgba(245,158,11,0.15)' : isApproved ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                                color: isOpen ? '#F59E0B' : isApproved ? '#10B981' : '#94A3B8',
                                                border: `1px solid ${isOpen ? 'rgba(245,158,11,0.3)' : isApproved ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}`,
                                            }}
                                        />
                                    </Box>

                                    {/* TV Details */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                                            📺 {req.tv_brand} {req.tv_size ? `${req.tv_size}"` : ''} {req.tv_model}
                                        </Typography>
                                    </Box>

                                    {/* Notes */}
                                    {req.description && (
                                        <Typography variant="body2" sx={{ color: '#64748B', mb: 1, fontStyle: 'italic', fontSize: '0.8rem' }}>
                                            {req.description}
                                        </Typography>
                                    )}

                                    {/* Admin Reference Images */}
                                    {req.image_urls && req.image_urls.length > 0 && (
                                        <Box sx={{ display: 'flex', overflowX: 'auto', mt: 1.5, pb: 0.5, gap: 1 }}>
                                            {req.image_urls.map((_, i) => <ImageThumbnail key={i} urls={req.image_urls!} index={i} />)}
                                        </Box>
                                    )}

                                    {/* Date */}
                                    <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: req.image_urls?.length ? 1 : 1.5, mb: 1.5 }}>
                                        {formatDateTime(req.created_at)}
                                    </Typography>

                                    {/* Bid / Action Area */}
                                    <Box
                                        sx={{
                                            pt: 1.5,
                                            borderTop: '1px solid rgba(255,255,255,0.06)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {myBid ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                {myBid.image_urls && myBid.image_urls.length > 0 && (
                                                    <Box onClick={() => setViewImages({ urls: myBid.image_urls!, index: 0 })} sx={{ cursor: 'pointer', width: 44, height: 44, borderRadius: 1.5, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                        <img src={myBid.image_urls[0]} alt="Bid" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </Box>
                                                )}
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>
                                                        Your Bid: ₹{myBid.price?.toLocaleString('en-IN')}
                                                    </Typography>
                                                    {bidAccepted && (
                                                        <Chip
                                                            label="✓ BID ACCEPTED"
                                                            size="small"
                                                            sx={{
                                                                mt: 0.5,
                                                                fontWeight: 700,
                                                                fontSize: '0.65rem',
                                                                height: 22,
                                                                bgcolor: 'rgba(16,185,129,0.15)',
                                                                color: '#10B981',
                                                                border: '1px solid rgba(16,185,129,0.3)',
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                        ) : isOpen ? (
                                            <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                                                No bid placed yet
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                                                —
                                            </Typography>
                                        )}

                                        {isOpen && !myBid && (
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={() => handleOpenBid(req)}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    px: 2.5,
                                                    background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
                                                    boxShadow: '0 2px 8px rgba(108,99,255,0.3)',
                                                    '&:hover': {
                                                        background: 'linear-gradient(135deg, #5B54E6 0%, #7C4FE0 100%)',
                                                    },
                                                }}
                                            >
                                                Submit Bid
                                            </Button>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            )}

            {/* Submit Bid Dialog */}
            <Dialog
                open={bidDialogOpen}
                onClose={() => setBidDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: '#1A2235',
                        borderRadius: 3,
                        width: '100%',
                        maxWidth: 400,
                        border: '1px solid rgba(108,99,255,0.15)',
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>
                    Submit Your Bid
                    {selectedRequest && (
                        <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5, fontWeight: 400 }}>
                            For: {selectedRequest.part_name} — {selectedRequest.tv_brand} {selectedRequest.tv_size ? `${selectedRequest.tv_size}"` : ''}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            label="Your Price (₹)"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={bidPrice}
                            onChange={(e) => setBidPrice(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                            }}
                            sx={{ mb: 3 }}
                        />
                        <TextField
                            label="Notes (Optional)"
                            multiline
                            rows={3}
                            fullWidth
                            variant="outlined"
                            placeholder="e.g. Next day delivery, original part, 3 months warranty"
                            value={bidNotes}
                            onChange={(e) => setBidNotes(e.target.value)}
                        />

                        {/* Image Upload Area for Dealer */}
                        <Box sx={{ mt: 3 }}>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<PhotoCamera />}
                                fullWidth
                                sx={{ borderRadius: 2, color: '#94A3B8', borderColor: 'rgba(255,255,255,0.2)' }}
                            >
                                Attach Part Photos
                                <input
                                    type="file"
                                    hidden
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                            </Button>
                            
                            {selectedFiles.length > 0 && (
                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {selectedFiles.map((file, i) => (
                                        <Box key={i} sx={{ position: 'relative', width: 60, height: 60, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                                            <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <IconButton 
                                                size="small" 
                                                onClick={() => removeFile(i)}
                                                sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.6)', p: 0.2, '&:hover': { bgcolor: 'rgba(239,68,68,0.8)' } }}
                                            >
                                                <Delete sx={{ fontSize: 14, color: '#FFF' }} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setBidDialogOpen(false)} sx={{ color: 'text.secondary', textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={submitBid}
                        disabled={!bidPrice || submittingBid}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 2,
                            px: 3,
                            background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
                        }}
                    >
                        {submittingBid ? 'Submitting...' : 'Submit Bid'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Fullscreen Swipeable Image Gallery */}
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

export default DealerDashboardPage;

