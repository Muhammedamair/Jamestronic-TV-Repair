import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, CircularProgress,
    Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Divider, CardMedia
} from '@mui/material';
import {
    ArrowBack, PlayArrow, CheckCircle, Cancel, ShoppingCart, NoteAdd, Timer,
    PhotoCamera, Delete as DeleteIcon, Check, DoneAll
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Ticket, TicketNote, TechStatus, TICKET_STATUS_LABELS } from '../../types/database';
import { triggerStatusWhatsApp } from '../../utils/statusUpdates';

const TECH_STATUS_LABELS: Record<TechStatus, string> = {
    ASSIGNED: 'Assigned to you',
    IN_PROGRESS: 'Repair In Progress',
    COMPLETED: 'Repair Completed',
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

const TechTicketDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [techLogId, setTechLogId] = useState<string | null>(null);
    const [techStatus, setTechStatus] = useState<TechStatus>('ASSIGNED');
    const [assignedAt, setAssignedAt] = useState<string | null>(null);
    const [notes, setNotes] = useState<TicketNote[]>([]);

    // Note dialog
    const [noteDialogOpen, setNoteDialogOpen] = useState(false);
    const [noteContent, setNoteContent] = useState('');

    // Part request dialog
    const [partDialogOpen, setPartDialogOpen] = useState(false);
    const [partForm, setPartForm] = useState({ part_name: '', description: '' });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!id || !user) return;
        const fetch = async () => {
            setLoading(true);
            // Get technician
            const { data: techData } = await supabase.from('technicians').select('id').eq('user_id', user.id).single();
            if (!techData) { setLoading(false); return; }

            // Get ticket WITH customer data (needed for WhatsApp notifications)
            const { data: ticketData } = await supabase.from('tickets').select('*, customer:customers(name, mobile)').eq('id', id).single();
            setTicket(ticketData);

            // Get tech log
            const { data: logData } = await supabase.from('ticket_technician_log')
                .select('*').eq('ticket_id', id).eq('technician_id', techData.id).order('created_at', { ascending: false }).limit(1).single();
            if (logData) {
                setTechLogId(logData.id);
                setTechStatus(logData.tech_status as TechStatus);
                setAssignedAt(logData.assigned_at);
            }

            // Get notes
            const { data: noteData } = await supabase.from('ticket_notes').select('*').eq('ticket_id', id).order('created_at', { ascending: false });
            if (noteData) {
                setNotes(noteData);
                // Mark unread admin notes as read
                const unreadAdminNotes = noteData.filter(n => n.sender_type === 'ADMIN' && !n.is_read);
                if (unreadAdminNotes.length > 0) {
                    await supabase.from('ticket_notes').update({ is_read: true }).in('id', unreadAdminNotes.map(un => un.id));
                }
            }

            setLoading(false);
        };
        fetch();

        // Real-time subscription for notes
        const channel = supabase.channel(`tech_ticket_notes_${id}`)
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
                        // Mark as read immediately if it's from Admin
                        if (newNote.sender_type === 'ADMIN' && !newNote.is_read) {
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
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id, user]);

    const updateTechStatus = async (newStatus: TechStatus) => {
        if (!techLogId) return;
        const updates: any = { tech_status: newStatus };
        if (newStatus === 'IN_PROGRESS') updates.started_at = new Date().toISOString();
        if (newStatus === 'COMPLETED' || newStatus === 'CANT_REPAIR') updates.completed_at = new Date().toISOString();

        await supabase.from('ticket_technician_log').update(updates).eq('id', techLogId);

        // Also update the main ticket status for Admin visibility AND trigger Customer WhatsApp notification
        if (newStatus === 'IN_PROGRESS') {
            await supabase.from('tickets').update({ status: 'IN_REPAIR' }).eq('id', id);
            if (ticket) await triggerStatusWhatsApp(ticket, 'IN_REPAIR');
        } else if (newStatus === 'COMPLETED') {
            await supabase.from('tickets').update({ status: 'REPAIRED' }).eq('id', id);
            if (ticket) await triggerStatusWhatsApp(ticket, 'REPAIRED');
        }

        setTechStatus(newStatus);
    };

    const addNote = async () => {
        if (!id || !noteContent.trim() || !ticket) return;
        const { data } = await supabase.from('ticket_notes')
            .insert({ ticket_id: id, note_type: 'INTERNAL', content: noteContent.trim(), sender_type: 'TECHNICIAN', is_read: false }).select().single();
        if (data) {
            setNotes(p => [data as TicketNote, ...p]);
            
            // Send push notification to Admins
            supabase.functions.invoke('send-push-notification', {
                body: {
                    title: `📝 Note from Tech on Ticket #${ticket.ticket_number}`,
                    body: `Tech: "${noteContent.substring(0, 50)}${noteContent.length > 50 ? '...' : ''}"`,
                    url: `/admin/tickets/${id}`,
                    target_admin: true,
                    event_type: 'TECH_NOTE',
                    source_id: id,
                    source_table: 'ticket_notes',
                    target_role: 'ADMIN',
                    target_user_name: 'Admin Team'
                }
            }).catch(console.error);
        }
        setNoteContent(''); setNoteDialogOpen(false);
    };

    const createPartRequest = async () => {
        if (!id || !ticket || !partForm.part_name.trim()) return;
        setUploading(true);

        // Upload images to Supabase Storage
        const imageUrls: string[] = [];
        for (const file of selectedFiles) {
            const ext = file.name.split('.').pop();
            const path = `part-requests/${id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const { data, error } = await supabase.storage.from('part-images').upload(path, file);
            if (data) {
                const { data: urlData } = supabase.storage.from('part-images').getPublicUrl(data.path);
                if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
            }
        }

        // Insert with PENDING_REVIEW so Admin must approve before broadcasting to dealers
        await supabase.from('part_requests').insert({
            ticket_id: id,
            part_name: partForm.part_name.trim(),
            tv_brand: ticket.tv_brand,
            tv_model: ticket.tv_model || '',
            tv_size: ticket.tv_size || '',
            description: partForm.description.trim(),
            status: 'PENDING_REVIEW',
            image_urls: imageUrls.length > 0 ? imageUrls : null,
        });
        // Update tech status to PART_REQUIRED
        await updateTechStatus('PART_REQUIRED');
        setPartForm({ part_name: '', description: '' });
        setSelectedFiles([]);
        setPartDialogOpen(false);
        setUploading(false);
        alert('Part request submitted! Admin will review and broadcast to dealers.');
    };

    // Calculate time since assignment
    const getTimeSince = () => {
        if (!assignedAt) return '-';
        const diff = Date.now() - new Date(assignedAt).getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: '#00D9FF' }} /></Box>;
    if (!ticket) return <Typography>Ticket not found</Typography>;

    const noteColor = (t: string) => ({ DIAGNOSIS: '#6C63FF', FOLLOW_UP: '#F59E0B', INTERNAL: '#94A3B8', CUSTOMER_UPDATE: '#10B981' }[t] || '#64748B');

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/tech')} sx={{ color: '#94A3B8' }}>
                    <ArrowBack />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={700}>{ticket.ticket_number}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {ticket.tv_brand} {ticket.tv_model || ''} {ticket.tv_size ? `(${ticket.tv_size})` : ''}
                    </Typography>
                </Box>
                <Chip
                    label={TECH_STATUS_LABELS[techStatus]}
                    sx={{
                        fontWeight: 700,
                        bgcolor: `${TECH_STATUS_COLORS[techStatus]}18`,
                        color: TECH_STATUS_COLORS[techStatus],
                        fontSize: '0.85rem'
                    }}
                />
            </Box>

            {/* Timer Card */}
            <Card sx={{ mb: 2, background: 'linear-gradient(135deg, rgba(0,217,255,0.08), rgba(108,99,255,0.08))', border: '1px solid rgba(0,217,255,0.15)' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, '&:last-child': { pb: 2 } }}>
                    <Timer sx={{ color: '#00D9FF' }} />
                    <Box>
                        <Typography variant="caption" color="text.secondary">Time Since Assignment</Typography>
                        <Typography variant="h6" fontWeight={700} color="#00D9FF">{getTimeSince()}</Typography>
                    </Box>
                </CardContent>
            </Card>

            {/* Ticket Info */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Ticket Details</Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Issue</Typography>
                            <Typography variant="body2">{ticket.issue_description}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Admin Diagnosis</Typography>
                            <Typography variant="body2">{ticket.diagnosed_issue || 'Not yet diagnosed'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Priority</Typography>
                            <Chip label={ticket.priority} size="small" sx={{ mt: 0.5, fontWeight: 600 }} />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Ticket Status</Typography>
                            <Chip label={TICKET_STATUS_LABELS[ticket.status]} size="small" sx={{ mt: 0.5, fontWeight: 600, bgcolor: 'rgba(108,99,255,0.1)', color: '#6C63FF' }} />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            {techStatus !== 'COMPLETED' && techStatus !== 'CANT_REPAIR' && (
                <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Update Work Status</Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                            {techStatus === 'ASSIGNED' && (
                                <Button
                                    variant="contained"
                                    startIcon={<PlayArrow />}
                                    onClick={() => updateTechStatus('IN_PROGRESS')}
                                    sx={{ bgcolor: '#00D9FF', '&:hover': { bgcolor: '#00B8D9' }, fontWeight: 600 }}
                                >
                                    Start Repair
                                </Button>
                            )}
                            {(techStatus === 'IN_PROGRESS' || techStatus === 'PART_REQUIRED') && (
                                <>
                                    <Button
                                        variant="contained"
                                        startIcon={<CheckCircle />}
                                        onClick={() => updateTechStatus('COMPLETED')}
                                        sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, fontWeight: 600 }}
                                    >
                                        Repair Complete
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Cancel />}
                                        onClick={() => updateTechStatus('CANT_REPAIR')}
                                        sx={{ borderColor: '#EF4444', color: '#EF4444', '&:hover': { borderColor: '#DC2626', bgcolor: 'rgba(239,68,68,0.08)' }, fontWeight: 600 }}
                                    >
                                        Can't Repair
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ShoppingCart />}
                                        onClick={() => setPartDialogOpen(true)}
                                        sx={{ borderColor: '#F59E0B', color: '#F59E0B', '&:hover': { borderColor: '#D97706', bgcolor: 'rgba(245,158,11,0.08)' }, fontWeight: 600 }}
                                    >
                                        Request Part
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="outlined"
                                startIcon={<NoteAdd />}
                                onClick={() => setNoteDialogOpen(true)}
                                sx={{ borderColor: '#6C63FF', color: '#6C63FF', fontWeight: 600 }}
                            >
                                Add Note
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Notes Section */}
            <Card>
                <CardContent>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Notes ({notes.length})</Typography>
                    {notes.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No notes yet. Add a diagnosis or update.</Typography>
                    ) : (
                        notes.map(n => (
                            <Box key={n.id} sx={{ mb: 1.5, pl: 2, borderLeft: `3px solid ${noteColor(n.note_type)}` }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip label={n.note_type.replace('_', ' ')} size="small"
                                            sx={{ height: 20, fontSize: '0.65rem', bgcolor: `${noteColor(n.note_type)}15`, color: noteColor(n.note_type) }} />
                                        {n.sender_type && (
                                            <Typography variant="caption" sx={{ color: n.sender_type === 'TECHNICIAN' ? 'warning.main' : n.sender_type === 'ADMIN' ? 'primary.main' : 'text.secondary', fontWeight: 600 }}>
                                                {n.sender_type === 'TECHNICIAN' ? 'You' : n.sender_type === 'ADMIN' ? 'Admin' : 'Customer'}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                        {n.sender_type === 'TECHNICIAN' && (
                                            n.is_read ? <DoneAll sx={{ fontSize: 16, color: '#3b82f6' }} /> : <Check sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        )}
                                    </Box>
                                </Box>
                                <Typography variant="body2">{n.content}</Typography>
                            </Box>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Add Note Dialog */}
            <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} fullWidth maxWidth="sm"
                PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3 } }}>
                <DialogTitle>Add Repair Note</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus multiline rows={3} fullWidth
                        placeholder="Describe what you found or what was done..."
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setNoteDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button onClick={addNote} variant="contained" disabled={!noteContent.trim()}>Save Note</Button>
                </DialogActions>
            </Dialog>

            {/* Part Request Dialog */}
            <Dialog open={partDialogOpen} onClose={() => setPartDialogOpen(false)} fullWidth maxWidth="sm"
                PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3 } }}>
                <DialogTitle>Request a Part</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Part Name"
                            required fullWidth
                            value={partForm.part_name}
                            onChange={e => setPartForm({ ...partForm, part_name: e.target.value })}
                        />
                        <TextField
                            label="Description / Details"
                            multiline rows={2} fullWidth
                            value={partForm.description}
                            onChange={e => setPartForm({ ...partForm, description: e.target.value })}
                        />

                        {/* Image Upload */}
                        <Box>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Attach Photos</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<PhotoCamera />}
                                    size="small"
                                    onClick={() => fileInputRef.current?.click()}
                                    sx={{ borderColor: '#6C63FF', color: '#6C63FF', fontWeight: 600 }}
                                >
                                    Camera / Gallery
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    hidden
                                    onChange={e => {
                                        if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                    }}
                                />
                            </Box>
                            {selectedFiles.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {selectedFiles.map((file, idx) => (
                                        <Box key={idx} sx={{ position: 'relative', width: 70, height: 70, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <IconButton
                                                size="small"
                                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(0,0,0,0.6)', color: '#EF4444', p: 0.3 }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                            TV: {ticket.tv_brand} {ticket.tv_model || ''} — Admin will review before broadcasting to dealers.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => { setPartDialogOpen(false); setSelectedFiles([]); }} sx={{ color: 'text.secondary' }}>Cancel</Button>
                    <Button onClick={createPartRequest} variant="contained" color="warning" disabled={!partForm.part_name.trim() || uploading}>
                        {uploading ? 'Uploading...' : 'Submit Request'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TechTicketDetailPage;
