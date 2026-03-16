import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Tooltip,
    CircularProgress, Alert, Button, Pagination
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    NotificationsOff as NoSubIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

// Add type for the logs
interface NotificationLog {
    id: string;
    event_type: string;
    source_id: string;
    source_table: string;
    target_role: string;
    target_user_id: string;
    target_user_name: string;
    title: string;
    body: string;
    status: string;
    sent_count: number;
    failed_count: number;
    error_message: string;
    created_at: string;
    delivered_at: string;
}

const NotificationLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ROWS_PER_PAGE = 20;

    // KPI State
    const [kpis, setKpis] = useState({
        totalSent: 0,
        successRate: 0,
        failedRate: 0,
        noSubRate: 0
    });

    const fetchLogs = async (pageNum = 1) => {
        try {
            setLoading(true);
            setError(null);

            // Fetch Logs with Pagination
            const start = (pageNum - 1) * ROWS_PER_PAGE;
            const end = start + ROWS_PER_PAGE - 1;

            const { data, error: fetchError, count } = await supabase
                .from('notification_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(start, end);

            if (fetchError) throw fetchError;

            setLogs(data || []);
            setTotalPages(Math.ceil((count || 0) / ROWS_PER_PAGE));

            // Only fetch KPIs on first load or manual refresh
            if (pageNum === 1) {
                 const { data: allStats, error: statError } = await supabase
                    .from('notification_logs')
                    .select('status, id');
                
                if (statError) throw statError;

                if (allStats && allStats.length > 0) {
                    const total = allStats.length;
                    const sent = allStats.filter((s: any) => s.status === 'SENT' || s.status === 'PARTIAL_SUCCESS').length;
                    const failed = allStats.filter((s: any) => s.status === 'FAILED').length;
                    const noSub = allStats.filter((s: any) => s.status === 'NO_SUBSCRIPTION').length;

                    setKpis({
                        totalSent: total,
                        successRate: Math.round((sent / total) * 100),
                        failedRate: Math.round((failed / total) * 100),
                        noSubRate: Math.round((noSub / total) * 100),
                    });
                }
            }

        } catch (err: any) {
            console.error('Error fetching logs:', err);
            setError(err.message || 'Failed to load notification logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);

        // Realtime subscription for new logs
        const channel = supabase.channel('notification-logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_logs' }, () => {
                // Refresh if on page 1, else just show a "New logs available" indicator (simplified here: just re-fetch if p1)
                if (page === 1) fetchLogs(1);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [page]);

    const getStatusChip = (status: string, errorMsg?: string) => {
        switch (status) {
            case 'SENT':
                return <Chip icon={<CheckCircleIcon fontSize="small"/>} label="Sent ✓" color="success" size="small" variant="outlined" />;
            case 'PARTIAL_SUCCESS':
                return <Chip icon={<CheckCircleIcon fontSize="small"/>} label="Partial ✓" color="warning" size="small" variant="outlined" />;
            case 'FAILED':
                return (
                    <Tooltip title={errorMsg || 'Delivery Failed'}>
                        <Chip icon={<ErrorIcon fontSize="small" />} label="Failed" color="error" size="small" variant="outlined" />
                    </Tooltip>
                );
            case 'NO_SUBSCRIPTION':
                return (
                    <Tooltip title="User has not enabled push notifications on their device">
                        <Chip icon={<NoSubIcon fontSize="small" />} label="No Sub" color="warning" size="small" variant="outlined" />
                    </Tooltip>
                );
            default:
                return <Chip label={status} size="small" variant="outlined" />;
        }
    };

    const getRoleParams = (role: string) => {
        switch (role) {
            case 'TECHNICIAN': return { color: '#10B981', label: 'Tech' };
            case 'DEALER': return { color: '#F59E0B', label: 'Dealer' };
            case 'TRANSPORTER': return { color: '#6C63FF', label: 'Transport' };
            case 'ADMIN': return { color: '#EF4444', label: 'Admin' };
            default: return { color: '#94A3B8', label: role };
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', p: { xs: 1, sm: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimelineIcon sx={{ color: '#6C63FF' }}/> Smart Notification Engine
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
                        Real-time audit trail and delivery analytics for Web Push events.
                    </Typography>
                </Box>
                <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />}
                    onClick={() => fetchLogs(1)}
                    disabled={loading}
                    sx={{
                        color: '#94A3B8', borderColor: 'rgba(148,163,184,0.3)', textTransform: 'none',
                        '&:hover': { borderColor: '#F1F5F9', color: '#F1F5F9' }
                    }}
                >
                    Refresh
                </Button>
            </Box>

            {/* Error State */}
            {error && (
                <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F8FAFC', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    {error}
                </Alert>
            )}

            {/* KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(148,163,184,0.1)', backdropFilter: 'blur(10px)' }}>
                        <CardContent>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Events</Typography>
                            <Typography variant="h4" sx={{ color: '#F8FAFC', mt: 1, fontWeight: 700 }}>{kpis.totalSent}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <CardContent>
                            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Success Rate</Typography>
                            <Typography variant="h4" sx={{ color: '#10B981', mt: 1, fontWeight: 700 }}>{kpis.successRate}%</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.05))', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <CardContent>
                            <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Failed Rate</Typography>
                            <Typography variant="h4" sx={{ color: '#EF4444', mt: 1, fontWeight: 700 }}>{kpis.failedRate}%</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <CardContent>
                            <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>No Device Sub</Typography>
                            <Typography variant="h4" sx={{ color: '#F59E0B', mt: 1, fontWeight: 700 }}>{kpis.noSubRate}%</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Logs Table */}
            <TableContainer component={Paper} sx={{ 
                background: 'rgba(30,41,59,0.5)', 
                border: '1px solid rgba(148,163,184,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2
            }}>
                {loading && logs.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress sx={{ color: '#6C63FF' }} />
                    </Box>
                ) : (
                    <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead sx={{ background: 'rgba(15,23,42,0.6)' }}>
                            <TableRow>
                                <TableCell sx={{ color: '#94A3B8', fontWeight: 600, py: 2 }}>Timestamp</TableCell>
                                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Target</TableCell>
                                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Event Trigger</TableCell>
                                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Content</TableCell>
                                <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 600 }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.map((log) => {
                                const roleStyle = getRoleParams(log.target_role);
                                return (
                                    <TableRow key={log.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                        <TableCell sx={{ color: '#CBD5E1', fontSize: '0.85rem' }}>
                                            {new Date(log.created_at).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="caption" sx={{ 
                                                    px: 1, py: 0.2, 
                                                    borderRadius: 1, 
                                                    backgroundColor: `${roleStyle.color}15`, 
                                                    color: roleStyle.color,
                                                    fontWeight: 600,
                                                    fontSize: '0.65rem',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {roleStyle.label}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 500 }}>
                                                    {log.target_user_name || 'Unknown User'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: '#CBD5E1', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {log.event_type}
                                            </Typography>
                                            {log.source_id && (
                                                 <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                                     ref: {log.source_id.split('-').pop()}
                                                 </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 300 }}>
                                            <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 600, mb: 0.5 }} noWrap>
                                                {log.title}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.body}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {getStatusChip(log.status, log.error_message)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {logs.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#64748B' }}>
                                        No notification logs recorded yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination 
                        count={totalPages} 
                        page={page} 
                        onChange={(_, val) => setPage(val)}
                        color="primary"
                        sx={{
                            '& .MuiPaginationItem-root': { color: '#94A3B8' },
                            '& .Mui-selected': { backgroundColor: 'rgba(108,99,255,0.2) !important', color: '#8B85FF' }
                        }}
                    />
                </Box>
            )}
        </Box>
    );
};

export default NotificationLogsPage;
