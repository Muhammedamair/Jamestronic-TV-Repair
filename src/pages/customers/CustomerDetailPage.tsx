import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, IconButton,
    Table, TableBody, TableCell, TableHead, TableRow, Button, CircularProgress, Tooltip
} from '@mui/material';
import { ArrowBack, Phone, LocationOn, Add, ConfirmationNumber, Map, WhatsApp, Star } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Customer, Ticket, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '../../types/database';
import { formatDate, formatRelative, formatMobile } from '../../utils/formatters';

const CustomerDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            supabase.from('customers').select('*').eq('id', id).single(),
            supabase.from('tickets').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        ]).then(([c, t]) => {
            if (c.data) setCustomer(c.data as Customer);
            if (t.data) setTickets(t.data as Ticket[]);
            setLoading(false);
        });
    }, [id]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
    if (!customer) return <Typography>Customer not found</Typography>;

    const whatsappReviewText = () => {
        if (!customer) return '';
        const text = `Hi ${customer.name}, thank you for choosing Jamestronic TV Repair & Installation! \n\nIf you're happy with our service, please take 1 minute to leave us a 5-star review on Google. It really helps our local business grow!\n\n⭐️ Leave your review here: https://g.page/r/CaPPTdE0rY3FEBE/review\n\nThank you,\nJamestronic Team, Manikonda`;
        return `https://wa.me/91${customer.mobile}?text=${encodeURIComponent(text)}`;
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <IconButton onClick={() => navigate('/customers')} sx={{ color: '#94A3B8' }}><ArrowBack /></IconButton>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="h5" fontWeight={700}>{customer.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Customer since {formatDate(customer.created_at)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        size="small"
                        component="a"
                        href={whatsappReviewText()}
                        target="_blank"
                        startIcon={<Star />}
                        sx={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#fff' }}
                    >
                        Request Review
                    </Button>
                    <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/tickets/new')} size="small">
                        New Ticket
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Contact Info</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Phone sx={{ color: '#10B981', fontSize: 18 }} />
                                <Typography variant="body2" component="a" href={`tel:${customer.mobile}`} sx={{ color: '#00D9FF', textDecoration: 'none' }}>
                                    {formatMobile(customer.mobile)}
                                </Typography>
                            </Box>
                            {customer.alt_mobile && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Phone sx={{ color: '#64748B', fontSize: 18 }} />
                                    <Typography variant="body2" color="text.secondary">{formatMobile(customer.alt_mobile)}</Typography>
                                </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <LocationOn sx={{ color: '#F59E0B', fontSize: 18, mt: 0.3 }} />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" color="text.secondary">{customer.address}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                        <Tooltip title="Search on Google Maps">
                                            <IconButton size="small" component="a" href={`https://maps.google.com/?q=${encodeURIComponent(customer.address + (customer.area ? ' ' + customer.area : ''))}`} target="_blank" sx={{ color: '#F59E0B', p: 0.5 }}><Map sx={{ fontSize: 16 }} /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="Request location via WhatsApp">
                                            <IconButton size="small" component="a" href={`https://wa.me/91${customer.mobile}?text=${encodeURIComponent('Please share your exact location on WhatsApp so our technician can reach you easily.')}`} target="_blank" sx={{ color: '#25D366', p: 0.5 }}><WhatsApp sx={{ fontSize: 16 }} /></IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                            {customer.area && (
                                <Chip label={customer.area} size="small" sx={{ mt: 1.5, backgroundColor: 'rgba(108,99,255,0.12)', color: '#6C63FF' }} />
                            )}
                        </CardContent>
                    </Card>
                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Stats</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">Total Tickets</Typography>
                                <Typography variant="h5" fontWeight={700} color="primary">{tickets.length}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Ticket History</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ticket #</TableCell>
                                        <TableCell>Brand</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Created</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tickets.map(t => (
                                        <TableRow key={t.id} hover onClick={() => navigate(`/tickets/${t.id}`)} sx={{ cursor: 'pointer' }}>
                                            <TableCell><Typography variant="body2" fontWeight={600} color="primary">{t.ticket_number}</Typography></TableCell>
                                            <TableCell>{t.tv_brand}</TableCell>
                                            <TableCell>
                                                <Chip label={TICKET_STATUS_LABELS[t.status]} size="small"
                                                    sx={{ backgroundColor: `${TICKET_STATUS_COLORS[t.status]}20`, color: TICKET_STATUS_COLORS[t.status], fontWeight: 600, fontSize: '0.65rem' }} />
                                            </TableCell>
                                            <TableCell><Typography variant="caption" color="text.secondary">{formatRelative(t.created_at)}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                    {tickets.length === 0 && (
                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No tickets yet</Typography></TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default CustomerDetailPage;
