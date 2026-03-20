"use client";
import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, TextField, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton, Skeleton, Avatar, Collapse, Tooltip, CircularProgress, Button,
} from '@mui/material';
import {
    Search, Phone, ExpandMore, ExpandLess, People, ConfirmationNumber,
    TrendingUp, History, BuildCircle,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { Customer, Ticket } from '../../types/database';
import { formatDate, formatMobile, formatRelative } from '../../utils/formatters';

const ACTIVE_TICKET_STATUSES = ['CREATED', 'DIAGNOSED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_REPAIR', 'QUOTATION_SENT', 'APPROVED', 'REPAIRED', 'DELIVERY_SCHEDULED', 'CONFIRMED', 'EN_ROUTE', 'INSTALLED', 'PAYMENT_COLLECTED'];

const CustomerListPage: React.FC = () => {
    const { push: navigate } = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const [customersRes, ticketsRes] = await Promise.all([
                supabase.from('customers').select('*').order('created_at', { ascending: false }),
                supabase.from('tickets').select('id, ticket_number, customer_id, status, tv_brand, tv_size, created_at, service_type').order('created_at', { ascending: false })
            ]);

            if (customersRes.data) setCustomers(customersRes.data as Customer[]);
            if (ticketsRes.data) setTickets(ticketsRes.data as Ticket[]);
            setLoading(false);
        };
        fetchData();
    }, []);

    const filteredCustomers = customers.filter(c => {
        const s = search.toLowerCase();
        return !search || c.name.toLowerCase().includes(s) || c.mobile.includes(search) || c.address.toLowerCase().includes(s);
    });

    // KPI Calculations
    const totalCustomers = customers.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newThisMonth = customers.filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    
    const totalTickets = tickets.length;
    const activeTicketsCount = tickets.filter(t => ACTIVE_TICKET_STATUSES.includes(t.status)).length;

    // Helper to get stats for a single customer
    const getCustomerStats = (customerId: string) => {
        const customerTickets = tickets.filter(t => t.customer_id === customerId);
        const active = customerTickets.filter(t => ACTIVE_TICKET_STATUSES.includes(t.status)).length;
        const completed = customerTickets.filter(t => t.status === 'CLOSED').length;
        return {
            total: customerTickets.length,
            active,
            completed,
            recentTickets: customerTickets.slice(0, 5) // Last 5 tickets
        };
    };

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Customer Database</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your client relationships and service history
                    </Typography>
                </Box>
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
                                    <People fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    TOTAL CUSTOMERS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#6C63FF' }}>
                                {totalCustomers}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Client base</Typography>
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
                                    <TrendingUp fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    NEW THIS MONTH
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#10B981' }}>
                                +{newThisMonth}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>In the current month</Typography>
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
                                    <History fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    LIFETIME TICKETS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#00D9FF' }}>
                                {totalTickets}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Total generated</Typography>
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
                                    <ConfirmationNumber fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    ACTIVE TICKETS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#F59E0B' }}>
                                {activeTicketsCount}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Currently in progress</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search Bar */}
            <Card sx={{ mb: 3, bgcolor: '#1A2235', backgroundImage: 'none', borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <TextField 
                        fullWidth 
                        placeholder="Search by name, mobile, or address..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        variant="outlined"
                        InputProps={{ 
                            startAdornment: <InputAdornment position="start"><Search sx={{ color: '#64748B' }} /></InputAdornment>,
                            sx: { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }
                        }} 
                    />
                </CardContent>
            </Card>

            {/* Customer Cards List */}
            {filteredCustomers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <People sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
                    <Typography color="text.secondary">
                        {search ? "No customers match your search." : "No customers found in the system."}
                    </Typography>
                </Box>
            ) : (
                filteredCustomers.map(customer => {
                    const stats = getCustomerStats(customer.id);
                    const isExpanded = expandedCustomerId === customer.id;

                    return (
                        <Card
                            key={customer.id}
                            sx={{
                                mb: 2,
                                border: isExpanded ? '1px solid rgba(108,99,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s ease',
                                '&:hover': { border: '1px solid rgba(108,99,255,0.2)' },
                                bgcolor: '#1A2235',
                            }}
                        >
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                {/* Header Row */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                                    <Avatar sx={{
                                        width: 48, height: 48,
                                        bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF',
                                        fontWeight: 700, fontSize: '1.2rem',
                                    }}>
                                        {customer.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate(`/customers/${customer.id}`)}>
                                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, '&:hover': { color: '#6C63FF' } }}>
                                            {customer.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                            <Typography variant="body2" sx={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Phone sx={{ fontSize: 14, color: '#10B981' }} /> {formatMobile(customer.mobile)}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                                                📍 {customer.address.length > 50 ? customer.address.slice(0, 50) + '...' : customer.address}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#475569' }}>
                                                Client since {formatDate(customer.created_at)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title={isExpanded ? 'Hide History' : 'View Ticket History'}>
                                            <IconButton
                                                onClick={() => setExpandedCustomerId(isExpanded ? null : customer.id)}
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

                                {/* Mini Stats Row */}
                                <Box sx={{ display: 'flex', gap: 3, mt: 2, pl: { xs: 0, sm: 8 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>Tickets:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{stats.total}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>Active:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 800, color: stats.active > 0 ? '#F59E0B' : 'inherit' }}>{stats.active}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>Completed:</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981' }}>{stats.completed}</Typography>
                                    </Box>
                                </Box>

                                {/* Expandable Ticket History */}
                                <Collapse in={isExpanded} timeout="auto">
                                    <Box sx={{ mt: 3, pl: { xs: 0, sm: 8 } }}>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <BuildCircle fontSize="small" sx={{ color: '#6C63FF' }} />
                                            Recent Service History
                                        </Typography>

                                        {stats.recentTickets.length > 0 ? (
                                            <TableContainer component={Paper} sx={{
                                                bgcolor: 'rgba(15,23,42,0.5)',
                                                backgroundImage: 'none',
                                                borderRadius: 2,
                                                mb: 1,
                                            }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Ticket #</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Appliance</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Status</TableCell>
                                                            <TableCell sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: { xs: 'none', sm: 'table-cell' } }}>Date</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {stats.recentTickets.map(ticket => (
                                                            <TableRow
                                                                key={ticket.id}
                                                                sx={{ '&:hover': { bgcolor: 'rgba(108,99,255,0.05)', cursor: 'pointer' } }}
                                                                onClick={() => navigate(`/tickets/${ticket.id}`)}
                                                            >
                                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#6C63FF' }}>
                                                                        {ticket.ticket_number}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell sx={{ color: '#E2E8F0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <Typography variant="body2">{ticket.tv_brand} {ticket.tv_size ? `${ticket.tv_size}"` : ''}</Typography>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{ticket.service_type}</Typography>
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                    <Chip
                                                                        label={ticket.status.replace(/_/g, ' ')}
                                                                        size="small"
                                                                        color={
                                                                            ticket.status === 'CLOSED' ? 'success' :
                                                                            'warning'
                                                                        }
                                                                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)', display: { xs: 'none', sm: 'table-cell' } }}>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {formatRelative(ticket.created_at)}
                                                                    </Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: '#64748B', fontStyle: 'italic', mt: 1 }}>
                                                No tickets found for this customer.
                                            </Typography>
                                        )}
                                        <Button 
                                            variant="text" 
                                            size="small" 
                                            onClick={() => navigate(`/customers/${customer.id}`)}
                                            sx={{ mt: 1, textTransform: 'none', fontWeight: 600, color: '#6C63FF' }}
                                        >
                                            View Full Customer Profile
                                        </Button>
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </Box>
    );
};

export default CustomerListPage;
