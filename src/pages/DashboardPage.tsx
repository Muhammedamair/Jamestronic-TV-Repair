import React, { useEffect, useState } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, Chip, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Skeleton, keyframes,
} from '@mui/material';
import {
    ConfirmationNumber, HourglassBottom, CheckCircle, TrendingUp,
    ArrowForward, Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Ticket, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '../types/database';
import { formatRelative, formatCurrency } from '../utils/formatters';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, AreaChart, Area,
} from 'recharts';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, trend }) => (
    <Card sx={{
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(26, 34, 53, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        boxShadow: `0 4px 20px -2px ${color}15`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 28px -4px ${color}30`,
            border: `1px solid ${color}30`,
            '& .icon-bg': {
                transform: 'scale(1.1) rotate(5deg)',
            }
        },
        '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}20, transparent 70%)`,
            transform: 'translate(30%, -30%)',
            transition: 'transform 0.5s ease',
        },
        '&:hover::after': {
            transform: 'translate(20%, -20%) scale(1.2)',
        }
    }}>
        <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, color, textShadow: `0 2px 10px ${color}40` }}>
                        {value}
                    </Typography>
                    {trend && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
                            <Typography variant="caption" color="success.main" fontWeight={600}>{trend}</Typography>
                        </Box>
                    )}
                </Box>
                <Box sx={{
                    p: 1.2,
                    borderRadius: 2.5,
                    backgroundColor: `${color}18`,
                    color: color,
                }}>
                    {icon}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<{ month: string; tickets: number; revenue: number }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const { data } = await supabase
                .from('tickets')
                .select('*, customer:customers(*)')
                .order('created_at', { ascending: false });

            if (data) {
                setTickets(data as Ticket[]);

                // Generate monthly chart data from tickets
                const months: Record<string, { tickets: number; revenue: number }> = {};
                data.forEach((t: any) => {
                    const month = new Date(t.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
                    if (!months[month]) months[month] = { tickets: 0, revenue: 0 };
                    months[month].tickets += 1;
                    months[month].revenue += t.estimated_cost || 0;
                });
                setMonthlyData(
                    Object.entries(months)
                        .slice(-6)
                        .map(([month, v]) => ({ month, ...v }))
                );
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const openTickets = tickets.filter(t => ['CREATED', 'DIAGNOSED', 'PICKUP_SCHEDULED'].includes(t.status)).length;
    const inProgress = tickets.filter(t => ['PICKED_UP', 'IN_REPAIR', 'QUOTATION_SENT', 'APPROVED'].includes(t.status)).length;
    const completed = tickets.filter(t => ['DELIVERED', 'CLOSED'].includes(t.status)).length;
    const revenue = tickets
        .filter(t => t.status === 'CLOSED' || t.status === 'DELIVERED')
        .reduce((sum, t) => sum + (t.estimated_cost || 0), 0);

    const recentTickets = tickets.slice(0, 5);

    if (loading) {
        return (
            <Box>
                <Grid container spacing={3}>
                    {[1, 2, 3, 4].map(i => (
                        <Grid size={{ xs: 6, md: 3 }} key={i}>
                            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{
                        background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        Admin Command Center
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Enterprise overview and performance metrics
                    </Typography>
                </Box>
                <IconButton
                    onClick={() => navigate('/tickets/new')}
                    sx={{
                        background: 'linear-gradient(135deg, #6C63FF, #8B85FF)',
                        color: '#fff',
                        '&:hover': { background: 'linear-gradient(135deg, #5A52E0, #7A74FF)' },
                    }}
                >
                    <AddIcon />
                </IconButton>
            </Box>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatsCard title="Total Tickets" value={tickets.length} icon={<ConfirmationNumber />} color="#6C63FF" />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatsCard title="Open" value={openTickets} icon={<HourglassBottom />} color="#F59E0B" />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatsCard title="In Progress" value={inProgress} icon={<TrendingUp />} color="#00D9FF" />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatsCard title="Completed" value={completed} icon={<CheckCircle />} color="#10B981" />
                </Grid>
            </Grid>

            <Grid container spacing={2.5}>
                {/* Monthly Trend Chart */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Card sx={{ 
                        height: '100%',
                        background: 'rgba(26, 34, 53, 0.7)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                    }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 3, color: '#E2E8F0', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                Monthly Ticket Trend
                            </Typography>
                            {monthlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8B85FF" stopOpacity={0.6} />
                                                <stop offset="95%" stopColor="#8B85FF" stopOpacity={0.0} />
                                            </linearGradient>
                                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feGaussianBlur stdDeviation="4" result="blur" />
                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                            </filter>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.05)" vertical={false} />
                                        <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                background: 'rgba(15, 23, 42, 0.9)',
                                                backdropFilter: 'blur(10px)',
                                                border: '1px solid rgba(139, 133, 255, 0.3)',
                                                borderRadius: 12,
                                                color: '#F1F5F9',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                            }}
                                            itemStyle={{ color: '#8B85FF', fontWeight: 600 }}
                                        />
                                        <Area type="monotone" dataKey="tickets" stroke="#8B85FF" fill="url(#ticketGradient)" strokeWidth={3} filter="url(#glow)" activeDot={{ r: 6, fill: '#fff', stroke: '#8B85FF', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="text.secondary">No data yet</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Revenue Card */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Card sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        background: 'rgba(26, 34, 53, 0.7)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                    }}>
                        <CardContent sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Revenue (Completed)
                            </Typography>
                            <Typography variant="h3" fontWeight={800} sx={{
                                mt: 1.5,
                                background: 'linear-gradient(135deg, #10B981 0%, #00D9FF 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: 'drop-shadow(0px 4px 12px rgba(16, 185, 129, 0.4))',
                                letterSpacing: '-1px'
                            }}>
                                {formatCurrency(revenue)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                                From {completed} completed repairs
                            </Typography>

                            {monthlyData.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <BarChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                                    <stop offset="100%" stopColor="#00D9FF" stopOpacity={0.6} />
                                                </linearGradient>
                                            </defs>
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                contentStyle={{
                                                    background: 'rgba(15, 23, 42, 0.9)',
                                                    backdropFilter: 'blur(10px)',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                                    borderRadius: 12,
                                                    color: '#F1F5F9',
                                                }}
                                                formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Revenue']}
                                            />
                                            <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} dy={5} />
                                            <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Tickets */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{
                        background: 'rgba(26, 34, 53, 0.7)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#E2E8F0', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                    Recent Tickets
                                </Typography>
                                <Chip
                                    label="View All"
                                    size="small"
                                    onClick={() => navigate('/tickets')}
                                    deleteIcon={<ArrowForward sx={{ fontSize: 14 }} />}
                                    onDelete={() => navigate('/tickets')}
                                    sx={{
                                        backgroundColor: 'rgba(108,99,255,0.1)',
                                        color: '#6C63FF',
                                        '&:hover': { backgroundColor: 'rgba(108,99,255,0.2)' },
                                    }}
                                />
                            </Box>
                            <TableContainer sx={{ 
                                mt: 1, 
                                borderRadius: 3, 
                                border: '1px solid rgba(148, 163, 184, 0.1)',
                                overflow: 'hidden'
                            }}>
                                <Table size="small">
                                    <TableHead sx={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                                        <TableRow>
                                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>Ticket #</TableCell>
                                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>Customer</TableCell>
                                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>Brand</TableCell>
                                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>Status</TableCell>
                                            <TableCell sx={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>Created</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recentTickets.length > 0 ? recentTickets.map(ticket => (
                                            <TableRow
                                                key={ticket.id}
                                                hover
                                                onClick={() => navigate(`/tickets/${ticket.id}`)}
                                                sx={{ 
                                                    cursor: 'pointer', 
                                                    transition: 'all 0.2s',
                                                    '&:hover': { backgroundColor: 'rgba(108,99,255,0.08)' },
                                                    '& td': { borderBottom: '1px solid rgba(148, 163, 184, 0.05)' }
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700} color="primary" sx={{ letterSpacing: '0.02em' }}>
                                                        {ticket.ticket_number}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ color: '#E2E8F0', fontWeight: 500 }}>{ticket.customer?.name || '—'}</TableCell>
                                                <TableCell sx={{ color: '#CBD5E1' }}>{ticket.tv_brand}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={TICKET_STATUS_LABELS[ticket.status]}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: `${TICKET_STATUS_COLORS[ticket.status]}15`,
                                                            color: TICKET_STATUS_COLORS[ticket.status],
                                                            fontWeight: 700,
                                                            fontSize: '0.7rem',
                                                            border: `1px solid ${TICKET_STATUS_COLORS[ticket.status]}30`,
                                                            boxShadow: `0 2px 8px ${TICKET_STATUS_COLORS[ticket.status]}20`
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                                        {formatRelative(ticket.created_at)}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                                    <ConfirmationNumber sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
                                                    <Typography color="text.secondary" fontWeight={500}>No tickets yet. Create your first ticket!</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DashboardPage;
