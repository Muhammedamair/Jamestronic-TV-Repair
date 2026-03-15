import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Card, CardContent, CircularProgress, Chip, Button,
    Grid, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Collapse, IconButton, LinearProgress,
} from '@mui/material';
import {
    LocalShipping, CheckCircle, MyLocation,
    Place, Navigation, Lock, VerifiedUser, NotificationsActive,
    ExpandMore, ExpandLess, TwoWheeler, DirectionsCar,
    AccessTime, Speed, Phone,
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { TransportJob, Transporter, TRANSPORT_JOB_STATUS_LABELS, TRANSPORT_JOB_STATUS_COLORS } from '../../types/database';
import { formatRelative } from '../../utils/formatters';

import { subscribeToPush, isPushSubscribed, syncPushSubscription } from '../../utils/pushSubscription';

// Calculate distance between two lat/lng points in meters (Haversine)
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
    'Bike': <TwoWheeler sx={{ fontSize: 18 }} />,
    'Auto': <DirectionsCar sx={{ fontSize: 18 }} />,
    'Mini Truck': <LocalShipping sx={{ fontSize: 18 }} />,
    'Truck': <LocalShipping sx={{ fontSize: 18 }} />,
};

// Step progress for a job
const JOB_STEPS = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'] as const;
const STEP_LABELS = ['Assigned', 'Accepted', 'Picked Up', 'In Transit', 'Delivered'];

const StepProgress: React.FC<{ currentStatus: string }> = ({ currentStatus }) => {
    const currentIndex = JOB_STEPS.indexOf(currentStatus as any);
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mb: 2, px: 0.5 }}>
            {JOB_STEPS.map((step, i) => {
                const isCompleted = i <= currentIndex;
                const isActive = i === currentIndex;
                const color = isCompleted ? '#10B981' : 'rgba(148,163,184,0.3)';
                return (
                    <React.Fragment key={step}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 0 }}>
                            <Box sx={{
                                width: isActive ? 14 : 10, height: isActive ? 14 : 10,
                                borderRadius: '50%', bgcolor: color,
                                border: isActive ? '2px solid #10B981' : 'none',
                                boxShadow: isActive ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
                                transition: 'all 0.3s',
                            }} />
                            <Typography variant="caption" sx={{
                                fontSize: '0.55rem', color: isCompleted ? '#94A3B8' : 'rgba(148,163,184,0.4)',
                                mt: 0.3, whiteSpace: 'nowrap', fontWeight: isActive ? 700 : 400,
                            }}>
                                {STEP_LABELS[i]}
                            </Typography>
                        </Box>
                        {i < JOB_STEPS.length - 1 && (
                            <Box sx={{
                                flex: 1, height: 2, mx: 0.3,
                                bgcolor: i < currentIndex ? '#10B981' : 'rgba(148,163,184,0.15)',
                                borderRadius: 1, mt: -1.2,
                                transition: 'all 0.3s',
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </Box>
    );
};

const TransporterDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<TransportJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [transporterId, setTransporterId] = useState<string | null>(null);
    const [transporter, setTransporter] = useState<Transporter | null>(null);
    const [vehicleType, setVehicleType] = useState<string>('Bike');
    const [watchId, setWatchId] = useState<number | null>(null);
    const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

    // Push notification
    const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

    // OTP dialog
    const [otpDialogOpen, setOtpDialogOpen] = useState(false);
    const [otpJobId, setOtpJobId] = useState<string | null>(null);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    // Proximity tracking
    const proximityNotifiedRef = useRef<Set<string>>(new Set());

    const playNotificationSound = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            setTimeout(() => { oscillator.stop(); }, 400);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    };

    // Check push subscription
    useEffect(() => {
        isPushSubscribed().then(isSub => {
            setPushEnabled(isSub);
            if (isSub) syncPushSubscription();
        });
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            const { data: tData } = await supabase
                .from('transporters')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (tData) {
                setTransporterId(tData.id);
                setTransporter(tData as Transporter);
                setVehicleType(tData.vehicle_type || 'Bike');
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
                    playNotificationSound();
                } else if (payload.eventType === 'UPDATE') {
                    setJobs(prev => prev.map(j => j.id === (payload.new as TransportJob).id ? payload.new as TransportJob : j));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [transporterId]);

    // Sync PWA App Icon Badge for Transporter
    useEffect(() => {
        if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
            const activeCount = jobs.filter(j => !['DELIVERED', 'CANCELLED'].includes(j.status)).length;
            if (activeCount > 0) {
                (navigator as any).setAppBadge(activeCount).catch(console.error);
            } else {
                (navigator as any).clearAppBadge().catch(console.error);
            }
        }
    }, [jobs]);

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
        if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
        setTrackingJobId(jobId);
        const id = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await supabase
                    .from('transport_jobs')
                    .update({ live_lat: latitude, live_lng: longitude, live_updated_at: new Date().toISOString() })
                    .eq('id', jobId);

                const job = jobs.find(j => j.id === jobId);
                if (job && job.pickup_lat && job.pickup_lng && !job.proximity_notified && !proximityNotifiedRef.current.has(jobId)) {
                    const dist = haversineDistance(latitude, longitude, job.pickup_lat, job.pickup_lng);
                    if (dist <= 500) {
                        proximityNotifiedRef.current.add(jobId);
                        await supabase.from('transport_jobs').update({ proximity_notified: true }).eq('id', jobId);
                        if (Notification.permission === 'granted') {
                            new Notification('📍 Near Pickup!', {
                                body: `${Math.round(dist)}m away. Prepare for pickup.`,
                                icon: '/icons/icon-192x192.png',
                            });
                        }
                        playNotificationSound();
                    }
                }
            },
            (err) => console.error('Geolocation error:', err),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
        setWatchId(id);
    };

    const stopLiveTracking = () => {
        if (watchId !== null) { navigator.geolocation.clearWatch(watchId); setWatchId(null); }
        setTrackingJobId(null);
    };

    const openInGoogleMaps = (lat?: number | null, lng?: number | null, address?: string) => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        } else if (address) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
        }
    };

    // OTP Verification
    const handleOtpVerify = async () => {
        if (!otpJobId) return;
        setVerifyingOtp(true);
        setOtpError('');

        const { data: freshJob } = await supabase
            .from('transport_jobs')
            .select('pickup_otp')
            .eq('id', otpJobId)
            .single();

        if (!freshJob?.pickup_otp) {
            setOtpError('No OTP found. Contact admin.');
            setVerifyingOtp(false);
            return;
        }

        if (otpInput.trim() !== freshJob.pickup_otp) {
            setOtpError('❌ Incorrect OTP. Ask dealer for the code.');
            setVerifyingOtp(false);
            return;
        }

        await updateJobStatus(otpJobId, 'PICKED_UP', {
            picked_up_at: new Date().toISOString(),
            otp_verified: true,
        });
        setOtpDialogOpen(false);
        setOtpInput('');
        setOtpJobId(null);
        setVerifyingOtp(false);
    };

    const activeJobs = jobs.filter(j => !['DELIVERED', 'CANCELLED'].includes(j.status));
    const completedJobs = jobs.filter(j => j.status === 'DELIVERED');
    const inTransitCount = jobs.filter(j => j.status === 'IN_TRANSIT').length;
    const trackedJob = trackingJobId ? jobs.find(j => j.id === trackingJobId) : null;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 15 }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress sx={{ color: '#F59E0B', mb: 2 }} size={36} />
                    <Typography variant="body2" color="text.secondary">Loading your deliveries...</Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 4 }}>
            {/* Push Notification Banner */}
            {pushEnabled === false && (
                <Box sx={{
                    mb: 2, p: 2, borderRadius: 3,
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.08) 100%)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    display: 'flex', alignItems: 'center', gap: 2,
                }}>
                    <NotificationsActive sx={{ color: '#F59E0B', fontSize: 28 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#F59E0B' }}>Enable Notifications</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>Get alerted for new job assignments</Typography>
                    </Box>
                    <Button
                        variant="contained" size="small"
                        onClick={async () => {
                            const result = await subscribeToPush();
                            setPushEnabled(result);
                        }}
                        sx={{
                            borderRadius: 2, textTransform: 'none', px: 2,
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' }
                        }}
                    >
                        Enable
                    </Button>
                </Box>
            )}

            {/* Profile Header */}
            <Card sx={{
                mb: 2.5, overflow: 'visible',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(16,185,129,0.06) 100%)',
                border: '1px solid rgba(245,158,11,0.15)', borderRadius: 3,
            }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{
                            width: 48, height: 48,
                            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                            fontWeight: 800, fontSize: '1.1rem',
                        }}>
                            {transporter?.name?.charAt(0)?.toUpperCase() || 'T'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: '#F1F5F9' }}>
                                {transporter?.name || 'Transporter'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                <Chip
                                    icon={VEHICLE_ICONS[vehicleType] as any}
                                    label={`${vehicleType}${transporter?.vehicle_number ? ` • ${transporter.vehicle_number}` : ''}`}
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(245,158,11,0.12)', color: '#F59E0B',
                                        fontWeight: 600, fontSize: '0.65rem', height: 22,
                                        '& .MuiChip-icon': { color: '#F59E0B' },
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>

                    {/* Stats Row */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Box sx={{ flex: 1, textAlign: 'center', py: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.08)' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}>{activeJobs.length}</Typography>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.6rem' }}>Active</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', py: 1, borderRadius: 2, bgcolor: 'rgba(59,130,246,0.08)' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#3B82F6', lineHeight: 1 }}>{inTransitCount}</Typography>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.6rem' }}>In Transit</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center', py: 1, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#10B981', lineHeight: 1 }}>{completedJobs.length}</Typography>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.6rem' }}>Delivered</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* GPS Active Indicator (no map - transporter uses Google Maps for navigation) */}
            {trackingJobId && (
                <Box sx={{
                    mb: 2, px: 2, py: 1.2, borderRadius: 3,
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    display: 'flex', alignItems: 'center', gap: 1.5,
                }}>
                    <MyLocation sx={{ color: '#3B82F6', fontSize: 18, animation: 'pulse 2s infinite' }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#E2E8F0', fontSize: '0.8rem' }}>
                            GPS Tracking Active
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.6rem' }}>
                            Your location is being shared with admin
                        </Typography>
                    </Box>
                    <Chip label="LIVE" size="small" sx={{
                        bgcolor: 'rgba(239,68,68,0.15)', color: '#EF4444',
                        fontWeight: 700, fontSize: '0.55rem', height: 20,
                        animation: 'pulse 2s infinite',
                    }} />
                </Box>
            )}

            {/* Active Jobs */}
            {activeJobs.length > 0 ? (
                <>
                    <Typography variant="caption" fontWeight={700} sx={{
                        color: '#94A3B8', mb: 1.5, display: 'block',
                        textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem',
                    }}>
                        Active Jobs ({activeJobs.length})
                    </Typography>

                    {activeJobs.map(job => {
                        const isExpanded = expandedJobId === job.id;
                        return (
                            <Card key={job.id} sx={{
                                mb: 1.5, borderRadius: 3,
                                background: 'rgba(26, 34, 53, 0.8)',
                                backdropFilter: 'blur(12px)',
                                border: `1px solid ${TRANSPORT_JOB_STATUS_COLORS[job.status]}20`,
                                transition: 'all 0.3s ease',
                                '&:active': { transform: 'scale(0.99)' },
                            }}>
                                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                    {/* Step Progress */}
                                    <StepProgress currentStatus={job.status} />

                                    {/* Status + Time Header */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                            <Chip
                                                label={TRANSPORT_JOB_STATUS_LABELS[job.status]}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${TRANSPORT_JOB_STATUS_COLORS[job.status]}15`,
                                                    color: TRANSPORT_JOB_STATUS_COLORS[job.status],
                                                    fontWeight: 700, fontSize: '0.65rem', height: 24,
                                                    border: `1px solid ${TRANSPORT_JOB_STATUS_COLORS[job.status]}30`,
                                                }}
                                            />
                                            {job.otp_verified && (
                                                <Chip icon={<VerifiedUser sx={{ fontSize: 12 }} />} label="Verified" size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(16,185,129,0.1)', color: '#10B981',
                                                        fontWeight: 600, fontSize: '0.6rem', height: 22,
                                                        border: '1px solid rgba(16,185,129,0.2)', '& .MuiChip-icon': { color: '#10B981' },
                                                    }} />
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <AccessTime sx={{ fontSize: 12, color: '#64748B' }} />
                                            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.6rem' }}>
                                                {formatRelative(job.assigned_at)}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Pickup */}
                                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1, alignItems: 'flex-start' }}>
                                        <Box sx={{
                                            width: 32, height: 32, borderRadius: 2,
                                            bgcolor: 'rgba(245,158,11,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <Place sx={{ fontSize: 16, color: '#F59E0B' }} />
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Pickup
                                            </Typography>
                                            <Typography variant="body2" sx={{
                                                color: '#E2E8F0', fontWeight: 500, fontSize: '0.8rem', lineHeight: 1.3,
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                                display: '-webkit-box', WebkitLineClamp: isExpanded ? 10 : 2, WebkitBoxOrient: 'vertical',
                                            }}>
                                                {job.pickup_address}
                                            </Typography>
                                            {job.pickup_contact_name && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>
                                                        {job.pickup_contact_name}
                                                    </Typography>
                                                    {job.pickup_contact_mobile && (
                                                        <IconButton size="small" onClick={() => window.open(`tel:${job.pickup_contact_mobile}`)}
                                                            sx={{ p: 0.2, color: '#10B981' }}>
                                                            <Phone sx={{ fontSize: 13 }} />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                        <IconButton size="small"
                                            onClick={() => openInGoogleMaps(job.pickup_lat, job.pickup_lng, job.pickup_address)}
                                            sx={{
                                                width: 32, height: 32, borderRadius: 2,
                                                border: '1px solid rgba(245,158,11,0.2)',
                                                color: '#F59E0B', flexShrink: 0,
                                            }}>
                                            <Navigation sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Box>

                                    {/* Drop */}
                                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
                                        <Box sx={{
                                            width: 32, height: 32, borderRadius: 2,
                                            bgcolor: 'rgba(16,185,129,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <Place sx={{ fontSize: 16, color: '#10B981' }} />
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Drop-off
                                            </Typography>
                                            <Typography variant="body2" sx={{
                                                color: '#E2E8F0', fontWeight: 500, fontSize: '0.8rem', lineHeight: 1.3,
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                                display: '-webkit-box', WebkitLineClamp: isExpanded ? 10 : 2, WebkitBoxOrient: 'vertical',
                                            }}>
                                                {job.drop_address}
                                            </Typography>
                                        </Box>
                                        <IconButton size="small"
                                            onClick={() => openInGoogleMaps(job.drop_lat, job.drop_lng, job.drop_address)}
                                            sx={{
                                                width: 32, height: 32, borderRadius: 2,
                                                border: '1px solid rgba(16,185,129,0.2)',
                                                color: '#10B981', flexShrink: 0,
                                            }}>
                                            <Navigation sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Box>

                                    {/* Expand toggle for item description */}
                                    {job.item_description && (
                                        <Button size="small" fullWidth
                                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                                            endIcon={isExpanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
                                            sx={{
                                                color: '#64748B', textTransform: 'none', fontSize: '0.7rem',
                                                justifyContent: 'flex-start', mb: 1, py: 0.3,
                                            }}>
                                            📦 {isExpanded ? job.item_description : `${job.item_description.substring(0, 30)}...`}
                                        </Button>
                                    )}

                                    {/* Action Button */}
                                    {job.status === 'ASSIGNED' && (
                                        <Button fullWidth variant="contained"
                                            onClick={() => {
                                                updateJobStatus(job.id, 'ACCEPTED', { accepted_at: new Date().toISOString() });
                                                startLiveTracking(job.id);
                                            }}
                                            sx={{
                                                height: 48, borderRadius: 3, fontWeight: 800, fontSize: '0.9rem',
                                                textTransform: 'none', letterSpacing: '-0.01em',
                                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                                boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                                                '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' },
                                                '&:active': { transform: 'scale(0.98)' },
                                            }}>
                                            ✋ Accept Job
                                        </Button>
                                    )}
                                    {job.status === 'ACCEPTED' && (
                                        <Button fullWidth variant="contained"
                                            startIcon={<Lock sx={{ fontSize: 18 }} />}
                                            onClick={() => {
                                                setOtpJobId(job.id);
                                                setOtpInput('');
                                                setOtpError('');
                                                setOtpDialogOpen(true);
                                            }}
                                            sx={{
                                                height: 48, borderRadius: 3, fontWeight: 800, fontSize: '0.9rem',
                                                textTransform: 'none',
                                                background: 'linear-gradient(135deg, #00D9FF 0%, #0891B2 100%)',
                                                boxShadow: '0 4px 15px rgba(0,217,255,0.25)',
                                                '&:hover': { background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)' },
                                                '&:active': { transform: 'scale(0.98)' },
                                            }}>
                                            Enter OTP & Pickup
                                        </Button>
                                    )}
                                    {job.status === 'PICKED_UP' && (
                                        <Button fullWidth variant="contained"
                                            onClick={() => {
                                                updateJobStatus(job.id, 'IN_TRANSIT', { started_at: new Date().toISOString() });
                                                startLiveTracking(job.id);
                                            }}
                                            sx={{
                                                height: 48, borderRadius: 3, fontWeight: 800, fontSize: '0.9rem',
                                                textTransform: 'none',
                                                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                                boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
                                                '&:hover': { background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' },
                                                '&:active': { transform: 'scale(0.98)' },
                                            }}>
                                            🚀 Start Transport
                                        </Button>
                                    )}
                                    {job.status === 'IN_TRANSIT' && (
                                        <Button fullWidth variant="contained"
                                            onClick={async () => {
                                                updateJobStatus(job.id, 'DELIVERED', { completed_at: new Date().toISOString() });
                                                stopLiveTracking();

                                                // Notify the Technician that their requested part has arrived
                                                try {
                                                    if (job.part_request_id) {
                                                        // Update part_request status to RECEIVED
                                                        await supabase.from('part_requests').update({ status: 'RECEIVED' }).eq('id', job.part_request_id);

                                                        // Find the ticket linked to this part request
                                                        const { data: pr } = await supabase.from('part_requests').select('ticket_id, part_name').eq('id', job.part_request_id).single();
                                                        if (pr?.ticket_id) {
                                                            // Find the assigned technician on this ticket
                                                            const { data: ticket } = await supabase.from('tickets').select('assigned_technician_id, ticket_number').eq('id', pr.ticket_id).single();
                                                            if (ticket?.assigned_technician_id) {
                                                                const { data: tech } = await supabase.from('technicians').select('user_id, name').eq('id', ticket.assigned_technician_id).single();
                                                                if (tech?.user_id) {
                                                                    await supabase.functions.invoke('send-push-notification', {
                                                                        body: {
                                                                            title: '📦 Your Part Has Arrived!',
                                                                            body: `${pr.part_name || 'Your requested part'} for Ticket #${ticket.ticket_number || ''} is now at the service centre. Collect it and complete the repair!`,
                                                                            url: '/tech',
                                                                            target_user_ids: [tech.user_id]
                                                                        }
                                                                    });
                                                                    console.log(`✅ Push sent to Tech ${tech.name} for part delivery`);
                                                                }
                                                            }
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.error('Failed to notify technician about part delivery:', err);
                                                }
                                            }}
                                            sx={{
                                                height: 48, borderRadius: 3, fontWeight: 800, fontSize: '0.9rem',
                                                textTransform: 'none',
                                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                                boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                                                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
                                                '&:active': { transform: 'scale(0.98)' },
                                            }}>
                                            ✅ Mark Delivered
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </>
            ) : (
                <Card sx={{
                    borderRadius: 3,
                    background: 'rgba(26, 34, 53, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(148,163,184,0.08)',
                }}>
                    <CardContent sx={{ py: 5, textAlign: 'center' }}>
                        <Box sx={{
                            width: 64, height: 64, borderRadius: 3, mx: 'auto', mb: 2,
                            bgcolor: 'rgba(245,158,11,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <LocalShipping sx={{ fontSize: 32, color: '#F59E0B', opacity: 0.6 }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#E2E8F0', mb: 0.5 }}>
                            No Active Jobs
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8rem' }}>
                            New assignments will appear here instantly
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {/* Completed Jobs */}
            {completedJobs.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="caption" fontWeight={700} sx={{
                        color: '#94A3B8', mb: 1.5, display: 'block',
                        textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem',
                    }}>
                        Completed ({completedJobs.length})
                    </Typography>
                    {completedJobs.slice(0, 10).map(job => (
                        <Card key={job.id} sx={{
                            mb: 1, borderRadius: 2.5,
                            background: 'rgba(26, 34, 53, 0.4)',
                            border: '1px solid rgba(148,163,184,0.05)',
                        }}>
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{
                                    width: 32, height: 32, borderRadius: 2,
                                    bgcolor: 'rgba(16,185,129,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <CheckCircle sx={{ color: '#10B981', fontSize: 16 }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ color: '#CBD5E1', fontSize: '0.75rem', lineHeight: 1.3 }} noWrap>
                                        {job.pickup_address}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.6rem' }}>
                                        {formatRelative(job.completed_at || job.created_at)}
                                    </Typography>
                                </Box>
                                {job.otp_verified && (
                                    <Chip icon={<VerifiedUser sx={{ fontSize: 10 }} />} label="OTP" size="small"
                                        sx={{
                                            bgcolor: 'rgba(16,185,129,0.08)', color: '#10B981',
                                            fontSize: '0.55rem', height: 18, flexShrink: 0,
                                            '& .MuiChip-icon': { color: '#10B981' },
                                        }} />
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            {/* OTP Verification Dialog */}
            <Dialog open={otpDialogOpen} onClose={() => setOtpDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: '#1A2235', borderRadius: 4, width: '100%', maxWidth: 360,
                        mx: 2, border: '1px solid rgba(245,158,11,0.15)',
                    }
                }}>
                <DialogTitle sx={{ textAlign: 'center', pb: 1, pt: 3 }}>
                    <Box sx={{
                        width: 56, height: 56, borderRadius: 3, mx: 'auto', mb: 1.5,
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Lock sx={{ fontSize: 28, color: '#F59E0B' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.1rem' }}>Verify Pickup OTP</Typography>
                    <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8rem', mt: 0.5 }}>
                        Ask the dealer for the 6-digit code
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3 }}>
                    <TextField
                        fullWidth
                        autoFocus
                        value={otpInput}
                        onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                        placeholder="● ● ● ● ● ●"
                        inputProps={{
                            maxLength: 6,
                            style: { textAlign: 'center', fontSize: '1.8rem', letterSpacing: '0.5em', fontWeight: 800 },
                            inputMode: 'numeric',
                        }}
                        error={!!otpError}
                        helperText={otpError}
                        sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1, flexDirection: 'column', gap: 1 }}>
                    <Button
                        fullWidth variant="contained" disabled={otpInput.length !== 6 || verifyingOtp}
                        onClick={handleOtpVerify}
                        startIcon={verifyingOtp ? <CircularProgress size={18} color="inherit" /> : <VerifiedUser />}
                        sx={{
                            height: 48, borderRadius: 3,
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            fontWeight: 800, textTransform: 'none', fontSize: '0.9rem',
                            boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                            '&:active': { transform: 'scale(0.98)' },
                        }}
                    >
                        {verifyingOtp ? 'Verifying...' : 'Verify & Pickup'}
                    </Button>
                    <Button fullWidth onClick={() => setOtpDialogOpen(false)}
                        sx={{ color: '#64748B', textTransform: 'none', borderRadius: 3 }}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TransporterDashboardPage;
