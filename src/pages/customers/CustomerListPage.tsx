import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, TextField, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, IconButton, Skeleton,
} from '@mui/material';
import { Search, Phone, Add, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Customer } from '../../types/database';
import { formatDate, formatMobile } from '../../utils/formatters';

const CustomerListPage: React.FC = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
            if (data) {
                setCustomers(data as Customer[]);
                // Get ticket counts per customer
                const { data: tickets } = await supabase.from('tickets').select('customer_id');
                if (tickets) {
                    const counts: Record<string, number> = {};
                    tickets.forEach((t: any) => { counts[t.customer_id] = (counts[t.customer_id] || 0) + 1; });
                    setTicketCounts(counts);
                }
            }
            setLoading(false);
        };
        fetch();
    }, []);

    const filtered = customers.filter(c => {
        const s = search.toLowerCase();
        return !search || c.name.toLowerCase().includes(s) || c.mobile.includes(search) || c.address.toLowerCase().includes(s);
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Customers</Typography>
                    <Typography variant="body2" color="text.secondary">{customers.length} total customers</Typography>
                </Box>
            </Box>

            <Card sx={{ mb: 2.5 }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <TextField fullWidth size="small" placeholder="Search by name, mobile, address..." value={search} onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#64748B' }} /></InputAdornment> }} />
                </CardContent>
            </Card>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Mobile</TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Address</TableCell>
                                <TableCell>Tickets</TableCell>
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Since</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? [...Array(5)].map((_, i) => (
                                <TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                            )) : filtered.length > 0 ? filtered.map(c => (
                                <TableRow key={c.id} hover onClick={() => navigate(`/customers/${c.id}`)} sx={{ cursor: 'pointer' }}>
                                    <TableCell><Typography variant="body2" fontWeight={600}>{c.name}</Typography></TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Phone sx={{ fontSize: 14, color: '#10B981' }} />
                                            <Typography variant="body2">{formatMobile(c.mobile)}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 250 }}>{c.address}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={ticketCounts[c.id] || 0} size="small" sx={{ backgroundColor: 'rgba(108,99,255,0.12)', color: '#6C63FF', fontWeight: 700, minWidth: 32 }} />
                                    </TableCell>
                                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                        <Typography variant="caption" color="text.secondary">{formatDate(c.created_at)}</Typography>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary">No customers found</Typography>
                                </TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default CustomerListPage;
