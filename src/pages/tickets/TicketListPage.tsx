import React, { useState, useEffect } from 'react';
import {
    Box, Typography, TextField, Card, CardContent, Chip, InputAdornment,
    Grid, IconButton, Skeleton, Avatar, Button, Tooltip, CircularProgress,
} from '@mui/material';
import {
    Search as SearchIcon, Add as AddIcon,
    Build as RepairIcon, InstallDesktop as InstallIcon,
    Engineering as TechIcon, PersonOff as UnassignedIcon,
    ReceiptLong, AssignmentLate, BuildCircle, CheckCircle,
    Phone as PhoneIcon, AccountCircle, Tv, AccessTime, Autorenew
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Ticket, TicketStatus, TicketServiceType, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, Technician, TechStatus } from '../../types/database';
import { formatRelative, formatCurrency, formatMobile } from '../../utils/formatters';

const statusFilters: { label: string; value: string; color: string }[] = [
    { label: 'All', value: 'ALL', color: '#F1F5F9' },
    { label: 'Open', value: 'OPEN', color: '#F59E0B' },
    { label: 'In Progress', value: 'IN_PROGRESS', color: '#00D9FF' },
    { label: 'Completed', value: 'COMPLETED', color: '#10B981' },
    { label: 'Closed', value: 'CLOSED', color: '#6B7280' },
];

const openStatuses: TicketStatus[] = ['CREATED', 'DIAGNOSED', 'PICKUP_SCHEDULED', 'CONFIRMED'];
const inProgressStatuses: TicketStatus[] = ['PICKED_UP', 'IN_REPAIR', 'QUOTATION_SENT', 'APPROVED', 'REPAIRED', 'DELIVERY_SCHEDULED', 'EN_ROUTE', 'INSTALLED', 'PAYMENT_COLLECTED'];
const completedStatuses: TicketStatus[] = ['DELIVERED'];
const closedStatuses: TicketStatus[] = ['CLOSED'];

const TECH_STATUS_LABELS: Record<TechStatus, string> = {
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANT_REPAIR: "Can't Repair",
    PART_REQUIRED: 'Part Required',
};

const TECH_STATUS_COLORS: Record<TechStatus, string> = {
    ASSIGNED: '#6C63FF',
    IN_PROGRESS: '#00D9FF',
    COMPLETED: '#10B981',
    CANT_REPAIR: '#EF4444',
    PART_REQUIRED: '#F59E0B',
};

const TicketListPage: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [techLogs, setTechLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [serviceTypeFilter, setServiceTypeFilter] = useState<'ALL' | TicketServiceType>('ALL');
    const [techFilter, setTechFilter] = useState('ALL'); // ALL | UNASSIGNED | techId

    const fetchData = async () => {
        const [ticketsRes, techsRes, logsRes] = await Promise.all([
            supabase.from('tickets').select('*, customer:customers(*)').order('created_at', { ascending: false }),
            supabase.from('technicians').select('*').order('name'),
            supabase.from('ticket_technician_log').select('*'),
        ]);

        if (ticketsRes.data) setTickets(ticketsRes.data as Ticket[]);
        if (techsRes.data) setTechnicians(techsRes.data);
        if (logsRes.data) setTechLogs(logsRes.data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        // Realtime subscription for ticket updates
        const channel = supabase.channel('tickets-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_technician_log' }, () => {
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Build a map: ticketId -> latest tech log
    const techLogMap = React.useMemo(() => {
        const map: Record<string, any> = {};
        for (const log of techLogs) {
            const existing = map[log.ticket_id];
            if (!existing || new Date(log.assigned_at) > new Date(existing.assigned_at)) {
                map[log.ticket_id] = log;
            }
        }
        return map;
    }, [techLogs]);

    // Build a map: techId -> technician
    const techMap = React.useMemo(() => {
        const map: Record<string, Technician> = {};
        for (const t of technicians) map[t.id] = t;
        return map;
    }, [technicians]);

    const filteredTickets = tickets.filter(t => {
        // Search filter
        const searchLower = search.toLowerCase();
        const matchesSearch = !search ||
            t.ticket_number.toLowerCase().includes(searchLower) ||
            t.customer?.name.toLowerCase().includes(searchLower) ||
            t.customer?.mobile.includes(search) ||
            t.tv_brand.toLowerCase().includes(searchLower);

        // Status filter
        let matchesStatus = true;
        if (statusFilter === 'OPEN') matchesStatus = openStatuses.includes(t.status);
        else if (statusFilter === 'IN_PROGRESS') matchesStatus = inProgressStatuses.includes(t.status);
        else if (statusFilter === 'COMPLETED') matchesStatus = completedStatuses.includes(t.status);
        else if (statusFilter === 'CLOSED') matchesStatus = closedStatuses.includes(t.status);

        // Service type filter
        let matchesServiceType = true;
        if (serviceTypeFilter !== 'ALL') matchesServiceType = t.service_type === serviceTypeFilter;

        // Technician filter
        let matchesTech = true;
        if (techFilter === 'UNASSIGNED') {
            matchesTech = !t.assigned_technician_id;
        } else if (techFilter !== 'ALL') {
            matchesTech = t.assigned_technician_id === techFilter;
        }

        return matchesSearch && matchesStatus && matchesServiceType && matchesTech;
    });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return '#EF4444';
            case 'HIGH': return '#F97316';
            case 'MEDIUM': return '#F59E0B';
            case 'LOW': return '#10B981';
            default: return '#6B7280';
        }
    };

    const getTechInfo = (ticket: Ticket) => {
        if (!ticket.assigned_technician_id) return null;
        const tech = techMap[ticket.assigned_technician_id];
        const log = techLogMap[ticket.id];
        return {
            name: tech?.name || 'Unknown',
            initial: (tech?.name || 'U').charAt(0).toUpperCase(),
            techStatus: (log?.tech_status as TechStatus) || 'ASSIGNED',
        };
    };

    // KPI Calculations
    const totalTickets = tickets.length;
    const openTicketsCount = tickets.filter(t => openStatuses.includes(t.status)).length;
    const inProgressCount = tickets.filter(t => inProgressStatuses.includes(t.status)).length;
    const unassignedCount = tickets.filter(t => !t.assigned_technician_id && !closedStatuses.includes(t.status)).length;

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Service Desk</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Command center for tickets, routing, and dispatch
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/tickets/new')}
                    sx={{
                        borderRadius: 2, px: 3, py: 1,
                        background: 'linear-gradient(135deg, #6C63FF 0%, #8B85FF 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #5A52E0 0%, #7A74FF 100%)' },
                    }}
                >
                    New Ticket
                </Button>
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
                                    <ReceiptLong fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    LIFETIME TICKETS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#6C63FF' }}>
                                {totalTickets}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Total volume</Typography>
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
                                    <AssignmentLate fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    OPEN / NEW
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#F59E0B' }}>
                                {openTicketsCount}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Awaiting action</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 6, md: 3 }}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)',
                        border: '1px solid rgba(239,68,68,0.15)',
                    }}>
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                                    <UnassignedIcon fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    UNASSIGNED
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#EF4444' }}>
                                {unassignedCount}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Needs dispatching</Typography>
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
                                    <Autorenew fontSize="small" />
                                </Avatar>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                    IN PROGRESS
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={800} sx={{ color: '#00D9FF' }}>
                                {inProgressCount}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Currently active</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filter Hub */}
            <Card sx={{ mb: 3, bgcolor: '#1A2235', backgroundImage: 'none', borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                placeholder="Search by ticket #, customer, mobile, brand..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                variant="outlined"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: '#64748B' }} />
                                        </InputAdornment>
                                    ),
                                    sx: { bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Stage Filters */}
                                <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                                    {statusFilters.map(sf => (
                                        <Chip
                                            key={sf.value}
                                            label={sf.label}
                                            size="small"
                                            onClick={() => setStatusFilter(sf.value)}
                                            sx={{
                                                fontWeight: 600, fontSize: '0.75rem',
                                                backgroundColor: statusFilter === sf.value ? `${sf.color}20` : 'transparent',
                                                color: statusFilter === sf.value ? sf.color : '#64748B',
                                                border: `1px solid ${statusFilter === sf.value ? `${sf.color}40` : 'transparent'}`,
                                                '&:hover': { backgroundColor: `${sf.color}15` },
                                            }}
                                        />
                                    ))}
                                </Box>

                                {/* Priority/Type Filters */}
                                <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                                    <Chip
                                        icon={<RepairIcon sx={{ fontSize: 14 }} />}
                                        label="Repair"
                                        size="small"
                                        onClick={() => setServiceTypeFilter(serviceTypeFilter === 'REPAIR' ? 'ALL' : 'REPAIR')}
                                        sx={{
                                            fontWeight: 600, fontSize: '0.75rem',
                                            backgroundColor: serviceTypeFilter === 'REPAIR' ? 'rgba(108,99,255,0.15)' : 'transparent',
                                            color: serviceTypeFilter === 'REPAIR' ? '#6C63FF' : '#64748B',
                                            border: `1px solid ${serviceTypeFilter === 'REPAIR' ? 'rgba(108,99,255,0.3)' : 'transparent'}`,
                                        }}
                                    />
                                    <Chip
                                        icon={<InstallIcon sx={{ fontSize: 14 }} />}
                                        label="Install"
                                        size="small"
                                        onClick={() => setServiceTypeFilter(serviceTypeFilter === 'INSTALLATION' ? 'ALL' : 'INSTALLATION')}
                                        sx={{
                                            fontWeight: 600, fontSize: '0.75rem',
                                            backgroundColor: serviceTypeFilter === 'INSTALLATION' ? 'rgba(16,185,129,0.15)' : 'transparent',
                                            color: serviceTypeFilter === 'INSTALLATION' ? '#10B981' : '#64748B',
                                            border: `1px solid ${serviceTypeFilter === 'INSTALLATION' ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
                                        }}
                                    />
                                </Box>

                                {/* Tech Filters */}
                                <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                                    <Chip
                                        icon={<UnassignedIcon sx={{ fontSize: 14 }} />}
                                        label={`Unassigned (${unassignedCount})`}
                                        size="small"
                                        onClick={() => setTechFilter(techFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
                                        sx={{
                                            fontWeight: 600, fontSize: '0.75rem',
                                            backgroundColor: techFilter === 'UNASSIGNED' ? 'rgba(239,68,68,0.15)' : 'transparent',
                                            color: techFilter === 'UNASSIGNED' ? '#EF4444' : '#64748B',
                                            border: `1px solid ${techFilter === 'UNASSIGNED' ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Ticket Cards List */}
            {filteredTickets.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <ReceiptLong sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
                    <Typography color="text.secondary">
                        {search || statusFilter !== 'ALL' || serviceTypeFilter !== 'ALL' || techFilter !== 'ALL'
                            ? "No tickets match your filters."
                            : "No tickets found in the system."}
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filteredTickets.map(ticket => {
                        const techInfo = getTechInfo(ticket);
                        const priorityColor = getPriorityColor(ticket.priority);

                        return (
                            <Grid size={{ xs: 12 }} key={ticket.id}>
                                <Card sx={{
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': { border: '1px solid rgba(108,99,255,0.2)' },
                                    borderLeft: `4px solid ${priorityColor}`,
                                }}>
                                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 2 }}>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <Avatar sx={{
                                                    width: 44, height: 44,
                                                    bgcolor: ticket.service_type === 'INSTALLATION' ? 'rgba(16,185,129,0.15)' : 'rgba(108,99,255,0.15)',
                                                    color: ticket.service_type === 'INSTALLATION' ? '#10B981' : '#6C63FF',
                                                }}>
                                                    {ticket.service_type === 'INSTALLATION' ? <InstallIcon /> : <RepairIcon />}
                                                </Avatar>
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="h6" fontWeight={700} sx={{ color: '#E2E8F0', lineHeight: 1.2 }}>
                                                            {ticket.ticket_number}
                                                        </Typography>
                                                        <Chip
                                                            label={ticket.priority}
                                                            size="small"
                                                            sx={{
                                                                height: 20, fontSize: '0.65rem', fontWeight: 700,
                                                                bgcolor: `${priorityColor}15`, color: priorityColor,
                                                            }}
                                                        />
                                                        <Typography variant="caption" sx={{ color: '#475569', ml: 1 }}>
                                                            <AccessTime sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                                                            {formatRelative(ticket.created_at)}
                                                        </Typography>
                                                    </Box>
                                                    
                                                    <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#E2E8F0' }}>
                                                            <AccountCircle sx={{ fontSize: 16, color: '#94A3B8' }} />
                                                            <Typography variant="body2" fontWeight={600}>{ticket.customer?.name || 'Unknown'}</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#E2E8F0' }}>
                                                            <PhoneIcon sx={{ fontSize: 16, color: '#10B981' }} />
                                                            <Typography variant="body2">{ticket.customer?.mobile ? formatMobile(ticket.customer.mobile) : '—'}</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#E2E8F0' }}>
                                                            <Tv sx={{ fontSize: 16, color: '#00D9FF' }} />
                                                            <Typography variant="body2">{ticket.tv_brand} {ticket.tv_size ? `${ticket.tv_size}"` : ''} {ticket.tv_model || ''}</Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </Box>
                                            
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                                                <Chip
                                                    label={TICKET_STATUS_LABELS[ticket.status]}
                                                    size="small"
                                                    sx={{
                                                        height: 24, fontSize: '0.7rem', fontWeight: 700,
                                                        backgroundColor: `${TICKET_STATUS_COLORS[ticket.status]}20`,
                                                        color: TICKET_STATUS_COLORS[ticket.status],
                                                    }}
                                                />
                                                {ticket.estimated_cost && (
                                                    <Typography variant="body2" fontWeight={700} sx={{ color: '#10B981' }}>
                                                        {formatCurrency(ticket.estimated_cost)} Est.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Status / Description / Routing info */}
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                                            <Box sx={{ flex: 1, minWidth: 200 }}>
                                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>ISSUE / REQUEST</Typography>
                                                <Typography variant="body2" sx={{ color: '#94A3B8', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    "{ticket.issue_description}"
                                                </Typography>
                                            </Box>

                                            <Box sx={{ borderLeft: { xs: 'none', md: '1px solid rgba(255,255,255,0.1)' }, pl: { xs: 0, md: 2 } }}>
                                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>ROUTING & DISPATCH</Typography>
                                                {techInfo ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', fontWeight: 700, bgcolor: TECH_STATUS_COLORS[techInfo.techStatus] + '30', color: TECH_STATUS_COLORS[techInfo.techStatus] }}>
                                                            {techInfo.initial}
                                                        </Avatar>
                                                        <Typography variant="body2" fontWeight={600} sx={{ color: '#E2E8F0' }}>
                                                            {techInfo.name}
                                                        </Typography>
                                                        <Chip
                                                            label={TECH_STATUS_LABELS[techInfo.techStatus]}
                                                            size="small"
                                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: TECH_STATUS_COLORS[techInfo.techStatus] + '20', color: TECH_STATUS_COLORS[techInfo.techStatus] }}
                                                        />
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF4444' }} />
                                                        <Typography variant="body2" fontWeight={600} sx={{ color: '#EF4444' }}>
                                                            Unassigned
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>

                                            <Button
                                                variant="outlined"
                                                onClick={() => navigate(`/tickets/${ticket.id}`)}
                                                sx={{
                                                    ml: { xs: 0, md: 'auto' },
                                                    borderRadius: 2, textTransform: 'none',
                                                    borderColor: 'rgba(108,99,255,0.5)', color: '#6C63FF',
                                                    '&:hover': { borderColor: '#6C63FF', bgcolor: 'rgba(108,99,255,0.08)' }
                                                }}
                                            >
                                                Manage Ticket
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
};

export default TicketListPage;
