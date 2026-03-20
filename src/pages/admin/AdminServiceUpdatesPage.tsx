import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, Button, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Chip, Grid, Switch, FormControlLabel, Select, MenuItem,
    InputLabel, FormControl, Avatar, CircularProgress, Divider, Tooltip
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon,
    Image as ImageIcon, Close as CloseIcon, Phone as PhoneIcon,
    ArrowForward as ArrowForwardIcon, CalendarMonth as CalendarIcon,
    Flag as FlagIcon, LocationOn as LocationIcon, Article as ArticleIcon,
    Campaign as CampaignIcon, Event as EventIcon, CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { ServiceUpdate } from '../../types/database';

const SERVICE_AREA_OPTIONS = [
    'Manikonda', 'Narsingi', 'Kokapet', 'Puppalguda', 'Financial District',
    'Gachibowli', 'HITEC City', 'Tolichowki', 'Jubilee Hills', 'Madhapur',
    'Suncity', 'Bandlaguda', 'Shaikpet', 'Raidurgam', 'Tellapur',
    'Chitrapuri Colony', 'Film Nagar', 'Alkapur Township', 'Lanco Hills',
];

const POST_TYPE_CONFIG = {
    update: { label: 'Update', icon: <ArticleIcon />, color: '#2563EB', bg: '#DBEAFE' },
    offer: { label: 'Offer', icon: <CampaignIcon />, color: '#D97706', bg: '#FEF3C7' },
    event: { label: 'Event', icon: <EventIcon />, color: '#7C3AED', bg: '#EDE9FE' },
};

const CTA_OPTIONS = [
    { value: 'call_now', label: 'Call Now', icon: <PhoneIcon sx={{ fontSize: 16 }} /> },
    { value: 'book_now', label: 'Book Now', icon: <ArrowForwardIcon sx={{ fontSize: 16 }} /> },
    { value: 'learn_more', label: 'Learn More', icon: <ArrowForwardIcon sx={{ fontSize: 16 }} /> },
];

export const AdminServiceUpdatesPage: React.FC = () => {
    const [posts, setPosts] = useState<ServiceUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [draft, setDraft] = useState<Partial<ServiceUpdate>>({});
    const [imageUrl, setImageUrl] = useState('');
    const [areaInput, setAreaInput] = useState('');
    const [uploading, setUploading] = useState(false);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        const { data, error: err } = await supabase
            .from('service_updates')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setPosts(data as ServiceUpdate[]);
        if (err) setError('Failed to load posts');
        setLoading(false);
    }, []);

    useEffect(() => { loadPosts(); }, []);

    const openDialog = (post?: ServiceUpdate) => {
        if (post) {
            setEditingId(post.id);
            setDraft({ ...post });
        } else {
            setEditingId(null);
            setDraft({
                title: '', description: '', post_type: 'update',
                images: [], service_area: '', area_tags: [],
                cta_type: 'call_now', cta_link: '/book', is_published: true,
            });
        }
        setImageUrl('');
        setAreaInput('');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!draft.title?.trim()) { setError('Title is required'); return; }
        setSaving(true);
        try {
            const payload = {
                title: draft.title, description: draft.description || '',
                post_type: draft.post_type || 'update', images: draft.images || [],
                service_area: draft.service_area || '', area_tags: draft.area_tags || [],
                cta_type: draft.cta_type || 'call_now', cta_link: draft.cta_link || '/book',
                is_published: draft.is_published ?? true,
            };
            if (editingId) {
                await supabase.from('service_updates').update(payload).eq('id', editingId);
                setSuccess('Post updated!');
            } else {
                await supabase.from('service_updates').insert(payload);
                setSuccess('Post created!');
            }
            setDialogOpen(false);
            loadPosts();
        } catch (e) { setError('Save failed'); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this post?')) return;
        await supabase.from('service_updates').delete().eq('id', id);
        setSuccess('Post deleted');
        loadPosts();
    };

    const togglePublish = async (post: ServiceUpdate) => {
        await supabase.from('service_updates').update({ is_published: !post.is_published }).eq('id', post.id);
        loadPosts();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `updates/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('service-updates')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('service-updates')
                .getPublicUrl(filePath);

            setDraft(p => ({ ...p, images: [...(p.images || []), data.publicUrl] }));
        } catch (err: any) {
            setError(err.message || 'Error uploading image');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removeImage = (idx: number) => {
        setDraft(p => ({ ...p, images: (p.images || []).filter((_, i) => i !== idx) }));
    };

    const addAreaTag = (tag: string) => {
        if (!tag.trim() || (draft.area_tags || []).includes(tag)) return;
        setDraft(p => ({ ...p, area_tags: [...(p.area_tags || []), tag] }));
        setAreaInput('');
    };

    const removeAreaTag = (tag: string) => {
        setDraft(p => ({ ...p, area_tags: (p.area_tags || []).filter(t => t !== tag) }));
    };

    const relativeTime = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const days = Math.floor(h / 24);
        if (days < 7) return `${days}d ago`;
        return `${Math.floor(days / 7)}w ago`;
    };

    // KPIs
    const totalPosts = posts.length;
    const publishedPosts = posts.filter(p => p.is_published).length;
    const draftPosts = totalPosts - publishedPosts;

    return (
        <Box>
            {/* Status Messages */}
            {error && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 600 }}>⚠ {error}</Typography>
                    <IconButton size="small" onClick={() => setError(null)}><CloseIcon sx={{ fontSize: 16, color: '#EF4444' }} /></IconButton>
                </Box>
            )}
            {success && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>✓ {success}</Typography>
                    <IconButton size="small" onClick={() => setSuccess(null)}><CloseIcon sx={{ fontSize: 16, color: '#10B981' }} /></IconButton>
                </Box>
            )}

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#F1F5F9', letterSpacing: '-0.5px' }}>
                        📰 Service Updates
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>
                        Your Google Business Profile-style content feed. Posts appear live on the customer portal.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}
                    sx={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)', textTransform: 'none', fontWeight: 700 }}>
                    New Post
                </Button>
            </Box>

            {/* KPI Strip */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                {[
                    { label: 'Total Posts', val: totalPosts, color: '#6C63FF', bg: 'rgba(108,99,255,0.1)' },
                    { label: 'Published', val: publishedPosts, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                    { label: 'Drafts', val: draftPosts, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                ].map(k => (
                    <Card key={k.label} sx={{ flex: 1, p: 2, borderRadius: 3, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Typography sx={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', mb: 0.5 }}>{k.label}</Typography>
                        <Typography sx={{ color: k.color, fontSize: '1.5rem', fontWeight: 800 }}>{k.val}</Typography>
                    </Card>
                ))}
            </Box>

            {/* Posts List */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: '#6C63FF' }} /></Box>
            ) : posts.length === 0 ? (
                <Card sx={{ p: 4, textAlign: 'center', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                    <Typography sx={{ fontSize: 48, mb: 1 }}>📰</Typography>
                    <Typography sx={{ color: '#94A3B8', fontWeight: 600 }}>No service updates yet</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 2 }}>Start posting your real work to build trust & boost SEO</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}
                        sx={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)', textTransform: 'none', fontWeight: 700 }}>
                        Create First Post
                    </Button>
                </Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {posts.map(post => {
                        const typeConfig = POST_TYPE_CONFIG[post.post_type as keyof typeof POST_TYPE_CONFIG] || POST_TYPE_CONFIG.update;
                        return (
                            <Card key={post.id} sx={{
                                p: 0, borderRadius: 3, overflow: 'hidden',
                                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)',
                                transition: 'all 0.2s', '&:hover': { border: '1px solid rgba(108,99,255,0.2)' },
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                                    {/* Thumbnail */}
                                    {post.images && post.images.length > 0 && (
                                        <Box sx={{ width: 120, minHeight: 100, flexShrink: 0, overflow: 'hidden' }}>
                                            <img src={post.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </Box>
                                    )}
                                    {/* Content */}
                                    <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Chip label={typeConfig.label} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, background: typeConfig.bg, color: typeConfig.color }} />
                                            <Chip label={post.is_published ? 'Published' : 'Draft'} size="small"
                                                sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, background: post.is_published ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: post.is_published ? '#10B981' : '#F59E0B' }} />
                                            {post.service_area && <Typography sx={{ fontSize: '0.65rem', color: '#64748B' }}>📍 {post.service_area}</Typography>}
                                            <Typography sx={{ fontSize: '0.6rem', color: '#475569', ml: 'auto' }}>{relativeTime(post.created_at)}</Typography>
                                        </Box>
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#E2E8F0', mb: 0.3, lineHeight: 1.3 }}>{post.title}</Typography>
                                        <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {post.description}
                                        </Typography>
                                        {post.area_tags && post.area_tags.length > 0 && (
                                            <Box sx={{ display: 'flex', gap: 0.4, mt: 0.5, flexWrap: 'wrap' }}>
                                                {post.area_tags.slice(0, 5).map(t => (
                                                    <Chip key={t} label={t} size="small" sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: '#64748B' }} />
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                    {/* Actions */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5, p: 1 }}>
                                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openDialog(post)} sx={{ color: '#94A3B8' }}><EditIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                        <Tooltip title={post.is_published ? 'Unpublish' : 'Publish'}>
                                            <IconButton size="small" onClick={() => togglePublish(post)} sx={{ color: post.is_published ? '#10B981' : '#F59E0B' }}>
                                                {post.is_published ? <VisibilityIcon sx={{ fontSize: 18 }} /> : <VisibilityOffIcon sx={{ fontSize: 18 }} />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDelete(post.id)} sx={{ color: '#EF4444', '&:hover': { background: 'rgba(239,68,68,0.1)' } }}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                    </Box>
                                </Box>
                            </Card>
                        );
                    })}
                </Box>
            )}

            {/* ═══ Create / Edit Dialog ═══ */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
                PaperProps={{ sx: { background: '#0F172A', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 4, maxHeight: '90vh' } }}>
                <DialogTitle sx={{ color: '#F1F5F9', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArticleIcon sx={{ color: '#6C63FF' }} />
                    {editingId ? 'Edit Post' : 'Create New Post'}
                    <IconButton sx={{ ml: 'auto', color: '#94A3B8' }} onClick={() => setDialogOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    {/* Post Type */}
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mb: 1, display: 'block' }}>Post Type</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        {Object.entries(POST_TYPE_CONFIG).map(([key, cfg]) => (
                            <Chip key={key} label={cfg.label} icon={React.cloneElement(cfg.icon, { sx: { fontSize: 16 } })}
                                onClick={() => setDraft(p => ({ ...p, post_type: key as ServiceUpdate['post_type'] }))}
                                sx={{
                                    fontWeight: 700, fontSize: '0.8rem',
                                    background: draft.post_type === key ? cfg.bg : 'rgba(255,255,255,0.05)',
                                    color: draft.post_type === key ? cfg.color : '#94A3B8',
                                    border: draft.post_type === key ? `1px solid ${cfg.color}` : '1px solid transparent',
                                }} />
                        ))}
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Title & Description */}
                    <TextField fullWidth label="Title" placeholder="e.g., 85 Inch Samsung QLED TV Repair – Puppalguda (500089)"
                        value={draft.title || ''} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#E2E8F0' }, '& .MuiInputLabel-root': { color: '#64748B' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }} />
                    <TextField fullWidth label="Description" multiline rows={5}
                        placeholder="Write your service update with location keywords for SEO..."
                        value={draft.description || ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#E2E8F0' }, '& .MuiInputLabel-root': { color: '#64748B' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }} />

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Images */}
                    {/* Images */}
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mb: 1, display: 'block' }}>📸 Images</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        {(draft.images || []).map((img, i) => (
                            <Box key={i} sx={{ position: 'relative', width: 80, height: 60, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <IconButton size="small" onClick={() => removeImage(i)}
                                    sx={{ position: 'absolute', top: 0, right: 0, p: 0.2, background: 'rgba(0,0,0,0.6)', color: '#FFF' }}>
                                    <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="outlined" component="label" disabled={uploading}
                            sx={{ textTransform: 'none', fontWeight: 600, borderColor: 'rgba(108,99,255,0.3)', color: '#6C63FF', borderStyle: 'dashed' }}
                        >
                            {uploading ? <CircularProgress size={20} sx={{ mr: 1, color: '#6C63FF' }} /> : <ImageIcon sx={{ mr: 1, fontSize: 18 }} />}
                            {uploading ? 'Uploading...' : 'Upload Image'}
                            <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                        </Button>
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Service Area + Area Tags */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel sx={{ color: '#64748B' }}>Primary Service Area</InputLabel>
                                <Select value={draft.service_area || ''} label="Primary Service Area"
                                    onChange={e => setDraft(p => ({ ...p, service_area: e.target.value }))}
                                    sx={{ color: '#E2E8F0', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                                    {SERVICE_AREA_OPTIONS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel sx={{ color: '#64748B' }}>CTA Button</InputLabel>
                                <Select value={draft.cta_type || 'call_now'} label="CTA Button"
                                    onChange={e => setDraft(p => ({ ...p, cta_type: e.target.value as ServiceUpdate['cta_type'] }))}
                                    sx={{ color: '#E2E8F0', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                                    {CTA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    {/* Area Tags for SEO */}
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mb: 1, display: 'block' }}>🔑 SEO Area Keywords</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                        {(draft.area_tags || []).map(tag => (
                            <Chip key={tag} label={tag} size="small" onDelete={() => removeAreaTag(tag)}
                                sx={{ fontWeight: 600, fontSize: '0.7rem', background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }} />
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                        {SERVICE_AREA_OPTIONS.filter(a => !(draft.area_tags || []).includes(a)).slice(0, 8).map(area => (
                            <Chip key={area} label={`+ ${area}`} size="small" onClick={() => addAreaTag(area)}
                                sx={{ fontWeight: 600, fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: '#64748B', cursor: 'pointer',
                                    '&:hover': { background: 'rgba(108,99,255,0.1)', color: '#6C63FF' } }} />
                        ))}
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Publish Toggle */}
                    <FormControlLabel
                        control={<Switch checked={draft.is_published ?? true} onChange={e => setDraft(p => ({ ...p, is_published: e.target.checked }))} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10B981' } }} />}
                        label={<Typography sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.85rem' }}>Publish immediately</Typography>}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ color: '#94A3B8', textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}
                        sx={{ background: 'linear-gradient(135deg, #6C63FF, #8B85FF)', textTransform: 'none', fontWeight: 700 }}>
                        {saving ? <CircularProgress size={20} sx={{ color: '#FFF' }} /> : editingId ? 'Update Post' : 'Publish Post'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminServiceUpdatesPage;
