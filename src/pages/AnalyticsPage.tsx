import React, { useEffect, useState } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, Skeleton, ToggleButtonGroup, ToggleButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import {
    TrendingUp, AccountBalanceWallet, ShoppingCart, Receipt,
    MonetizationOn,
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/formatters';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

// ---------- TYPES ----------
interface InvoiceRow {
    id: string;
    ticket_id: string;
    amount: number;
    amount_paid: number;
    payment_method: string;
    payment_status: string;
    created_at: string;
    tickets?: { service_type: string } | { service_type: string }[];
}

interface PartBidRow {
    id: string;
    price: number;
    is_accepted: boolean;
    created_at: string;
    request_id: string;
}

interface TicketRow {
    id: string;
    tv_brand: string;
    status: string;
    estimated_cost: number | null;
    created_at: string;
    service_type: string;
}

// ---------- CHART COLORS ----------
const BRAND_COLORS = ['#6C63FF', '#00D9FF', '#10B981', '#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];
const PIE_COLORS = ['#6C63FF', '#10B981', '#F59E0B', '#00D9FF', '#F97316'];

// ---------- CUSTOM TOOLTIP ----------
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <Box sx={{
            background: '#1A2332', border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 2, p: 1.5, minWidth: 160,
        }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
            {payload.map((p: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: p.color }}>{p.name}</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: p.color }}>
                        {formatCurrency(p.value)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

// ---------- KPI CARD ----------
interface KPIProps { title: string; value: string; icon: React.ReactNode; color: string; subtitle?: string; }
const KPICard: React.FC<KPIProps> = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{
        position: 'relative', overflow: 'hidden', height: '100%',
        '&::after': {
            content: '""', position: 'absolute', top: 0, right: 0, width: 90, height: 90,
            borderRadius: '50%', background: `radial-gradient(circle, ${color}15, transparent)`, transform: 'translate(30%, -30%)',
        },
    }}>
        <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, color }}>{value}</Typography>
                    {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2.5, backgroundColor: `${color}18`, color }}>{icon}</Box>
            </Box>
        </CardContent>
    </Card>
);

// ---------- MAIN PAGE ----------
const AnalyticsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'all' | '6m' | '3m' | '1m'>('all');

    // Raw data
    const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
    const [partBids, setPartBids] = useState<PartBidRow[]>([]);
    const [tickets, setTickets] = useState<TicketRow[]>([]);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            const [invRes, bidRes, tickRes] = await Promise.all([
                supabase.from('invoices').select('id, ticket_id, amount, amount_paid, payment_method, payment_status, created_at, tickets(service_type)'),
                supabase.from('part_bids').select('id, price, is_accepted, created_at, request_id').eq('is_accepted', true),
                supabase.from('tickets').select('id, tv_brand, status, estimated_cost, created_at, service_type'),
            ]);
            if (invRes.data) setInvoices(invRes.data);
            if (bidRes.data) setPartBids(bidRes.data);
            if (tickRes.data) setTickets(tickRes.data);
            setLoading(false);
        };
        fetchAll();
    }, []);

    // ---------- FILTERED DATA ----------
    const filterDate = (dateStr: string) => {
        if (period === 'all') return true;
        const d = new Date(dateStr);
        const cutoff = new Date();
        if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
        else if (period === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
        else cutoff.setMonth(cutoff.getMonth() - 1);
        return d >= cutoff;
    };

    const filteredInvoices = invoices.filter(i => filterDate(i.created_at));
    const filteredBids = partBids.filter(b => filterDate(b.created_at));
    const filteredTickets = tickets.filter(t => filterDate(t.created_at));

    // ---------- KPI CALCULATIONS ----------
    let repairRevenue = 0;
    let installRevenue = 0;
    filteredInvoices.forEach(i => {
        const ticket = tickets.find(t => t.id === i.ticket_id);
        const type = ticket?.service_type || 'REPAIR';
        if (type === 'INSTALLATION') installRevenue += i.amount_paid;
        else repairRevenue += i.amount_paid;
    });
    
    // Installation tickets often skip the invoice process. If they are completed, add their estimated cost.
    filteredTickets.forEach(t => {
        if (t.service_type === 'INSTALLATION' && (t.status === 'PAYMENT_COLLECTED' || t.status === 'CLOSED')) {
            const hasInvoice = filteredInvoices.some(i => i.ticket_id === t.id);
            if (!hasInvoice) {
                installRevenue += (t.estimated_cost || 0);
            }
        }
    });
    const totalRevenue = repairRevenue + installRevenue;
    const totalPartsCost = filteredBids.reduce((s, b) => s + b.price, 0);
    const netProfit = totalRevenue - totalPartsCost;
    const avgTicketValue = filteredInvoices.length > 0 ? totalRevenue / filteredInvoices.length : 0;
    
    // Service Type Breakdown Data
    const serviceTypeData = [
        { name: 'TV Repair', value: repairRevenue },
        { name: 'TV Installation', value: installRevenue }
    ].filter(d => d.value > 0);

    const closedTickets = filteredTickets.filter(t => t.status === 'CLOSED' || t.status === 'DELIVERED').length;

    // ---------- MONTHLY REVENUE VS COST ----------
    const monthlyMap: Record<string, { month: string; repairRevenue: number; installRevenue: number; cost: number }> = {};
    filteredInvoices.forEach(inv => {
        const key = new Date(inv.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthlyMap[key]) monthlyMap[key] = { month: key, repairRevenue: 0, installRevenue: 0, cost: 0 };
        const ticket = tickets.find(t => t.id === inv.ticket_id);
        const type = ticket?.service_type || 'REPAIR';
        if (type === 'INSTALLATION') {
            monthlyMap[key].installRevenue += inv.amount_paid;
        } else {
            monthlyMap[key].repairRevenue += inv.amount_paid;
        }
    });

    // Add un-invoiced Installation ticket revenue to months
    filteredTickets.forEach(t => {
        if (t.service_type === 'INSTALLATION' && (t.status === 'PAYMENT_COLLECTED' || t.status === 'CLOSED')) {
            const hasInvoice = filteredInvoices.some(inv => inv.ticket_id === t.id);
            if (!hasInvoice) {
                const key = new Date(t.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!monthlyMap[key]) monthlyMap[key] = { month: key, repairRevenue: 0, installRevenue: 0, cost: 0 };
                monthlyMap[key].installRevenue += (t.estimated_cost || 0);
            }
        }
    });
    filteredBids.forEach(bid => {
        const key = new Date(bid.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthlyMap[key]) monthlyMap[key] = { month: key, repairRevenue: 0, installRevenue: 0, cost: 0 };
        monthlyMap[key].cost += bid.price;
    });
    const monthlyData = Object.values(monthlyMap).sort((a, b) => {
        // Sort chronologically
        const parse = (s: string) => {
            const [mon, yr] = s.split(' ');
            return new Date(`${mon} 20${yr}`).getTime();
        };
        return parse(a.month) - parse(b.month);
    });

    // ---------- PAYMENT METHOD BREAKDOWN ----------
    const paymentMap: Record<string, number> = {};
    filteredInvoices.forEach(inv => {
        paymentMap[inv.payment_method] = (paymentMap[inv.payment_method] || 0) + inv.amount_paid;
    });
    const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));

    // ---------- TOP TV BRANDS ----------
    const brandMap: Record<string, number> = {};
    filteredTickets.forEach(t => {
        brandMap[t.tv_brand] = (brandMap[t.tv_brand] || 0) + 1;
    });
    const brandData = Object.entries(brandMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    // ---------- REVENUE TREND (AREA) ----------
    const revenueTrend = monthlyData.map(m => ({
        month: m.month,
        profit: (m.repairRevenue + m.installRevenue) - m.cost,
    }));

    if (loading) {
        return (
            <Box>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Profit Analytics</Typography>
                <Grid container spacing={2.5}>
                    {[1, 2, 3, 4].map(i => (
                        <Grid size={{ xs: 6, md: 3 }} key={i}>
                            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }} />
                        </Grid>
                    ))}
                    <Grid size={{ xs: 12 }}>
                        <Skeleton variant="rounded" height={350} sx={{ borderRadius: 4 }} />
                    </Grid>
                </Grid>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Profit Analytics</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Financial overview of your repair business.
                    </Typography>
                </Box>
                <ToggleButtonGroup
                    value={period}
                    exclusive
                    onChange={(_, v) => v && setPeriod(v)}
                    size="small"
                    sx={{
                        '& .MuiToggleButton-root': {
                            textTransform: 'none', px: 2, fontWeight: 600,
                            '&.Mui-selected': { backgroundColor: 'rgba(108,99,255,0.15)', color: '#6C63FF' },
                        },
                    }}
                >
                    <ToggleButton value="1m">1M</ToggleButton>
                    <ToggleButton value="3m">3M</ToggleButton>
                    <ToggleButton value="6m">6M</ToggleButton>
                    <ToggleButton value="all">All</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <KPICard
                        title="Total Revenue"
                        value={formatCurrency(totalRevenue)}
                        icon={<AccountBalanceWallet />}
                        color="#10B981"
                        subtitle={`Repair: ${formatCurrency(repairRevenue)} • Install: ${formatCurrency(installRevenue)}`}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <KPICard
                        title="Parts Cost"
                        value={formatCurrency(totalPartsCost)}
                        icon={<ShoppingCart />}
                        color="#F59E0B"
                        subtitle={`${filteredBids.length} approved bids`}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <KPICard
                        title="Net Profit"
                        value={formatCurrency(netProfit)}
                        icon={<MonetizationOn />}
                        color={netProfit >= 0 ? '#6C63FF' : '#EF4444'}
                        subtitle={totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% margin` : '—'}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <KPICard
                        title="Avg Ticket Value"
                        value={formatCurrency(avgTicketValue)}
                        icon={<Receipt />}
                        color="#00D9FF"
                        subtitle={`${closedTickets} completed tickets`}
                    />
                </Grid>
            </Grid>

            {/* Charts Row 1 */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {/* Revenue vs Cost */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Revenue vs Parts Cost (Monthly)
                            </Typography>
                            {monthlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={monthlyData} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                        <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                                        <YAxis stroke="#64748B" fontSize={12} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Bar dataKey="repairRevenue" stackId="revenue" name="Repair Revenue" fill="#10B981" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="installRevenue" stackId="revenue" name="Install Revenue" fill="#00D9FF" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="cost" name="Parts Cost" fill="#F59E0B" radius={[4, 4, 0, 0]} opacity={0.8} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="text.secondary">No invoice data yet. Create invoices on ticket pages!</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Revenue by Service Type */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Revenue by Service
                            </Typography>
                            {serviceTypeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={serviceTypeData}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name?.split(' ')[1] || ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            <Cell key="repair" fill="#10B981" />
                                            <Cell key="install" fill="#00D9FF" />
                                        </Pie>
                                        <Legend
                                            verticalAlign="bottom"
                                            iconType="circle"
                                            formatter={(value) => <span style={{ color: '#94A3B8', fontSize: '12px' }}>{value}</span>}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                background: '#1A2332', border: '1px solid rgba(108,99,255,0.2)',
                                                borderRadius: 8, color: '#F1F5F9',
                                            }}
                                            formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="text.secondary">No revenue data yet</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts Row 2 */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {/* Profit Trend */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Profit Trend
                            </Typography>
                            {revenueTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={revenueTrend}>
                                        <defs>
                                            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                        <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                                        <YAxis stroke="#64748B" fontSize={12} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#6C63FF" fill="url(#profitGradient)" strokeWidth={2.5} />
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

                {/* Payment Method Breakdown */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Payment Methods
                            </Typography>
                            {paymentData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={paymentData}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {paymentData.map((_, idx) => (
                                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend
                                            verticalAlign="bottom"
                                            iconType="circle"
                                            formatter={(value) => <span style={{ color: '#94A3B8', fontSize: '12px' }}>{value}</span>}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                background: '#1A2332', border: '1px solid rgba(108,99,255,0.2)',
                                                borderRadius: 8, color: '#F1F5F9',
                                            }}
                                            formatter={(value: any) => [formatCurrency(value), 'Amount']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="text.secondary">No payment data yet</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts Row 3 */}
            <Grid container spacing={2.5}>
                {/* Top TV Brands */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                                Top TV Brands Serviced
                            </Typography>
                            {brandData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={brandData} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                        <XAxis type="number" stroke="#64748B" fontSize={12} />
                                        <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={11} width={80} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                background: '#1A2332', border: '1px solid rgba(108,99,255,0.2)',
                                                borderRadius: 8, color: '#F1F5F9',
                                            }}
                                        />
                                        <Bar dataKey="count" name="Tickets" radius={[0, 4, 4, 0]}>
                                            {brandData.map((_, idx) => (
                                                <Cell key={idx} fill={BRAND_COLORS[idx % BRAND_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="text.secondary">No ticket data yet</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsPage;
