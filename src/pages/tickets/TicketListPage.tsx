import React, { useState, useEffect } from 'react';
import {
    Box, Typography, TextField, Card, CardContent, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, InputAdornment,
    MenuItem, Grid, IconButton, Skeleton, Tooltip, Avatar,
} from '@mui/material';
import {
    Search as SearchIcon, Add as AddIcon, FilterList,
    Phone as PhoneIcon, ArrowForward,
    Build as RepairIcon, InstallDesktop as InstallIcon,
    Engineering as TechIcon, PersonOff as UnassignedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Ticket, TicketStatus, TicketServiceType, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, Technician, TechStatus } from '../../types/database';
import { formatRelative, formatCurrency } from '../../utils/formatters';

const statusFilters: { label: string; value: string; color: string }[] = [
    { label: 'All', value: 'ALL', color: '#F1F5F9' },
    { label: 'Open', value: 'OPEN', color: '#F59E0B' },
    { label: 'In Progress', value: 'IN_PROGRESS', color: '#00D9FF' },
    { label: 'Completed', value: 'COMPLETED', color: '#10B981' },
    { label: 'Closed', value: 'CLOSED', color: '#6B7280' },
];

const openStatuses: TicketStatus[] = ['CREATED', 'DIAGNOSED', 'PICKUP_SCHEDULED'];
const inProgressStatuses: TicketStatus[] = ['PICKED_UP', 'IN_REPAIR', 'QUOTATION_SENT', 'APPROVED', 'REPAIRED', 'DELIVERY_SCHEDULED'];
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

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
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
        fetchData();
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

    // Count stats for filter badge
    const unassignedCount = tickets.filter(t => !t.assigned_technician_id).length;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Tickets</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>
                <IconButton
                    onClick={() => navigate('/tickets/new')}
                    sx={{
                        background: 'linear-gradient(135deg, #6C63FF, #8B85FF)',
                        color: '#fff',
                        width: 44, height: 44,
                        '&:hover': { background: 'linear-gradient(135deg, #5A52E0, #7A74FF)' },
                    }}
                >
                    <AddIcon />
                </IconButton>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 2.5 }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search by ticket #, customer name, mobile, brand..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: '#64748B' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {statusFilters.map(sf => (
                                    <Chip
                                        key={sf.value}
                                        label={sf.label}
                                        size="small"
                                        onClick={() => setStatusFilter(sf.value)}
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            backgroundColor: statusFilter === sf.value ? `${sf.color}20` : 'transparent',
                                            color: statusFilter === sf.value ? sf.color : '#64748B',
                                            border: `1px solid ${statusFilter === sf.value ? `${sf.color}40` : 'rgba(148,163,184,0.15)'}`,
                                            '&:hover': { backgroundColor: `${sf.color}15` },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Grid>

                        {/* Service Type Filter Row */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                <Chip
                                    label="All Types"
                                    size="small"
                                    onClick={() => setServiceTypeFilter('ALL')}
                                    sx={{
                                        fontWeight: 600, fontSize: '0.75rem',
                                        backgroundColor: serviceTypeFilter === 'ALL' ? 'rgba(148,163,184,0.15)' : 'transparent',
                                        color: serviceTypeFilter === 'ALL' ? '#94A3B8' : '#64748B',
                                        border: `1px solid ${serviceTypeFilter === 'ALL' ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.15)'}`,
                                    }}
                                />
                                <Chip
                                    icon={<RepairIcon sx={{ fontSize: 14 }} />}
                                    label="Repair"
                                    size="small"
                                    onClick={() => setServiceTypeFilter('REPAIR')}
                                    sx={{
                                        fontWeight: 600, fontSize: '0.75rem',
                                        backgroundColor: serviceTypeFilter === 'REPAIR' ? 'rgba(108,99,255,0.15)' : 'transparent',
                                        color: serviceTypeFilter === 'REPAIR' ? '#6C63FF' : '#64748B',
                                        border: `1px solid ${serviceTypeFilter === 'REPAIR' ? 'rgba(108,99,255,0.3)' : 'rgba(148,163,184,0.15)'}`,
                                    }}
                                />
                                <Chip
                                    icon={<InstallIcon sx={{ fontSize: 14 }} />}
                                    label="Installation"
                                    size="small"
                                    onClick={() => setServiceTypeFilter('INSTALLATION')}
                                    sx={{
                                        fontWeight: 600, fontSize: '0.75rem',
                                        backgroundColor: serviceTypeFilter === 'INSTALLATION' ? 'rgba(16,185,129,0.15)' : 'transparent',
                                        color: serviceTypeFilter === 'INSTALLATION' ? '#10B981' : '#64748B',
                                        border: `1px solid ${serviceTypeFilter === 'INSTALLATION' ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.15)'}`,
                                    }}
                                />
                            </Box>
                        </Grid>

                        {/* Technician Filter Row */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                <TechIcon sx={{ fontSize: 16, color: '#64748B', mr: 0.5 }} />
                                <Chip
                                    label="All Techs"
                                    size="small"
                                    onClick={() => setTechFilter('ALL')}
                                    sx={{
                                        fontWeight: 600, fontSize: '0.75rem',
                                        backgroundColor: techFilter === 'ALL' ? 'rgba(148,163,184,0.15)' : 'transparent',
                                        color: techFilter === 'ALL' ? '#94A3B8' : '#64748B',
                                        border: `1px solid ${techFilter === 'ALL' ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.15)'}`,
                                    }}
                                />
                                <Chip
                                    icon={<UnassignedIcon sx={{ fontSize: 14 }} />}
                                    label={`Unassigned (${unassignedCount})`}
                                    size="small"
                                    onClick={() => setTechFilter('UNASSIGNED')}
                                    sx={{
                                        fontWeight: 600, fontSize: '0.75rem',
                                        backgroundColor: techFilter === 'UNASSIGNED' ? 'rgba(239,68,68,0.15)' : 'transparent',
                                        color: techFilter === 'UNASSIGNED' ? '#EF4444' : '#64748B',
                                        border: `1px solid ${techFilter === 'UNASSIGNED' ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.15)'}`,
                                    }}
                                />
                                {technicians.filter(t => t.status === 'ACTIVE').map(tech => (
                                    <Chip
                                        key={tech.id}
                                        avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.65rem', bgcolor: '#6C63FF' }}>{tech.name.charAt(0)}</Avatar>}
                                        label={tech.name}
                                        size="small"
                                        onClick={() => setTechFilter(tech.id)}
                                        sx={{
                                            fontWeight: 600, fontSize: '0.75rem',
                                            backgroundColor: techFilter === tech.id ? 'rgba(108,99,255,0.15)' : 'transparent',
                                            color: techFilter === tech.id ? '#6C63FF' : '#64748B',
                                            border: `1px solid ${techFilter === tech.id ? 'rgba(108,99,255,0.3)' : 'rgba(148,163,184,0.15)'}`,
                                        }}
                                    />
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Tickets Table */}
            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Ticket #</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Brand</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Assigned To</TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Priority</TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Est. Cost</TableCell>
                                <TableCell>Created</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(8)].map((_, j) => (
                                            <TableCell key={j}><Skeleton /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : filteredTickets.length > 0 ? (
                                filteredTickets.map(ticket => {
                                    const techInfo = getTechInfo(ticket);
                                    return (
                                        <TableRow
                                            key={ticket.id}
                                            hover
                                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                                            sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(108,99,255,0.04)' } }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Typography variant="body2" fontWeight={600} color="primary">
                                                        {ticket.ticket_number}
                                                    </Typography>
                                                    <Chip
                                                        label={ticket.service_type === 'INSTALLATION' ? 'Install' : 'Repair'}
                                                        size="small"
                                                        icon={ticket.service_type === 'INSTALLATION'
                                                            ? <InstallIcon sx={{ fontSize: '12px !important' }} />
                                                            : <RepairIcon sx={{ fontSize: '12px !important' }} />}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.6rem',
                                                            fontWeight: 700,
                                                            backgroundColor: ticket.service_type === 'INSTALLATION'
                                                                ? 'rgba(16,185,129,0.15)' : 'rgba(108,99,255,0.12)',
                                                            color: ticket.service_type === 'INSTALLATION'
                                                                ? '#10B981' : '#6C63FF',
                                                            '& .MuiChip-icon': { ml: 0.3 },
                                                        }}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>{ticket.customer?.name || '—'}</Typography>
                                                <Typography variant="caption" color="text.secondary">{ticket.customer?.mobile}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                                <Typography variant="body2">{ticket.tv_brand}</Typography>
                                                {ticket.tv_model && (
                                                    <Typography variant="caption" color="text.secondary">{ticket.tv_model}</Typography>
                                                )}
                                            </TableCell>
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
                                            {/* Assigned To Column */}
                                            <TableCell>
                                                {techInfo ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar
                                                            sx={{
                                                                width: 28, height: 28,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                bgcolor: TECH_STATUS_COLORS[techInfo.techStatus] + '30',
                                                                color: TECH_STATUS_COLORS[techInfo.techStatus],
                                                            }}
                                                        >
                                                            {techInfo.initial}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="caption" fontWeight={600} sx={{ display: 'block', lineHeight: 1.2 }}>
                                                                {techInfo.name}
                                                            </Typography>
                                                            <Chip
                                                                label={TECH_STATUS_LABELS[techInfo.techStatus]}
                                                                size="small"
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: '0.6rem',
                                                                    fontWeight: 700,
                                                                    backgroundColor: TECH_STATUS_COLORS[techInfo.techStatus] + '20',
                                                                    color: TECH_STATUS_COLORS[techInfo.techStatus],
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: '#64748B', fontStyle: 'italic' }}>
                                                        Unassigned
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                <Chip
                                                    label={ticket.priority}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: `${getPriorityColor(ticket.priority)}15`,
                                                        color: getPriorityColor(ticket.priority),
                                                        fontWeight: 600,
                                                        fontSize: '0.65rem',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                <Typography variant="body2">
                                                    {ticket.estimated_cost ? formatCurrency(ticket.estimated_cost) : '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatRelative(ticket.created_at)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary" sx={{ mb: 1 }}>No tickets found</Typography>
                                        <Chip
                                            label="Create First Ticket"
                                            onClick={() => navigate('/tickets/new')}
                                            sx={{
                                                backgroundColor: 'rgba(108,99,255,0.12)',
                                                color: '#6C63FF',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default TicketListPage;
