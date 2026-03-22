import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, Button, Stepper,
    Step, StepLabel, TextField, MenuItem, Divider,
    IconButton, Tabs, Tab, Table, TableBody, TableCell, TableRow,
    TableHead, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Tooltip,
} from '@mui/material';
import {
    ArrowBack, Phone, LocationOn, Add, Delete,
    WhatsApp, Receipt, NoteAdd, Map, Star, Download,
    Build as RepairIcon, InstallDesktop as InstallIcon,
    Check, DoneAll,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
    Ticket, TicketNote, Quotation, QuotationItem, Invoice,
    TICKET_STATUS_ORDER, INSTALLATION_STATUS_ORDER,
    TICKET_STATUS_LABELS, TICKET_STATUS_COLORS,
    TicketStatus, Technician,
} from '../../types/database';
import { formatDateTime, formatRelative, formatCurrency } from '../../utils/formatters';
import { triggerStatusWhatsApp, getAvailableNextStatuses } from '../../utils/statusUpdates';
import { generatePDF } from '../../utils/pdfGenerator';
import { sendInteraktMessage } from '../../utils/interakt';

const TicketDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [notes, setNotes] = useState<TicketNote[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [noteDialogOpen, setNoteDialogOpen] = useState(false);
    const [noteType, setNoteType] = useState<TicketNote['note_type']>('FOLLOW_UP');
    const [noteContent, setNoteContent] = useState('');
    const [quotDialogOpen, setQuotDialogOpen] = useState(false);
    const [quotItems, setQuotItems] = useState<QuotationItem[]>([{ name: '', qty: 1, unit_price: 0, total: 0 }]);
    const [labourCharge, setLabourCharge] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [invDialogOpen, setInvDialogOpen] = useState(false);
    const [invAmount, setInvAmount] = useState(0);
    const [invMethod, setInvMethod] = useState<Invoice['payment_method']>('CASH');

    // Warranty state
    const [warrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
    const [warrantyMonths, setWarrantyMonths] = useState(0);

    // Technician assignment state
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [selectedTechId, setSelectedTechId] = useState<string>('');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            supabase.from('tickets').select('*, customer:customers(*)').eq('id', id).single(),
            supabase.from('ticket_notes').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
            supabase.from('quotations').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
            supabase.from('invoices').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
            supabase.from('technicians').select('*').eq('status', 'ACTIVE').order('name'),
        ]).then(async ([t, n, q, i, techRes]) => {
            if (t.data) {
                setTicket(t.data as Ticket);
                setSelectedTechId((t.data as Ticket).assigned_technician_id || '');
            }
            if (n.data) {
                const fetchedNotes = n.data as TicketNote[];
                setNotes(fetchedNotes);
                
                // Mark unread technician notes as read by admin
                const unreadTechNotes = fetchedNotes.filter(note => note.sender_type === 'TECHNICIAN' && !note.is_read);
                if (unreadTechNotes.length > 0) {
                    await supabase.from('ticket_notes')
                        .update({ is_read: true })
                        .in('id', unreadTechNotes.map(un => un.id));
                }
            }
            if (q.data) setQuotations(q.data as Quotation[]);
            if (i.data) setInvoices(i.data as Invoice[]);
            if (techRes.data) setTechnicians(techRes.data as Technician[]);
            setLoading(false);
        });

        // Real-time subscription for notes AND ticket status changes
        const channel = supabase.channel(`ticket_detail_${id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'ticket_notes',
                filter: `ticket_id=eq.${id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newNote = payload.new as TicketNote;
                    setNotes(prev => {
                        if (prev.some(n => n.id === newNote.id)) return prev;
                        // Mark as read immediately if it's from Tech
                        if (newNote.sender_type === 'TECHNICIAN' && !newNote.is_read) {
                            supabase.from('ticket_notes').update({ is_read: true }).eq('id', newNote.id).then();
                            newNote.is_read = true;
                        }
                        return [newNote, ...prev];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    const updatedNote = payload.new as TicketNote;
                    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tickets',
                filter: `id=eq.${id}`
            }, (payload) => {
                // Auto-refresh ticket status when Technician/Transporter updates it
                const updated = payload.new as any;
                setTicket(prev => prev ? { ...prev, ...updated } : prev);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id]);

    const isInstall = ticket?.service_type === 'INSTALLATION';
    const statusOrder = isInstall ? INSTALLATION_STATUS_ORDER : TICKET_STATUS_ORDER;
    const currentStep = ticket ? statusOrder.indexOf(ticket.status) : 0;

    const changeStatus = async (s: TicketStatus, specificWarrantyMonths?: number) => {
        if (!ticket) return;

        // Intercept CLOSED status to ask for Warranty details
        if (s === 'CLOSED' && specificWarrantyMonths === undefined) {
            setWarrantyDialogOpen(true);
            return;
        }

        const updateData: any = { 
            status: s, 
            updated_at: new Date().toISOString() 
        };

        if (s === 'CLOSED' && specificWarrantyMonths !== undefined) {
            updateData.warranty_months = specificWarrantyMonths;
            if (specificWarrantyMonths > 0) {
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + specificWarrantyMonths);
                updateData.warranty_expiry_date = expiry.toISOString();
            } else {
                updateData.warranty_expiry_date = null;
            }
        }

        const { data } = await supabase.from('tickets')
            .update(updateData)
            .eq('id', ticket.id).select('*, customer:customers(*)').single();
            
        if (data) {
            setTicket(data as Ticket);

            // Send WhatsApp notification to customer (Unified Flow)
            const latestQuotTotal = quotations.length > 0
                ? quotations[0].total
                : undefined;
            await triggerStatusWhatsApp(data as Ticket, s, latestQuotTotal);
        }
    };

    const nextStatuses = (): TicketStatus[] => {
        return getAvailableNextStatuses(ticket);
    };

    const addNote = async () => {
        if (!id || !noteContent.trim() || !ticket) return;
        const { data } = await supabase.from('ticket_notes')
            .insert({ ticket_id: id, note_type: noteType, content: noteContent.trim(), sender_type: 'ADMIN', is_read: false }).select().single();
        if (data) {
            setNotes(p => [data as TicketNote, ...p]);
            
            // Send push notification to assigned Tech
            if (selectedTechId) {
                const assignedTech = technicians.find(t => t.id === selectedTechId);
                if (assignedTech?.user_id) {
                    supabase.functions.invoke('send-push-notification', {
                        body: {
                            title: `📝 Note from Admin on Ticket #${ticket.ticket_number}`,
                            body: `Admin: "${noteContent.substring(0, 50)}${noteContent.length > 50 ? '...' : ''}"`,
                            url: `/tech/${id}`,
                            target_user_ids: [assignedTech.user_id],
                            event_type: 'ADMIN_NOTE',
                            source_id: id,
                            source_table: 'ticket_notes',
                            target_role: 'TECHNICIAN',
                            target_user_name: assignedTech.name || 'Technician'
                        }
                    }).catch(console.error);
                }
            }
        }
        setNoteContent(''); setNoteDialogOpen(false);
    };

    const addQuotation = async () => {
        if (!id) return;
        const total = quotItems.reduce((s, i) => s + i.total, 0) + labourCharge - discount;
        const { data } = await supabase.from('quotations')
            .insert({ ticket_id: id, items: quotItems, labour_charge: labourCharge, discount, total, status: 'DRAFT' }).select().single();
        if (data) setQuotations(p => [data as Quotation, ...p]);
        setQuotDialogOpen(false);
    };

    const addInvoice = async () => {
        if (!id) return;
        const { data } = await supabase.from('invoices')
            .insert({ ticket_id: id, quotation_id: quotations[0]?.id || null, amount: invAmount, amount_paid: invAmount, payment_method: invMethod, payment_status: 'PAID' }).select().single();
        if (data) setInvoices(p => [data as Invoice, ...p]);
        setInvDialogOpen(false);
    };

    const updateQuotItem = (i: number, f: keyof QuotationItem, v: any) => {
        setQuotItems(p => { const u = [...p]; u[i] = { ...u[i], [f]: v }; u[i].total = u[i].qty * u[i].unit_price; return u; });
    };

    const handleDownloadPDF = (type: 'QUOTATION' | 'INVOICE', dataObj?: any) => {
        if (!ticket || !ticket.customer) return;
        try {
            const doc = generatePDF({
                type,
                ticket,
                customer: ticket.customer,
                quotation: type === 'QUOTATION' ? dataObj : undefined,
                invoice: type === 'INVOICE' ? dataObj : undefined
            });
            const filename = `${type}_${ticket.ticket_number}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
        } catch (e) {
            console.error('Failed to generate PDF', e);
            alert('Failed to generate PDF document.');
        }
    };

    const whatsappText = () => {
        if (!ticket || !quotations[0]) return '';
        const q = quotations[0];
        return `*Jamestronic TV Repair*\n📋 Quotation: ${ticket.ticket_number}\nTV: ${ticket.tv_brand} ${ticket.tv_model || ''}\nIssue: ${ticket.issue_description}\n\n*Items:*\n${(q.items as QuotationItem[]).map((it, i) => `${i + 1}. ${it.name} — ${formatCurrency(it.total)}`).join('\n')}\n\nLabour: ${formatCurrency(q.labour_charge)}${q.discount > 0 ? `\nDiscount: -${formatCurrency(q.discount)}` : ''}\n*Total: ${formatCurrency(q.total)}*\n\n— Jamestronic, Manikonda`;
    };

    const whatsappReviewText = () => {
        if (!ticket?.customer) return '';
        const text = `Hi ${ticket.customer.name}, thank you for choosing Jamestronic TV Repair & Installation! \n\nIf you're happy with our service, please take 1 minute to leave us a 5-star review on Google. It really helps our local business grow!\n\n⭐️ Leave your review here: https://g.page/r/CaPPTdE0rY3FEBE/review\n\nThank you,\nJamestronic Team, Manikonda`;
        return `https://wa.me/91${ticket.customer.mobile}?text=${encodeURIComponent(text)}`;
    };

    const noteColor = (t: string) => ({ DIAGNOSIS: '#6C63FF', FOLLOW_UP: '#F59E0B', INTERNAL: '#94A3B8', CUSTOMER_UPDATE: '#10B981' }[t] || '#64748B');

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
    if (!ticket) return <Typography>Ticket not found</Typography>;

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <IconButton onClick={() => navigate('/admin/tickets')} sx={{ color: '#94A3B8' }}><ArrowBack /></IconButton>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="h5" fontWeight={700}>{ticket.ticket_number}</Typography>
                        <Chip
                            icon={ticket.service_type === 'INSTALLATION'
                                ? <InstallIcon sx={{ fontSize: '16px !important' }} />
                                : <RepairIcon sx={{ fontSize: '16px !important' }} />}
                            label={ticket.service_type === 'INSTALLATION' ? 'Installation' : 'Repair'}
                            sx={{
                                backgroundColor: ticket.service_type === 'INSTALLATION' ? 'rgba(16,185,129,0.15)' : 'rgba(108,99,255,0.12)',
                                color: ticket.service_type === 'INSTALLATION' ? '#10B981' : '#6C63FF',
                                fontWeight: 700,
                                '& .MuiChip-icon': { ml: 0.3 },
                            }}
                        />
                        <Chip label={TICKET_STATUS_LABELS[ticket.status]} sx={{ backgroundColor: `${TICKET_STATUS_COLORS[ticket.status]}20`, color: TICKET_STATUS_COLORS[ticket.status], fontWeight: 600 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">Created {formatRelative(ticket.created_at)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {ticket.status === 'CLOSED' && (
                        <Button
                            variant="contained"
                            size="small"
                            component="a"
                            href={whatsappReviewText()}
                            target="_blank"
                            startIcon={<Star />}
                            sx={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#fff' }}
                        >
                            Request Google Review
                        </Button>
                    )}
                    {nextStatuses().map(s => (
                        <Button key={s} variant={s === 'CLOSED' ? 'outlined' : 'contained'} size="small" onClick={() => changeStatus(s)}
                            sx={s === 'CLOSED' ? { borderColor: '#6B728040', color: '#6B7280' } : {}}>
                            → {TICKET_STATUS_LABELS[s]}
                        </Button>
                    ))}
                </Box>
            </Box>

            <Card sx={{ mb: 3, overflow: 'auto' }}>
                <CardContent sx={{ py: 2 }}>
                    <Stepper activeStep={currentStep} alternativeLabel sx={{ minWidth: isInstall ? 500 : 800 }}>
                        {statusOrder.map((s, i) => (
                            <Step key={s} completed={i < currentStep}>
                                <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.65rem', color: i <= currentStep ? TICKET_STATUS_COLORS[s] : '#4B5563', fontWeight: i === currentStep ? 700 : 400 }, '& .MuiStepIcon-root': { color: i <= currentStep ? TICKET_STATUS_COLORS[s] : '#374151' } }}>
                                    {TICKET_STATUS_LABELS[s]}
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </CardContent>
            </Card>

            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Customer</Typography>
                            <Typography variant="body1" fontWeight={600}>{ticket.customer?.name}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <Phone sx={{ fontSize: 14, color: '#10B981' }} />
                                <Typography variant="body2" component="a" href={`tel:${ticket.customer?.mobile}`} sx={{ color: '#00D9FF', textDecoration: 'none' }}>{ticket.customer?.mobile}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.5 }}>
                                <LocationOn sx={{ fontSize: 14, color: '#F59E0B', mt: 0.3 }} />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" color="text.secondary">{ticket.customer?.address}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                        <Tooltip title="Search on Google Maps">
                                            <IconButton size="small" component="a" href={`https://maps.google.com/?q=${encodeURIComponent(ticket.customer?.address + (ticket.customer?.area ? ' ' + ticket.customer?.area : ''))}`} target="_blank" sx={{ color: '#F59E0B', p: 0.25 }}><Map sx={{ fontSize: 14 }} /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="Request location via WhatsApp">
                                            <IconButton size="small" component="a" href={`https://wa.me/91${ticket.customer?.mobile}?text=${encodeURIComponent('Please share your exact location on WhatsApp so our technician can reach you easily.')}`} target="_blank" sx={{ color: '#25D366', p: 0.25 }}><WhatsApp sx={{ fontSize: 14 }} /></IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>TV Details</Typography>
                            <Typography variant="body1" fontWeight={600}>{ticket.tv_brand} {ticket.tv_model || ''}</Typography>
                            {ticket.tv_size && <Typography variant="body2" color="text.secondary">Size: {ticket.tv_size}</Typography>}
                            {ticket.time_slot && <Typography variant="body2" color="success.main" fontWeight={600}>Time Slot: {ticket.time_slot}</Typography>}
                            <Divider sx={{ my: 1.5, borderColor: 'rgba(108,99,255,0.1)' }} />
                            <Typography variant="caption" color="text.secondary">
                                {ticket.service_type === 'INSTALLATION' ? 'Installation Requirements' : 'Issue'}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.3 }}>{ticket.issue_description}</Typography>
                            {ticket.service_type !== 'INSTALLATION' && ticket.diagnosed_issue && (<><Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Diagnosis</Typography><Typography variant="body2" sx={{ mt: 0.3, color: '#10B981' }}>{ticket.diagnosed_issue}</Typography></>)}
                            {ticket.estimated_cost != null && ticket.estimated_cost > 0 && (
                                <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, backgroundColor: 'rgba(16,185,129,0.08)' }}>
                                    <Typography variant="caption" color="text.secondary">Estimated Cost</Typography>
                                    <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(ticket.estimated_cost)}</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Technician Assignment Card */}
                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Assign Technician</Typography>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                value={selectedTechId}
                                onChange={async (e) => {
                                    const techId = e.target.value;
                                    setSelectedTechId(techId);
                                    if (!id) return;
                                    // Update ticket
                                    await supabase.from('tickets').update({ assigned_technician_id: techId || null }).eq('id', id);
                                    // Create tech log if assigning (not unassigning)
                                    if (techId) {
                                        await supabase.from('ticket_technician_log').insert({
                                            ticket_id: id,
                                            technician_id: techId,
                                            tech_status: 'ASSIGNED',
                                        });

                                        const assignedTech = technicians.find(t => t.id === techId);

                                        // Trigger WhatsApp Notification to Customer
                                        if (ticket.customer?.mobile) {
                                            sendInteraktMessage({
                                                phoneNumber: ticket.customer.mobile,
                                                templateName: 'technician_assigned_alert',
                                                bodyValues: [
                                                    ticket.customer.name || 'Customer',
                                                    ticket.ticket_number || '',
                                                    assignedTech?.name || 'a designated technician',
                                                    assignedTech?.mobile || ''
                                                ]
                                            }).catch(console.error);
                                        }

                                        // Trigger Push Notification to Technician
                                        if (assignedTech?.user_id) {
                                            supabase.functions.invoke('send-push-notification', {
                                                body: {
                                                    title: "🔧 New Ticket Assigned",
                                                    body: `You have been assigned to Ticket #${ticket.ticket_number || id.slice(0, 8)}. Tap to view details.`,
                                                    url: "/tech",
                                                    target_user_ids: [assignedTech.user_id],
                                                    event_type: 'TICKET_ASSIGNED',
                                                    source_id: id,
                                                    source_table: 'tickets',
                                                    target_role: 'TECHNICIAN',
                                                    target_user_name: assignedTech.name || 'Technician'
                                                }
                                            }).catch(console.error);
                                        }
                                    }
                                    setTicket(prev => prev ? { ...prev, assigned_technician_id: techId || null } : prev);
                                }}
                                sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
                            >
                                <MenuItem value=""><em>Unassigned</em></MenuItem>
                                {technicians.map(t => (
                                    <MenuItem key={t.id} value={t.id}>{t.name} ({t.specialization || 'All'})</MenuItem>
                                ))}
                            </TextField>
                            {selectedTechId && (
                                <Chip
                                    label={`Assigned: ${technicians.find(t => t.id === selectedTechId)?.name || 'Unknown'}`}
                                    size="small"
                                    sx={{ mt: 1, bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF', fontWeight: 600 }}
                                />
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                    <Card>
                        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: '1px solid rgba(108,99,255,0.1)', '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: '0.85rem' } }}>
                            <Tab label={`Notes (${notes.length})`} />
                            {!isInstall && <Tab label={`Quotations (${quotations.length})`} />}
                            <Tab label={`Invoices (${invoices.length})`} />
                        </Tabs>
                        <CardContent>
                            {activeTab === 0 && (<Box>
                                <Button startIcon={<NoteAdd />} onClick={() => setNoteDialogOpen(true)} variant="outlined" size="small" sx={{ mb: 2, borderColor: 'rgba(108,99,255,0.3)', color: '#6C63FF' }}>Add Note</Button>
                                {notes.map(n => (<Box key={n.id} sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(17,24,39,0.5)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip label={n.note_type.replace('_', ' ')} size="small" sx={{ backgroundColor: `${noteColor(n.note_type)}15`, color: noteColor(n.note_type), fontWeight: 600, fontSize: '0.65rem' }} />
                                            {n.sender_type && (
                                                <Typography variant="caption" sx={{ color: n.sender_type === 'ADMIN' ? 'primary.main' : n.sender_type === 'TECHNICIAN' ? 'warning.main' : 'text.secondary', fontWeight: 600 }}>
                                                    {n.sender_type === 'ADMIN' ? 'Admin' : n.sender_type === 'TECHNICIAN' ? 'Technician' : 'Customer'}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">{formatDateTime(n.created_at)}</Typography>
                                            {n.sender_type === 'ADMIN' && (
                                                n.is_read ? <DoneAll sx={{ fontSize: 16, color: '#3b82f6' }} /> : <Check sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            )}
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{n.content}</Typography>
                                </Box>))}
                                {notes.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No notes yet.</Typography>}
                            </Box>)}
                            {!isInstall && activeTab === 1 && (<Box>
                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    <Button startIcon={<Add />} onClick={() => setQuotDialogOpen(true)} variant="outlined" size="small" sx={{ borderColor: 'rgba(108,99,255,0.3)', color: '#6C63FF' }}>Create Quotation</Button>
                                    {quotations.length > 0 && <Tooltip title="Copy for WhatsApp"><IconButton size="small" onClick={() => navigator.clipboard.writeText(whatsappText())} sx={{ color: '#25D366' }}><WhatsApp /></IconButton></Tooltip>}
                                </Box>
                                {quotations.map(q => (<Box key={q.id} sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(17,24,39,0.5)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                                        <Button size="small" startIcon={<Download />} onClick={() => handleDownloadPDF('QUOTATION', q)} sx={{ color: '#6C63FF' }}>Download PDF</Button>
                                    </Box>
                                    <Table size="small"><TableHead><TableRow><TableCell>Item</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Price</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
                                        <TableBody>{(q.items as QuotationItem[]).map((it, i) => (<TableRow key={i}><TableCell>{it.name}</TableCell><TableCell align="right">{it.qty}</TableCell><TableCell align="right">{formatCurrency(it.unit_price)}</TableCell><TableCell align="right">{formatCurrency(it.total)}</TableCell></TableRow>))}
                                            <TableRow><TableCell colSpan={3} align="right"><strong>Labour</strong></TableCell><TableCell align="right">{formatCurrency(q.labour_charge)}</TableCell></TableRow>
                                            <TableRow><TableCell colSpan={3} align="right"><strong>Total</strong></TableCell><TableCell align="right"><Typography fontWeight={700} color="primary">{formatCurrency(q.total)}</Typography></TableCell></TableRow></TableBody></Table>
                                </Box>))}
                                {quotations.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No quotations yet.</Typography>}
                            </Box>)}
                            {activeTab === (isInstall ? 1 : 2) && (<Box>
                                <Button startIcon={<Receipt />} onClick={() => { setInvAmount(quotations[0]?.total || ticket.estimated_cost || 0); setInvDialogOpen(true); }} variant="outlined" size="small" sx={{ mb: 2, borderColor: 'rgba(108,99,255,0.3)', color: '#6C63FF' }}>Create Invoice</Button>
                                {invoices.map(inv => (<Box key={inv.id} sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(17,24,39,0.5)' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                                        <Button size="small" startIcon={<Download />} onClick={() => handleDownloadPDF('INVOICE', inv)} sx={{ color: '#6C63FF' }}>Download PDF</Button>
                                    </Box>
                                    <Grid container spacing={2}><Grid size={{ xs: 4 }}><Typography variant="caption" color="text.secondary">Amount</Typography><Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(inv.amount)}</Typography></Grid>
                                        <Grid size={{ xs: 4 }}><Typography variant="caption" color="text.secondary">Method</Typography><Typography variant="body2" fontWeight={600}>{inv.payment_method}</Typography></Grid>
                                        <Grid size={{ xs: 4 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={inv.payment_status} size="small" color={inv.payment_status === 'PAID' ? 'success' : 'warning'} /></Grid></Grid>
                                </Box>))}
                                {invoices.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No invoices yet.</Typography>}
                            </Box>)}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Dialogs */}
            <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#111827', backgroundImage: 'none' } }}>
                <DialogTitle>Add Note</DialogTitle>
                <DialogContent>
                    <TextField select fullWidth label="Note Type" value={noteType} onChange={e => setNoteType(e.target.value as any)} sx={{ mt: 1, mb: 2 }}>
                        <MenuItem value="DIAGNOSIS">Diagnosis</MenuItem><MenuItem value="FOLLOW_UP">Follow Up</MenuItem><MenuItem value="INTERNAL">Internal</MenuItem><MenuItem value="CUSTOMER_UPDATE">Customer Update</MenuItem>
                    </TextField>
                    <TextField fullWidth multiline rows={4} label="Content" value={noteContent} onChange={e => setNoteContent(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}><Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={addNote} disabled={!noteContent.trim()}>Add</Button></DialogActions>
            </Dialog>

            <Dialog open={quotDialogOpen} onClose={() => setQuotDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: '#111827', backgroundImage: 'none' } }}>
                <DialogTitle>Create Quotation</DialogTitle>
                <DialogContent>
                    {quotItems.map((item, i) => (
                        <Grid container spacing={1} key={i} sx={{ mt: i === 0 ? 1 : 0, mb: 1 }}>
                            <Grid size={{ xs: 5 }}><TextField fullWidth size="small" label="Part" value={item.name} onChange={e => updateQuotItem(i, 'name', e.target.value)} /></Grid>
                            <Grid size={{ xs: 2 }}><TextField fullWidth size="small" label="Qty" type="number" value={item.qty} onChange={e => updateQuotItem(i, 'qty', parseInt(e.target.value) || 0)} /></Grid>
                            <Grid size={{ xs: 2 }}><TextField fullWidth size="small" label="₹" type="number" value={item.unit_price} onChange={e => updateQuotItem(i, 'unit_price', parseFloat(e.target.value) || 0)} /></Grid>
                            <Grid size={{ xs: 2 }}><TextField fullWidth size="small" label="Total" value={formatCurrency(item.total)} InputProps={{ readOnly: true }} /></Grid>
                            <Grid size={{ xs: 1 }} sx={{ display: 'flex', alignItems: 'center' }}><IconButton size="small" onClick={() => setQuotItems(p => p.filter((_, x) => x !== i))} disabled={quotItems.length <= 1}><Delete fontSize="small" /></IconButton></Grid>
                        </Grid>
                    ))}
                    <Button size="small" startIcon={<Add />} onClick={() => setQuotItems(p => [...p, { name: '', qty: 1, unit_price: 0, total: 0 }])}>Add Item</Button>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Labour ₹" type="number" value={labourCharge} onChange={e => setLabourCharge(parseFloat(e.target.value) || 0)} /></Grid>
                        <Grid size={{ xs: 4 }}><TextField fullWidth label="Discount ₹" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} /></Grid>
                        <Grid size={{ xs: 4 }}><Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(16,185,129,0.08)', textAlign: 'center' }}><Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(quotItems.reduce((s, i) => s + i.total, 0) + labourCharge - discount)}</Typography></Box></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}><Button onClick={() => setQuotDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={addQuotation}>Create</Button></DialogActions>
            </Dialog>

            <Dialog open={invDialogOpen} onClose={() => setInvDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#111827', backgroundImage: 'none' } }}>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Amount ₹" type="number" value={invAmount} onChange={e => setInvAmount(parseFloat(e.target.value) || 0)} sx={{ mt: 1, mb: 2 }} />
                    <TextField select fullWidth label="Payment Method" value={invMethod} onChange={e => setInvMethod(e.target.value as any)}>
                        <MenuItem value="CASH">Cash</MenuItem><MenuItem value="UPI">UPI</MenuItem><MenuItem value="CARD">Card</MenuItem><MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}><Button onClick={() => setInvDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={addInvoice}>Create</Button></DialogActions>
            </Dialog>

            {/* Warranty Dialog */}
            <Dialog open={warrantyDialogOpen} onClose={() => setWarrantyDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: '#111827', backgroundImage: 'none' } }}>
                <DialogTitle>Confirm Warranty Period</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        You are about to close this ticket. Before doing so, please select the warranty period provided to the customer for this repair.
                    </Typography>
                    <TextField 
                        select 
                        fullWidth 
                        label="Warranty Duration" 
                        value={warrantyMonths} 
                        onChange={e => setWarrantyMonths(Number(e.target.value))}
                    >
                        <MenuItem value={0}>No Warranty (0 months)</MenuItem>
                        <MenuItem value={1}>1 Month</MenuItem>
                        <MenuItem value={3}>3 Months</MenuItem>
                        <MenuItem value={6}>6 Months</MenuItem>
                        <MenuItem value={12}>1 Year</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setWarrantyDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={() => {
                        setWarrantyDialogOpen(false);
                        changeStatus('CLOSED', warrantyMonths);
                    }} sx={{ backgroundColor: '#10B981', '&:hover': { backgroundColor: '#059669' } }}>
                        Confirm & Close Ticket
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TicketDetailPage;
