import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Button,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Chip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CardMedia, Switch, FormControlLabel, Checkbox, FormGroup
} from '@mui/material';
import { Add, PhotoCamera, Delete, LocalShipping, DirectionsCar, TwoWheeler, Map } from '@mui/icons-material';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { supabase } from '../../supabaseClient';
import { PartRequest, PartBid, Dealer } from '../../types/database';
import { formatDateTime } from '../../utils/formatters';

// Dark Store (JamesTronic) fixed address
const DARK_STORE_ADDRESS = 'Jamestronic TV Repair & Installation, Main Road, Laxman Nagar, Friends Colony, Gulshan Colony, Qutub Shahi Tombs, Manikonda, Hyderabad, Telangana 500008';

const PartRequestsPage: React.FC = () => {
    const [requests, setRequests] = useState<PartRequest[]>([]);
    const [loading, setLoading] = useState(true);

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

    // Review & Broadcast state
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [reviewRequest, setReviewRequest] = useState<PartRequest | null>(null);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    const fetchRequests = async () => {
        const { data } = await supabase
            .from('part_requests')
            .select('*, bids:part_bids(*, dealer:dealers(*))')
            .order('created_at', { ascending: false });
        
        if (data) setRequests(data as PartRequest[]);
        setLoading(false);
    };

    const fetchDealers = async () => {
        const { data } = await supabase.from('dealers').select('*').eq('status', 'ACTIVE').order('name');
        if (data) setAllDealers(data as Dealer[]);
    };

    useEffect(() => {
        fetchRequests();
        fetchDealers();

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

        // Upload images if any
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
            // Trigger push notifications to dealers
            supabase.functions.invoke('send-push-notification', {
                body: {
                    request_id: insertedData.id,
                    part_name: formData.part_name,
                    tv_brand: formData.tv_brand,
                    target_dealer_ids: broadcastAll ? null : selectedDealerIds
                }
            }).then(res => {
                console.log('Push response:', res.data);
                alert(`Push Response: Sent=${res.data?.sent}, Failed=${res.data?.failed}, Errors=${JSON.stringify(res.data?.errors)}`);
            }).catch(err => {
                console.error('Push notification error:', err);
                alert(`Push API Error: ${err.message}`);
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
        
        // Update the request
        const { error } = await supabase.from('part_requests').update({
            status: 'OPEN',
            target_dealer_ids: broadcastAll ? null : selectedDealerIds
        }).eq('id', reviewRequest.id);

        if (!error) {
            // Trigger push notifications
            supabase.functions.invoke('send-push-notification', {
                body: {
                    request_id: reviewRequest.id,
                    part_name: reviewRequest.part_name,
                    tv_brand: reviewRequest.tv_brand,
                    target_dealer_ids: broadcastAll ? null : selectedDealerIds
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

    const openTransportDialog = (dealerAddress: string) => {
        setTransportDealerAddress(dealerAddress || 'Hyderabad, Telangana');
        setTransportDialogOpen(true);
    };

    const getGoogleMapsUrl = () => {
        const pickup = encodeURIComponent(transportDealerAddress);
        const drop = encodeURIComponent(DARK_STORE_ADDRESS);
        return `https://www.google.com/maps/dir/?api=1&origin=${pickup}&destination=${drop}&travelmode=driving`;
    };

    const getRapidoUrl = () => {
        // Rapido deep link - opens the app, user picks from there
        return `https://www.rapido.bike`;
    };

    const getPorterUrl = () => {
        // Porter deep link - opens the app/web, user books from there
        return `https://porter.in`;
    };

    const ImageThumbnail = ({ urls, index }: { urls: string[], index: number }) => (
        <Card 
            sx={{ width: 60, height: 60, cursor: 'pointer', flexShrink: 0, borderRadius: 2, mr: 1, border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setViewImages({ urls, index })}
        >
            <CardMedia component="img" image={urls[index]} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Card>
    );

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">Part Requests / Procurement</Typography>
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ borderRadius: 2, px: 3, py: 1 }}
                >
                    Broadcast New Request
                </Button>
            </Box>

            <Grid container spacing={3}>
                {requests.map(req => (
                    <Grid size={{ xs: 12 }} key={req.id}>
                        <Card sx={{ borderRadius: 3, bgcolor: '#1A2235' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold" sx={{ color: '#E2E8F0' }}>
                                            {req.part_name}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
                                            <strong>Requested On:</strong> {formatDateTime(req.created_at)} | <strong>TV:</strong> {req.tv_brand} {req.tv_size ? `${req.tv_size}"` : ''} {req.tv_model}
                                        </Typography>
                                    </Box>
                                    <Chip 
                                        label={req.status} 
                                        color={req.status === 'OPEN' ? 'warning' : req.status === 'APPROVED' ? 'success' : 'default'}
                                    />
                                </Box>
                                
                                {req.description && (
                                    <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, fontStyle: 'italic', bgcolor: 'rgba(255,255,255,0.03)', p: 1.5, borderRadius: 2 }}>
                                        Notes: {req.description}
                                    </Typography>
                                )}

                                {/* Admin Images */}
                                {req.image_urls && req.image_urls.length > 0 && (
                                    <Box sx={{ display: 'flex', overflowX: 'auto', mt: 2, pb: 1, gap: 1 }}>
                                        {req.image_urls.map((_, i) => <ImageThumbnail key={i} urls={req.image_urls!} index={i} />)}
                                    </Box>
                                )}

                                {req.status === 'PENDING_REVIEW' ? (
                                    <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(245,158,11,0.05)', borderRadius: 2, border: '1px solid rgba(245,158,11,0.2)' }}>
                                        <Typography variant="subtitle2" sx={{ color: '#F59E0B', mb: 1 }}>Action Required: Review Technician Request</Typography>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>This part was requested by a technician. Please review the details and images before broadcasting to the dealer network.</Typography>
                                        <Button 
                                            variant="contained" 
                                            color="warning" 
                                            onClick={() => {
                                                setReviewRequest(req);
                                                setBroadcastAll(true);
                                                setSelectedDealerIds([]);
                                                setReviewDialogOpen(true);
                                            }}
                                            sx={{ fontWeight: 'bold' }}
                                        >
                                            Review & Broadcast
                                        </Button>
                                    </Box>
                                ) : (
                                    <>
                                        <Typography variant="subtitle2" sx={{ color: '#E2E8F0', mb: 1, mt: 3, borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 1 }}>
                                            Dealer Bids ({req.bids?.length || 0})
                                        </Typography>
                                        
                                        {req.bids && req.bids.length > 0 ? (
                                            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', backgroundImage: 'none', boxShadow: 'none' }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.05)', pl: 0 }}>Dealer</TableCell>
                                                            <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Price</TableCell>
                                                            <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Photos</TableCell>
                                                            <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Notes</TableCell>
                                                            <TableCell align="right" sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.05)', pr: 0 }}>Action</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {req.bids.map(bid => (
                                                            <TableRow key={bid.id}>
                                                                <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)', pl: 0 }}>
                                                                    {bid.dealer?.name || 'Unknown Dealer'}
                                                                </TableCell>
                                                                <TableCell sx={{ color: '#10B981', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    ₹{bid.price}
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    {bid.image_urls && bid.image_urls.length > 0 ? (
                                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                            {bid.image_urls.map((url, i) => (
                                                                                <Box 
                                                                                    key={i} 
                                                                                    onClick={() => setViewImages({ urls: bid.image_urls!, index: i })}
                                                                                    sx={{ 
                                                                                        width: 40, height: 40, cursor: 'pointer', borderRadius: 1, 
                                                                                        backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                                                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                                                    }} 
                                                                                />
                                                                            ))}
                                                                        </Box>
                                                                    ) : (
                                                                        <Typography variant="caption" color="text.secondary">-</Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    {bid.notes || '-'}
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', pr: 0 }}>
                                                                    {bid.is_accepted ? (
                                                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                                            <Chip label="Accepted" color="success" size="small" />
                                                                            <Button
                                                                                variant="contained"
                                                                                size="small"
                                                                                startIcon={<LocalShipping />}
                                                                                onClick={() => openTransportDialog(bid.dealer?.address || '')}
                                                                                sx={{
                                                                                    borderRadius: 2,
                                                                                    textTransform: 'none',
                                                                                    fontSize: '0.75rem',
                                                                                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                                                                    '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' }
                                                                                }}
                                                                            >
                                                                                Book Transport
                                                                            </Button>
                                                                        </Box>
                                                                    ) : req.status === 'OPEN' ? (
                                                                        <Button 
                                                                            variant="outlined" 
                                                                            color="primary" 
                                                                            size="small"
                                                                            onClick={() => handleApproveBid(req, bid)}
                                                                            sx={{ borderRadius: 2 }}
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
                                        ) : (
                                            <Typography variant="body2" sx={{ color: '#64748B' }}>
                                                No bids received yet.
                                            </Typography>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Transport Booking Dialog */}
            <Dialog open={transportDialogOpen} onClose={() => setTransportDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3, width: '100%', maxWidth: 420 } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShipping sx={{ color: '#F59E0B' }} />
                        <Typography variant="h6" fontWeight="bold">Book Transport</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>PICKUP (Dealer)</Typography>
                                <Typography variant="body2" sx={{ color: '#E2E8F0', fontWeight: 600 }}>{transportDealerAddress}</Typography>
                            </Box>
                            <Button size="small" onClick={() => { navigator.clipboard.writeText(transportDealerAddress); }} sx={{ minWidth: 'auto', color: '#6C63FF', textTransform: 'none', fontSize: '0.7rem' }}>Copy</Button>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>DROP (Dark Store)</Typography>
                                <Typography variant="body2" sx={{ color: '#E2E8F0', fontWeight: 600 }}>{DARK_STORE_ADDRESS}</Typography>
                            </Box>
                            <Button size="small" onClick={() => { navigator.clipboard.writeText(DARK_STORE_ADDRESS); }} sx={{ minWidth: 'auto', color: '#6C63FF', textTransform: 'none', fontSize: '0.7rem' }}>Copy</Button>
                        </Box>
                    </Box>

                    <Typography variant="subtitle2" sx={{ color: '#94A3B8', mb: 2 }}>Choose a transport service:</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<TwoWheeler />}
                            onClick={() => {
                                navigator.clipboard.writeText(`Pickup: ${transportDealerAddress}\nDrop: ${DARK_STORE_ADDRESS}`);
                                window.open(getRapidoUrl(), '_blank');
                            }}
                            sx={{
                                justifyContent: 'flex-start',
                                borderRadius: 2,
                                py: 1.5,
                                color: '#FCD34D',
                                borderColor: 'rgba(252,211,77,0.3)',
                                '&:hover': { bgcolor: 'rgba(252,211,77,0.08)', borderColor: '#FCD34D' }
                            }}
                        >
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="body2" fontWeight="bold">Rapido</Typography>
                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>2-Wheeler • Addresses copied to clipboard</Typography>
                            </Box>
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<DirectionsCar />}
                            onClick={() => {
                                navigator.clipboard.writeText(`Pickup: ${transportDealerAddress}\nDrop: ${DARK_STORE_ADDRESS}`);
                                window.open(getPorterUrl(), '_blank');
                            }}
                            sx={{
                                justifyContent: 'flex-start',
                                borderRadius: 2,
                                py: 1.5,
                                color: '#60A5FA',
                                borderColor: 'rgba(96,165,250,0.3)',
                                '&:hover': { bgcolor: 'rgba(96,165,250,0.08)', borderColor: '#60A5FA' }
                            }}
                        >
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="body2" fontWeight="bold">Porter</Typography>
                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>4-Wheeler • Addresses copied to clipboard</Typography>
                            </Box>
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Map />}
                            onClick={() => window.open(getGoogleMapsUrl(), '_blank')}
                            sx={{
                                justifyContent: 'flex-start',
                                borderRadius: 2,
                                py: 1.5,
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
                            }}
                        >
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="body2" fontWeight="bold">Google Maps Directions</Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Route auto-filled • Share link with driver</Typography>
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
                            <TextField
                                label="Part Name (e.g. Backlight, Motherboard)"
                                required fullWidth variant="outlined"
                                value={formData.part_name}
                                onChange={e => setFormData({...formData, part_name: e.target.value})}
                            />
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        label="TV Brand"
                                        required fullWidth variant="outlined"
                                        value={formData.tv_brand}
                                        onChange={e => setFormData({...formData, tv_brand: e.target.value})}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        label="TV Size (inch)"
                                        type="number" fullWidth variant="outlined"
                                        value={formData.tv_size}
                                        onChange={e => setFormData({...formData, tv_size: e.target.value})}
                                    />
                                </Grid>
                            </Grid>
                            <TextField
                                label="TV Model Number (Optional)"
                                fullWidth variant="outlined"
                                value={formData.tv_model}
                                onChange={e => setFormData({...formData, tv_model: e.target.value})}
                            />
                            <TextField
                                label="Additional Notes/Description"
                                multiline rows={3} fullWidth variant="outlined"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />

                            {/* Image Upload Area */}
                            <Box sx={{ mt: 1 }}>
                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<PhotoCamera />}
                                    sx={{ borderRadius: 2, color: '#94A3B8', borderColor: 'rgba(255,255,255,0.2)' }}
                                >
                                    Attach Reference Photos
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
                            {/* Dealer Targeting Section */}
                            <Box sx={{ mt: 1, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={broadcastAll}
                                            onChange={(e) => {
                                                setBroadcastAll(e.target.checked);
                                                if (e.target.checked) setSelectedDealerIds([]);
                                            }}
                                            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6C63FF' } }}
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {broadcastAll ? '📡 Broadcast to All Dealers' : '🎯 Send to Selected Dealers'}
                                        </Typography>
                                    }
                                />
                                {!broadcastAll && (
                                    <FormGroup sx={{ mt: 1, pl: 1 }}>
                                        {allDealers.length === 0 ? (
                                            <Typography variant="caption" sx={{ color: '#64748B' }}>No active dealers found.</Typography>
                                        ) : (
                                            allDealers.map(d => (
                                                <FormControlLabel
                                                    key={d.id}
                                                    control={
                                                        <Checkbox
                                                            checked={selectedDealerIds.includes(d.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedDealerIds(prev => [...prev, d.id]);
                                                                } else {
                                                                    setSelectedDealerIds(prev => prev.filter(id => id !== d.id));
                                                                }
                                                            }}
                                                            sx={{ color: '#64748B', '&.Mui-checked': { color: '#6C63FF' } }}
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: '#64748B' }}>{d.contact_person} • {d.mobile}</Typography>
                                                        </Box>
                                                    }
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
                        <Button type="submit" variant="contained" disabled={submitting}>
                            {submitting ? 'Broadcasting...' : 'Broadcast to Dealers'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Review & Broadcast Dialog */}
            <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3 } }}>
                <DialogTitle>Broadcast Technician Request</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select the dealers you want to send this part request to.
                    </Typography>

                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={broadcastAll}
                                    onChange={(e) => {
                                        setBroadcastAll(e.target.checked);
                                        if (e.target.checked) setSelectedDealerIds([]);
                                    }}
                                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6C63FF' } }}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {broadcastAll ? '📡 Broadcast to All Dealers' : '🎯 Send to Selected Dealers'}
                                </Typography>
                            }
                        />
                        {!broadcastAll && (
                            <FormGroup sx={{ mt: 1, pl: 1, maxHeight: 200, overflowY: 'auto' }}>
                                {allDealers.length === 0 ? (
                                    <Typography variant="caption" sx={{ color: '#64748B' }}>No active dealers found.</Typography>
                                ) : (
                                    allDealers.map(d => (
                                        <FormControlLabel
                                            key={d.id}
                                            control={
                                                <Checkbox
                                                    checked={selectedDealerIds.includes(d.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedDealerIds(prev => [...prev, d.id]);
                                                        else setSelectedDealerIds(prev => prev.filter(id => id !== d.id));
                                                    }}
                                                    sx={{ color: '#64748B', '&.Mui-checked': { color: '#6C63FF' } }}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.name}</Typography>
                                                    <Typography variant="caption" sx={{ color: '#64748B' }}>{d.contact_person} • {d.mobile}</Typography>
                                                </Box>
                                            }
                                        />
                                    ))
                                )}
                            </FormGroup>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setReviewDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button onClick={handleReviewBroadcast} variant="contained" color="warning" disabled={reviewSubmitting}>
                        {reviewSubmitting ? 'Broadcasting...' : 'Broadcast to Dealers'}
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

export default PartRequestsPage;
