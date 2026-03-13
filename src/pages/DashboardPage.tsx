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
        '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}15, transparent)`,
            transform: 'translate(30%, -30%)',
        },
    }}>
        <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, color }}>
                        {value}
                    </Typography>
                    {trend && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
                            <Typography variant="caption" color="success.main">{trend}</Typography>
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Welcome back! Here's your repair overview.
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
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Monthly Ticket Trend
                            </Typography>
                            {monthlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={monthlyData}>
                                        <defs>
                                            <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                        <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                                        <YAxis stroke="#64748B" fontSize={12} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                background: '#1A2332',
                                                border: '1px solid rgba(108,99,255,0.2)',
                                                borderRadius: 8,
                                                color: '#F1F5F9',
                                            }}
                                        />
                                        <Area type="monotone" dataKey="tickets" stroke="#6C63FF" fill="url(#ticketGradient)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="text.secondary">No data yet</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Revenue Card */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Revenue (Completed)
                            </Typography>
                            <Typography variant="h3" fontWeight={700} sx={{
                                mt: 1,
                                background: 'linear-gradient(135deg, #10B981, #00D9FF)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                {formatCurrency(revenue)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                From {completed} completed repairs
                            </Typography>

                            {monthlyData.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <ResponsiveContainer width="100%" height={120}>
                                        <BarChart data={monthlyData}>
                                            <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} opacity={0.8} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Tickets */}
                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={600}>Recent Tickets</Typography>
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
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Ticket #</TableCell>
                                            <TableCell>Customer</TableCell>
                                            <TableCell>Brand</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Created</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recentTickets.length > 0 ? recentTickets.map(ticket => (
                                            <TableRow
                                                key={ticket.id}
                                                hover
                                                onClick={() => navigate(`/tickets/${ticket.id}`)}
                                                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(108,99,255,0.04)' } }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600} color="primary">
                                                        {ticket.ticket_number}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{ticket.customer?.name || '—'}</TableCell>
                                                <TableCell>{ticket.tv_brand}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={TICKET_STATUS_LABELS[ticket.status]}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: `${TICKET_STATUS_COLORS[ticket.status]}20`,
                                                            color: TICKET_STATUS_COLORS[ticket.status],
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatRelative(ticket.created_at)}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">No tickets yet. Create your first ticket!</Typography>
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
