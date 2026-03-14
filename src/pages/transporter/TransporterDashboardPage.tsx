import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, CircularProgress, Chip, Button,
    Grid, Avatar, Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import {
    LocalShipping, CheckCircle, DirectionsOutlined, MyLocation,
    Place, Phone, Assignment, Navigation,
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { TransportJob, TRANSPORT_JOB_STATUS_LABELS, TRANSPORT_JOB_STATUS_COLORS } from '../../types/database';
import { formatRelative } from '../../utils/formatters';
import LiveTrackingMap from '../../components/LiveTrackingMap';

const TransporterDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<TransportJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [transporterId, setTransporterId] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<TransportJob | null>(null);
    const [watchId, setWatchId] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            // Get transporter profile
            const { data: tData } = await supabase
                .from('transporters')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (tData) {
                setTransporterId(tData.id);
                // Get jobs
                const { data: jobsData } = await supabase
                    .from('transport_jobs')
                    .select('*')
                    .eq('transporter_id', tData.id)
                    .order('created_at', { ascending: false });

                if (jobsData) setJobs(jobsData);
            }
            setLoading(false);
        };
        fetchData();
    }, [user]);

    // Real-time subscription
    useEffect(() => {
        if (!transporterId) return;
        const channel = supabase
            .channel('transporter-jobs')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transport_jobs',
                filter: `transporter_id=eq.${transporterId}`,
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setJobs(prev => [payload.new as TransportJob, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setJobs(prev => prev.map(j => j.id === (payload.new as TransportJob).id ? payload.new as TransportJob : j));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [transporterId]);

    const updateJobStatus = async (jobId: string, newStatus: string, extraFields: Record<string, any> = {}) => {
        const { error } = await supabase
            .from('transport_jobs')
            .update({ status: newStatus, ...extraFields })
            .eq('id', jobId);

        if (!error) {
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus as any, ...extraFields } : j));
        }
    };

    const startLiveTracking = (jobId: string) => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported');
            return;
        }

        const id = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await supabase
                    .from('transport_jobs')
                    .update({
                        live_lat: latitude,
                        live_lng: longitude,
                        live_updated_at: new Date().toISOString(),
                    })
                    .eq('id', jobId);
            },
            (err) => console.error('Geolocation error:', err),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        setWatchId(id);
    };

    const stopLiveTracking = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
        }
    };

    const openInGoogleMaps = (lat?: number | null, lng?: number | null, address?: string) => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        } else if (address) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
        }
    };

    const activeJobs = jobs.filter(j => !['DELIVERED', 'CANCELLED'].includes(j.status));
    const completedJobs = jobs.filter(j => j.status === 'DELIVERED');

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress sx={{ color: '#F59E0B' }} />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" fontWeight={800} sx={{
                background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
                backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px', mb: 0.5,
            }}>
                My Deliveries
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage your assigned transport jobs
            </Typography>

            {/* Summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6 }}>
                    <Card sx={{ background: 'rgba(26, 34, 53, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(148,163,184,0.1)' }}>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#F59E0B' }}>{activeJobs.length}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Active Jobs</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6 }}>
                    <Card sx={{ background: 'rgba(26, 34, 53, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(148,163,184,0.1)' }}>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>{completedJobs.length}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Completed</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Job Cards */}
            {activeJobs.length > 0 && (
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#E2E8F0', mb: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Active Jobs
                </Typography>
            )}

            {activeJobs.map(job => (
                <Card key={job.id} sx={{
                    mb: 2, background: 'rgba(26, 34, 53, 0.7)', backdropFilter: 'blur(10px)',
                    border: `1px solid ${TRANSPORT_JOB_STATUS_COLORS[job.status]}25`,
                    transition: 'all 0.3s',
                }}>
                    <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Chip
                                label={TRANSPORT_JOB_STATUS_LABELS[job.status]}
                                size="small"
                                sx={{
                                    bgcolor: `${TRANSPORT_JOB_STATUS_COLORS[job.status]}15`,
                                    color: TRANSPORT_JOB_STATUS_COLORS[job.status],
                                    fontWeight: 700, border: `1px solid ${TRANSPORT_JOB_STATUS_COLORS[job.status]}30`,
                                }}
                            />
                            <Typography variant="caption" color="text.secondary">{formatRelative(job.assigned_at)}</Typography>
                        </Box>

                        {/* Pickup */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
                            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(245,158,11,0.12)' }}>
                                <Place sx={{ fontSize: 18, color: '#F59E0B' }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>PICKUP</Typography>
                                <Typography variant="body2" sx={{ color: '#E2E8F0', fontWeight: 500 }}>{job.pickup_address}</Typography>
                                {job.pickup_contact_name && (
                                    <Typography variant="caption" color="text.secondary">
                                        {job.pickup_contact_name} {job.pickup_contact_mobile && `• ${job.pickup_contact_mobile}`}
                                    </Typography>
                                )}
                            </Box>
                            <Button size="small" variant="outlined"
                                onClick={() => openInGoogleMaps(job.pickup_lat, job.pickup_lng, job.pickup_address)}
                                sx={{ minWidth: 36, p: 0.5, borderColor: 'rgba(245,158,11,0.3)', color: '#F59E0B' }}>
                                <Navigation sx={{ fontSize: 18 }} />
                            </Button>
                        </Box>

                        {/* Drop */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-start' }}>
                            <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'rgba(16,185,129,0.12)' }}>
                                <Place sx={{ fontSize: 18, color: '#10B981' }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>DROP</Typography>
                                <Typography variant="body2" sx={{ color: '#E2E8F0', fontWeight: 500 }}>{job.drop_address}</Typography>
                            </Box>
                            <Button size="small" variant="outlined"
                                onClick={() => openInGoogleMaps(job.drop_lat, job.drop_lng, job.drop_address)}
                                sx={{ minWidth: 36, p: 0.5, borderColor: 'rgba(16,185,129,0.3)', color: '#10B981' }}>
                                <Navigation sx={{ fontSize: 18 }} />
                            </Button>
                        </Box>

                        {job.item_description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                📦 {job.item_description}
                            </Typography>
                        )}

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {job.status === 'ASSIGNED' && (
                                <Button fullWidth variant="contained" size="small"
                                    onClick={() => updateJobStatus(job.id, 'ACCEPTED', { accepted_at: new Date().toISOString() })}
                                    sx={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', fontWeight: 700, textTransform: 'none' }}>
                                    Accept Job
                                </Button>
                            )}
                            {job.status === 'ACCEPTED' && (
                                <Button fullWidth variant="contained" size="small"
                                    onClick={() => {
                                        updateJobStatus(job.id, 'PICKED_UP', { picked_up_at: new Date().toISOString() });
                                    }}
                                    sx={{ background: 'linear-gradient(135deg, #00D9FF, #0891B2)', fontWeight: 700, textTransform: 'none' }}>
                                    Mark Picked Up
                                </Button>
                            )}
                            {job.status === 'PICKED_UP' && (
                                <Button fullWidth variant="contained" size="small"
                                    onClick={() => {
                                        updateJobStatus(job.id, 'IN_TRANSIT', { started_at: new Date().toISOString() });
                                        startLiveTracking(job.id);
                                    }}
                                    sx={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', fontWeight: 700, textTransform: 'none' }}>
                                    🚀 Start Transport
                                </Button>
                            )}
                            {job.status === 'IN_TRANSIT' && (
                                <Button fullWidth variant="contained" size="small"
                                    onClick={() => {
                                        updateJobStatus(job.id, 'DELIVERED', { completed_at: new Date().toISOString() });
                                        stopLiveTracking();
                                    }}
                                    sx={{ background: 'linear-gradient(135deg, #10B981, #059669)', fontWeight: 700, textTransform: 'none' }}>
                                    ✅ Mark Delivered
                                </Button>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            ))}

            {activeJobs.length === 0 && (
                <Card sx={{ background: 'rgba(26, 34, 53, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(148,163,184,0.1)' }}>
                    <CardContent sx={{ py: 6, textAlign: 'center' }}>
                        <LocalShipping sx={{ fontSize: 48, color: '#F59E0B', opacity: 0.4, mb: 1 }} />
                        <Typography variant="h6" fontWeight={700} sx={{ color: '#E2E8F0' }}>No Active Jobs</Typography>
                        <Typography color="text.secondary">You'll see your assigned deliveries here</Typography>
                    </CardContent>
                </Card>
            )}

            {/* Completed section */}
            {completedJobs.length > 0 && (
                <>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#E2E8F0', mb: 2, mt: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Completed ({completedJobs.length})
                    </Typography>
                    {completedJobs.slice(0, 5).map(job => (
                        <Card key={job.id} sx={{
                            mb: 1.5, background: 'rgba(26, 34, 53, 0.5)', border: '1px solid rgba(148,163,184,0.06)',
                        }}>
                            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <CheckCircle sx={{ color: '#10B981', fontSize: 20 }} />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#CBD5E1' }} noWrap>
                                        {job.pickup_address} → {job.drop_address}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">{formatRelative(job.completed_at || job.created_at)}</Typography>
                            </CardContent>
                        </Card>
                    ))}
                </>
            )}
        </Box>
    );
};

export default TransporterDashboardPage;
