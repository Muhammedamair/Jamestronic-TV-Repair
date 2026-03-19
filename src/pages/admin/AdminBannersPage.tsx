import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, IconButton, TextField,
    CircularProgress, Switch, Card, CardContent, Alert, Divider, Chip,
    Select, MenuItem, FormControl, InputLabel, Grid, Avatar,
    Dialog, DialogTitle, DialogContent, DialogActions, Collapse, Tooltip,
} from '@mui/material';
import {
    Delete, Add, Save, Edit, Celebration, AutoAwesome, Timer,
    Visibility, VisibilityOff, ExpandMore, ExpandLess,
    Campaign, Schedule, TouchApp, Palette, EmojiEmotions,
    ViewCarousel, TrendingUp, Close, CheckCircle,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { useBanners } from '../../hooks/useBanners';
import { PromotionalBanner } from '../../types/database';

// ──────────────────────────────────────────
// FESTIVAL THEME PRESETS
// ──────────────────────────────────────────
const FESTIVAL_PRESETS: Record<string, {
    label: string; icon: string;
    gradient_start: string; gradient_end: string;
    emoji_set: string[]; tag_text: string;
    animation_style: string;
    title?: string;
    subtitle?: string;
    highlight_text?: string;
    offer_text?: string;
}> = {
    eid: {
        label: 'Eid / Ramzan', icon: '🌙',
        gradient_start: '#065F46', gradient_end: '#047857',
        emoji_set: ['🌙', '✨', '🕌'], tag_text: 'EID SPECIAL',
        animation_style: 'celebration',
    },
    diwali: {
        label: 'Diwali', icon: '🪔',
        gradient_start: '#B45309', gradient_end: '#D97706',
        emoji_set: ['🪔', '✨', '🎆'], tag_text: 'DIWALI SALE',
        animation_style: 'celebration',
    },
    independence: {
        label: 'Independence Day', icon: '🇮🇳',
        gradient_start: '#C2410C', gradient_end: '#059669',
        emoji_set: ['🇮🇳', '✨', '🎆'], tag_text: '15 AUG SPECIAL',
        animation_style: 'celebration',
    },
    christmas: {
        label: 'Christmas', icon: '🎄',
        gradient_start: '#991B1B', gradient_end: '#166534',
        emoji_set: ['🎄', '🎅', '❄️'], tag_text: 'NEW YEAR OFFER',
        animation_style: 'celebration',
    },
    ugadi: {
        label: 'Ugadi / Navratri', icon: '🌼',
        gradient_start: '#9333EA', gradient_end: '#DB2777',
        emoji_set: ['🌼', '🎉', '✨'], tag_text: 'FESTIVAL OFFER',
        animation_style: 'celebration',
    },
    summer: {
        label: 'Summer Sale', icon: '☀️',
        gradient_start: '#EA580C', gradient_end: '#EAB308',
        emoji_set: ['☀️', '🔥', '⚡'], tag_text: 'SUMMER SALE',
        animation_style: 'aurora',
    },
    holi: {
        label: 'Holi', icon: '🎨',
        gradient_start: '#EC4899', gradient_end: '#8B5CF6',
        emoji_set: ['🎨', '✨', '🎉'], tag_text: 'HOLI SPL',
        animation_style: 'celebration',
    },
    onam: {
        label: 'Onam', icon: '🌸',
        gradient_start: '#F59E0B', gradient_end: '#10B981',
        emoji_set: ['🌸', '✨', '🌼'], tag_text: 'ONAM OFFER',
        animation_style: 'celebration',
    },
    dussehra: {
        label: 'Dussehra', icon: '🏹',
        gradient_start: '#DC2626', gradient_end: '#F59E0B',
        emoji_set: ['🏹', '✨', '🔥'], tag_text: 'DUSSEHRA SPL',
        animation_style: 'celebration',
    },
    flash: {
        label: 'Flash Sale', icon: '⚡',
        gradient_start: '#000000', gradient_end: '#DC2626',
        emoji_set: ['⚡', '🔥', '⏳'], tag_text: 'FLASH SALE',
        animation_style: 'minimal',
    },
    ayen: {
        label: 'For AYEN ❤️', icon: '❤️',
        gradient_start: '#E11D48', gradient_end: '#9333EA', // romantic cherry/magenta/purple
        emoji_set: ['❤️', '✨', '🌹', '👨‍👩‍👦‍👦'], tag_text: 'MY LIFELINE',
        animation_style: 'pulse', // Heartbeat effect
        title: 'For Waseem Fatima (AYEN) ✨',
        subtitle: 'I love you so much ❤️',
        highlight_text: 'Zohan, Zabi & Zahid',
        offer_text: 'You are my entire world, today and forever.',
    },
    default: {
        label: 'JamesTronic', icon: '💜',
        gradient_start: '#5B4CF2', gradient_end: '#7C3AED',
        emoji_set: [], tag_text: '10 MINS',
        animation_style: 'particles',
    },
};

const ANIMATION_STYLES = [
    { value: 'particles', label: 'Particles', icon: '✨', color: '#6C63FF', desc: 'Floating luminous dots — premium default' },
    { value: 'celebration', label: 'Celebration', icon: '🎉', color: '#F59E0B', desc: 'Confetti + sparkles — for festivals' },
    { value: 'aurora', label: 'Aurora', icon: '🌌', color: '#06B6D4', desc: 'Flowing color waves — luxury feel' },
    { value: 'pulse', label: 'Pulse', icon: '💓', color: '#EC4899', desc: 'Gentle heartbeat breathing effect' },
    { value: 'shimmer', label: 'Shimmer', icon: '🪄', color: '#8B5CF6', desc: 'Premium metallic diagonal light sweep' },
    { value: 'minimal', label: 'Minimal', icon: '⚡', color: '#10B981', desc: 'Clean gradient only — fastest load' },
];

const EMOJI_SUGGESTIONS = [
    { label: 'Festive', emojis: '🎉 ✨ 🎊 🎈' },
    { label: 'Urgent', emojis: '⚡ 🔥 ⏳ 🚨' },
    { label: 'Premium', emojis: '⭐ 🌟 ✨ 💎' },
    { label: 'Tools', emojis: '🔧 📺 🛠️ ⚙️' },
    { label: 'Nature', emojis: '🌙 ☀️ 🌸 🌼' },
    { label: 'Clear', emojis: '' },
];

const PREMIUM_GRADIENTS = [
    { start: '#5B4CF2', end: '#7C3AED' }, // JamesTronic Default
    { start: '#065F46', end: '#047857' }, // Emerald
    { start: '#B45309', end: '#D97706' }, // Gold
    { start: '#991B1B', end: '#166534' }, // Red/Green
    { start: '#C2410C', end: '#059669' }, // Saffron/Green
    { start: '#9333EA', end: '#DB2777' }, // Purple/Pink
    { start: '#EC4899', end: '#8B5CF6' }, // Pink/Purple
    { start: '#0EA5E9', end: '#3B82F6' }, // Ocean
    { start: '#000000', end: '#434343' }, // Midnight Slate
    { start: '#000000', end: '#DC2626' }, // Flash Red
];

export const AdminBannersPage: React.FC = () => {
    const [banners, setBanners] = useState<PromotionalBanner[]>([]);
    const { fetchBanners, createBanner, updateBanner, deleteBanner, loading } = useBanners();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<Partial<PromotionalBanner>>({});
    const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const loadBanners = useCallback(async () => {
        const { data, error: err } = await fetchBanners();
        if (data) setBanners(data);
        if (err) setError('Failed to load banners');
    }, [fetchBanners]);

    useEffect(() => { loadBanners(); }, []);

    // ─── KPI Metrics ───
    const totalBanners = banners.length;
    const liveBanners = banners.filter(b => b.is_active).length;
    const scheduledBanners = banners.filter(b => b.schedule_start || b.schedule_end).length;
    const withCTA = banners.filter(b => b.cta_text).length;

    const openEditDialog = (banner?: PromotionalBanner) => {
        if (banner) {
            setEditingBannerId(banner.id);
            setDraft({
                title: banner.title || '', subtitle: banner.subtitle || '',
                highlight_text: banner.highlight_text || '', tag_text: banner.tag_text || '',
                offer_text: banner.offer_text || '', gradient_start: banner.gradient_start || '#5B4CF2',
                gradient_end: banner.gradient_end || '#7C3AED', animation_style: banner.animation_style || 'particles',
                cta_text: banner.cta_text || '', cta_link: banner.cta_link || '/book',
                schedule_start: banner.schedule_start || '', schedule_end: banner.schedule_end || '',
                countdown_end: banner.countdown_end || '', emoji_set: banner.emoji_set || [],
            });
        } else {
            setEditingBannerId(null);
            setDraft({
                title: 'JamesTronic Care', subtitle: 'Expert TV Repair at',
                highlight_text: '₹249*', tag_text: '10 MINS',
                offer_text: '* Valid for first 3 bookings • Zero visitation fee',
                gradient_start: '#5B4CF2', gradient_end: '#7C3AED',
                animation_style: 'particles', cta_text: '', cta_link: '/book',
                schedule_start: '', schedule_end: '', countdown_end: '', emoji_set: [],
            });
        }
        setEditDialogOpen(true);
    };

    const applyPreset = (key: string) => {
        const p = FESTIVAL_PRESETS[key];
        if (!p) return;
        setDraft(prev => ({
            ...prev, gradient_start: p.gradient_start, gradient_end: p.gradient_end,
            emoji_set: p.emoji_set, tag_text: p.tag_text, animation_style: p.animation_style,
            ...(p.title ? { title: p.title } : {}),
            ...(p.subtitle ? { subtitle: p.subtitle } : {}),
            ...(p.highlight_text ? { highlight_text: p.highlight_text } : {}),
            ...(p.offer_text ? { offer_text: p.offer_text } : {}),
        }));
    };

    const handleSave = async () => {
        setSaving(true); setError(null);
        const payload = { ...draft };
        if (!payload.schedule_start) payload.schedule_start = undefined;
        if (!payload.schedule_end) payload.schedule_end = undefined;
        if (!payload.countdown_end) payload.countdown_end = undefined;

        if (editingBannerId) {
            const { error: err } = await updateBanner(editingBannerId, payload);
            if (err) { setError('Failed to save.'); }
            else { setSuccess('✅ Banner updated! Changes are live.'); setEditDialogOpen(false); loadBanners(); }
        } else {
            const { error: err } = await createBanner({
                ...payload, banner_type: 'hero', is_active: false,
                order_index: banners.length, image_url: '',
            } as any);
            if (err) { setError('Failed to create.'); }
            else { setSuccess('✅ New banner created!'); setEditDialogOpen(false); loadBanners(); }
        }
        setSaving(false);
        setTimeout(() => setSuccess(null), 3000);
    };

    const toggleActive = async (banner: PromotionalBanner) => {
        const { error: err } = await updateBanner(banner.id, { is_active: !banner.is_active });
        if (!err) setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !banner.is_active } : b));
    };

    const removeBanner = async (id: string) => {
        if (!window.confirm('Delete this banner permanently?')) return;
        const { error: err } = await deleteBanner(id);
        if (!err) setBanners(prev => prev.filter(b => b.id !== id));
    };

    // ─── Live Preview ───
    const renderPreview = (data: Partial<PromotionalBanner>, compact = false) => {
        const gradStart = data.gradient_start || '#5B4CF2';
        const gradEnd = data.gradient_end || '#7C3AED';
        const titleParts = (data.title || '').split(' ');
        const brand = titleParts.length > 1 ? titleParts.slice(0, -1).join(' ') : data.title;
        const accent = titleParts.length > 1 ? titleParts[titleParts.length - 1] : '';
        const emojis = data.emoji_set || [];

        return (
            <Box sx={{
                background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
                borderRadius: 3, p: compact ? 2.5 : 3, position: 'relative', overflow: 'hidden',
                minHeight: compact ? 130 : 170,
            }}>
                {/* Decorative orbs */}
                <Box sx={{
                    position: 'absolute', top: -40, right: -30, width: 140, height: 140,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <Box sx={{
                    position: 'absolute', bottom: -25, left: -20, width: 100, height: 100,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                {/* Floating emojis */}
                {emojis.length > 0 && (
                    <Box sx={{ position: 'absolute', top: 12, right: 16, display: 'flex', gap: 0.8, opacity: 0.5 }}>
                        {emojis.map((e, i) => <span key={i} style={{ fontSize: compact ? 16 : 20 }}>{e}</span>)}
                    </Box>
                )}
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                        <Typography sx={{ color: '#FFF', fontStyle: 'italic', fontWeight: 900, fontSize: compact ? '1rem' : '1.2rem', letterSpacing: '-0.3px' }}>
                            {brand}{' '}{accent && <span style={{ color: '#A78BFA' }}>{accent}</span>}
                        </Typography>
                        {data.tag_text && (
                            <Box sx={{
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                color: '#FFF', px: 1, py: 0.2, borderRadius: '5px',
                                fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                                {data.tag_text}
                            </Box>
                        )}
                    </Box>
                    <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: compact ? '1.2rem' : '1.5rem', lineHeight: 1.2, mb: 0.5 }}>
                        {data.subtitle}{' '}
                        <span style={{ color: '#FCD34D' }}>{data.highlight_text}</span>
                    </Typography>
                    {data.offer_text && (
                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: compact ? '0.7rem' : '0.8rem', fontWeight: 500 }}>
                            {data.offer_text}
                        </Typography>
                    )}
                    {data.cta_text && (
                        <Box sx={{
                            display: 'inline-block', mt: 1.5, background: 'rgba(255,255,255,0.92)',
                            color: gradStart, fontWeight: 800, fontSize: '0.8rem',
                            px: 2, py: 0.8, borderRadius: '10px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                        }}>
                            {data.cta_text} →
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    // ─── MAIN RENDER ───
    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* ═══ Header ═══ */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">Promotional Command Center</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Design, schedule and manage promotional banners with animated themes
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => openEditDialog()}
                    sx={{
                        borderRadius: 2, px: 3, py: 1,
                        background: 'linear-gradient(135deg, #6C63FF 0%, #8B85FF 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #5A52E0 0%, #7A74FF 100%)' },
                    }}>
                    Create Banner
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* ═══ KPI Cards ═══ */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { label: 'TOTAL BANNERS', value: totalBanners, icon: <ViewCarousel fontSize="small" />, color: '#6C63FF', sub: 'In your library' },
                    { label: 'LIVE NOW', value: liveBanners, icon: <Campaign fontSize="small" />, color: '#10B981', sub: 'Active on customer page' },
                    { label: 'SCHEDULED', value: scheduledBanners, icon: <Schedule fontSize="small" />, color: '#F59E0B', sub: 'Auto-publish campaigns' },
                    { label: 'WITH CTA', value: withCTA, icon: <TouchApp fontSize="small" />, color: '#06B6D4', sub: 'Banners with action button' },
                ].map(kpi => (
                    <Grid size={{ xs: 6, md: 3 }} key={kpi.label}>
                        <Card sx={{
                            background: `linear-gradient(135deg, ${kpi.color}1F 0%, ${kpi.color}0A 100%)`,
                            border: `1px solid ${kpi.color}26`,
                        }}>
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                    <Avatar sx={{ width: 36, height: 36, bgcolor: `${kpi.color}26`, color: kpi.color }}>
                                        {kpi.icon}
                                    </Avatar>
                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                        {kpi.label}
                                    </Typography>
                                </Box>
                                <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color }}>
                                    {kpi.value}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748B' }}>{kpi.sub}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* ═══ Banner Cards ═══ */}
            {loading && !banners.length ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : banners.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <ViewCarousel sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        No banners yet. Click "Create Banner" to design your first promotional hero banner.
                    </Typography>
                </Box>
            ) : (
                banners.map(banner => {
                    const isExpanded = expandedId === banner.id;
                    const animInfo = ANIMATION_STYLES.find(s => s.value === banner.animation_style);

                    return (
                        <Card key={banner.id} sx={{
                            mb: 2,
                            border: isExpanded ? '1px solid rgba(108,99,255,0.3)' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.3s ease',
                            '&:hover': { border: '1px solid rgba(108,99,255,0.2)' },
                        }}>
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                {/* Banner Header */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    {/* Gradient avatar showing banner color */}
                                    <Avatar sx={{
                                        width: 48, height: 48,
                                        background: `linear-gradient(135deg, ${banner.gradient_start || '#5B4CF2'}, ${banner.gradient_end || '#7C3AED'})`,
                                        fontWeight: 700, fontSize: '1.2rem',
                                    }}>
                                        {(banner.emoji_set && banner.emoji_set.length > 0) ? banner.emoji_set[0] : '🎯'}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                                {banner.title || 'Untitled Banner'}
                                            </Typography>
                                            <Chip
                                                label={banner.is_active ? 'LIVE' : 'HIDDEN'}
                                                size="small"
                                                icon={banner.is_active ? <Visibility sx={{ fontSize: 14 }} /> : <VisibilityOff sx={{ fontSize: 14 }} />}
                                                color={banner.is_active ? 'success' : 'default'}
                                                sx={{ fontWeight: 'bold', cursor: 'pointer', height: 22, fontSize: '0.65rem' }}
                                                onClick={() => toggleActive(banner)}
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                                            <Chip label={animInfo?.label || 'Particles'} size="small"
                                                icon={<span style={{ fontSize: 12 }}>{animInfo?.icon || '✨'}</span>}
                                                sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: `${animInfo?.color || '#6C63FF'}15`, color: animInfo?.color || '#6C63FF' }} />
                                            {banner.cta_text && (
                                                <Chip label={`CTA: ${banner.cta_text}`} size="small" icon={<TouchApp sx={{ fontSize: 12 }} />}
                                                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(6,182,212,0.1)', color: '#06B6D4' }} />
                                            )}
                                            {banner.countdown_end && (
                                                <Chip label="Countdown" size="small" icon={<Timer sx={{ fontSize: 12 }} />}
                                                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444' }} />
                                            )}
                                            {(banner.schedule_start || banner.schedule_end) && (
                                                <Chip label="Scheduled" size="small" icon={<Schedule sx={{ fontSize: 12 }} />}
                                                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'rgba(245,158,11,0.1)', color: '#F59E0B' }} />
                                            )}
                                            <Typography variant="caption" sx={{ color: '#475569' }}>
                                                Created {new Date(banner.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Live / Hidden">
                                            <Switch checked={banner.is_active} onChange={() => toggleActive(banner)} size="small" color="success" />
                                        </Tooltip>
                                        <Tooltip title="Edit Banner">
                                            <IconButton size="small" onClick={() => openEditDialog(banner)}
                                                sx={{ color: '#94A3B8', '&:hover': { color: '#6C63FF', bgcolor: 'rgba(108,99,255,0.08)' } }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small" onClick={() => removeBanner(banner.id)}
                                                sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.08)' } }}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={isExpanded ? 'Collapse' : 'Preview'}>
                                            <IconButton size="small"
                                                onClick={() => setExpandedId(isExpanded ? null : banner.id)}
                                                sx={{
                                                    color: isExpanded ? '#6C63FF' : '#94A3B8',
                                                    bgcolor: isExpanded ? 'rgba(108,99,255,0.1)' : 'transparent',
                                                    '&:hover': { color: '#6C63FF', bgcolor: 'rgba(108,99,255,0.08)' },
                                                }}>
                                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* Banner Details Grid (always visible compact stats) */}
                                <Grid container spacing={1.5}>
                                    {[
                                        { label: 'Headline', value: banner.subtitle || '—', color: '#6C63FF' },
                                        { label: 'Price/Highlight', value: banner.highlight_text || '—', color: '#FCD34D' },
                                        { label: 'Tag', value: banner.tag_text || '—', color: '#10B981' },
                                        { label: 'Offer', value: banner.offer_text ? (banner.offer_text.length > 30 ? banner.offer_text.slice(0, 30) + '…' : banner.offer_text) : '—', color: '#94A3B8' },
                                    ].map(stat => (
                                        <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
                                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${stat.color}08`, border: `1px solid ${stat.color}15`, textAlign: 'center' }}>
                                                <Typography variant="body2" fontWeight={700} sx={{ color: stat.color, lineHeight: 1.2, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {stat.value}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.6rem' }}>
                                                    {stat.label}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Expandable Preview */}
                                <Collapse in={isExpanded} timeout="auto">
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Visibility fontSize="small" sx={{ color: '#6C63FF' }} />
                                            Live Preview
                                        </Typography>
                                        {renderPreview(banner)}

                                        {/* Schedule info */}
                                        {(banner.schedule_start || banner.schedule_end || banner.countdown_end) && (
                                            <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
                                                <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                                    <Schedule sx={{ fontSize: 14 }} /> Schedule Info
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                                    {banner.schedule_start && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Publishes: {new Date(banner.schedule_start).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </Typography>
                                                    )}
                                                    {banner.schedule_end && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Hides: {new Date(banner.schedule_end).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </Typography>
                                                    )}
                                                    {banner.countdown_end && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Countdown until: {new Date(banner.countdown_end).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    );
                })
            )}

            {/* ═══ EDIT / CREATE DIALOG ═══ */}
            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                maxWidth="md" fullWidth
                PaperProps={{ sx: { bgcolor: '#1A2235', borderRadius: 3, maxHeight: '90vh' } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={800}>
                            {editingBannerId ? 'Edit Banner' : 'Create New Banner'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Design your promotional banner with animations and scheduling
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setEditDialogOpen(false)} sx={{ color: '#94A3B8' }}>
                        <Close />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ pt: 3 }}>
                    {/* Live Preview */}
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Visibility sx={{ fontSize: 18 }} /> Live Preview
                    </Typography>
                    {renderPreview(draft)}

                    {/* ─── Festival Theme Presets ─── */}
                    <Typography variant="subtitle2" color="primary" sx={{ mt: 3, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Celebration sx={{ fontSize: 18 }} /> Festival Theme Presets
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                        {Object.entries(FESTIVAL_PRESETS).map(([key, preset]) => (
                            <Button key={key} size="small" onClick={() => applyPreset(key)}
                                sx={{
                                    borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem',
                                    px: 2, py: 0.7,
                                    background: `linear-gradient(135deg, ${preset.gradient_start}, ${preset.gradient_end})`,
                                    color: '#FFF', border: '2px solid transparent',
                                    '&:hover': { opacity: 0.9, transform: 'scale(1.03)', border: '2px solid rgba(255,255,255,0.3)' },
                                    transition: 'all 0.2s ease',
                                }}>
                                {preset.icon} {preset.label}
                            </Button>
                        ))}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* ─── Content Section ─── */}
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Edit sx={{ fontSize: 18 }} /> Banner Content
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TextField label="Brand Title" size="small" fullWidth
                                value={draft.title ?? ''} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
                                placeholder="JamesTronic Care" helperText="Last word gets accent color" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField label="Tag Badge" size="small" fullWidth
                                value={draft.tag_text ?? ''} onChange={e => setDraft(p => ({ ...p, tag_text: e.target.value }))}
                                placeholder="10 MINS" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TextField label="Headline" size="small" fullWidth
                                value={draft.subtitle ?? ''} onChange={e => setDraft(p => ({ ...p, subtitle: e.target.value }))}
                                placeholder="Expert TV Repair at" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField label="Price / Highlight" size="small" fullWidth
                                value={draft.highlight_text ?? ''} onChange={e => setDraft(p => ({ ...p, highlight_text: e.target.value }))}
                                placeholder="₹249*" />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField label="Offer Details" size="small" fullWidth
                                value={draft.offer_text ?? ''} onChange={e => setDraft(p => ({ ...p, offer_text: e.target.value }))}
                                placeholder="* Valid for first 3 bookings • Zero visitation fee" />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* ─── CTA Button ─── */}
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TouchApp sx={{ fontSize: 18 }} /> Call-to-Action Button
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Button Text" size="small" fullWidth
                                value={draft.cta_text ?? ''} onChange={e => setDraft(p => ({ ...p, cta_text: e.target.value }))}
                                placeholder="Book Now" helperText="Leave empty to hide" />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Button Link" size="small" fullWidth
                                value={draft.cta_link ?? ''} onChange={e => setDraft(p => ({ ...p, cta_link: e.target.value }))}
                                placeholder="/book" />
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* ─── Animation & Colors ─── */}
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Palette sx={{ fontSize: 18 }} /> Animation & Colors
                    </Typography>

                    {/* Animation Style Visual Picker */}
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                        {ANIMATION_STYLES.map(s => (
                            <Box key={s.value} onClick={() => setDraft(p => ({ ...p, animation_style: s.value }))}
                                sx={{
                                    flex: '1 1 130px', p: 1.5, borderRadius: 2, cursor: 'pointer',
                                    border: draft.animation_style === s.value ? `2px solid ${s.color}` : '2px solid rgba(255,255,255,0.06)',
                                    bgcolor: draft.animation_style === s.value ? `${s.color}15` : 'rgba(15,23,42,0.5)',
                                    transition: 'all 0.2s', textAlign: 'center',
                                    '&:hover': { border: `2px solid ${s.color}80` },
                                }}>
                                <Typography sx={{ fontSize: 24, mb: 0.5 }}>{s.icon}</Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ color: draft.animation_style === s.value ? s.color : '#E2E8F0' }}>
                                    {s.label}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.6rem' }}>{s.desc}</Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Emoji + Gradients */}
                    <Grid container spacing={3} sx={{ mb: 2 }}>
                        {/* Left Column: Emojis */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Floating Emojis" size="small" fullWidth
                                value={(draft.emoji_set || []).join(' ')}
                                onChange={e => setDraft(p => ({ ...p, emoji_set: e.target.value.split(/\s+/).filter(Boolean) }))}
                                placeholder="🌙 ✨ 🕌" helperText="Space-separated emojis" InputProps={{
                                    startAdornment: <EmojiEmotions sx={{ color: '#94A3B8', mr: 1, fontSize: 20 }} />,
                                }} />
                            
                            {/* Emoji Suggestions Array */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                {EMOJI_SUGGESTIONS.map(sug => (
                                    <Chip 
                                        key={sug.label} 
                                        label={sug.label === 'Clear' ? 'Clear' : sug.emojis} 
                                        size="small" 
                                        onClick={() => setDraft(p => ({ ...p, emoji_set: sug.emojis.split(' ').filter(Boolean) }))}
                                        sx={{ 
                                            bgcolor: 'rgba(255,255,255,0.05)', 
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: sug.label === 'Clear' ? '#94A3B8' : '#FFF',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                                        }}
                                    />
                                ))}
                            </Box>
                        </Grid>

                        {/* Right Column: Premium Gradients Array */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mb: 1, display: 'block' }}>
                                Premium Gradients Background
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                                {PREMIUM_GRADIENTS.map((grad, idx) => {
                                    const isSelected = draft.gradient_start === grad.start && draft.gradient_end === grad.end;
                                    return (
                                        <Box 
                                            key={idx}
                                            onClick={() => setDraft(p => ({ ...p, gradient_start: grad.start, gradient_end: grad.end }))}
                                            sx={{
                                                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                                                background: `linear-gradient(135deg, ${grad.start}, ${grad.end})`,
                                                border: isSelected ? '2px solid #FFF' : '2px solid transparent',
                                                boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none',
                                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                transition: 'transform 0.2s',
                                                '&:hover': { transform: 'scale(1.15)' }
                                            }}
                                        >
                                            {isSelected && <CheckCircle sx={{ color: '#FFF', fontSize: 18 }} />}
                                        </Box>
                                    );
                                })}
                            </Box>

                            {/* Hex Fallback */}
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, p: 0.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(15,23,42,0.5)' }}>
                                    <input type="color" value={draft.gradient_start ?? '#5B4CF2'}
                                        onChange={e => setDraft(p => ({ ...p, gradient_start: e.target.value }))}
                                        style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#94A3B8' }}>{draft.gradient_start}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, p: 0.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(15,23,42,0.5)' }}>
                                    <input type="color" value={draft.gradient_end ?? '#7C3AED'}
                                        onChange={e => setDraft(p => ({ ...p, gradient_end: e.target.value }))}
                                        style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#94A3B8' }}>{draft.gradient_end}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* ─── Schedule & Countdown ─── */}
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule sx={{ fontSize: 18 }} /> Schedule & Countdown
                    </Typography>
                    
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <DateTimePicker
                                    label="Auto-Publish Date & Time"
                                    value={draft.schedule_start ? dayjs(draft.schedule_start) : null}
                                    onChange={(newValue) => setDraft(p => ({ ...p, schedule_start: newValue ? newValue.toISOString() : '' }))}
                                    slotProps={{
                                        textField: { size: "small", fullWidth: true, helperText: "Shows automatically" }
                                    }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <DateTimePicker
                                    label="Auto-Hide Date & Time"
                                    value={draft.schedule_end ? dayjs(draft.schedule_end) : null}
                                    onChange={(newValue) => setDraft(p => ({ ...p, schedule_end: newValue ? newValue.toISOString() : '' }))}
                                    slotProps={{
                                        textField: { size: "small", fullWidth: true, helperText: "Hides automatically" }
                                    }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <DateTimePicker
                                    label="Countdown Timer End"
                                    value={draft.countdown_end ? dayjs(draft.countdown_end) : null}
                                    onChange={(newValue) => setDraft(p => ({ ...p, countdown_end: newValue ? newValue.toISOString() : '' }))}
                                    slotProps={{
                                        textField: { size: "small", fullWidth: true, helperText: "\"Offer ends in 2d 5h\"" }
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </LocalizationProvider>
                </DialogContent>

                <DialogActions sx={{ p: 2, pt: 1.5, gap: 1 }}>
                    <Button onClick={() => setEditDialogOpen(false)} sx={{ color: 'text.secondary', textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}
                        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                        sx={{
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
                            borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3,
                        }}>
                        {saving ? 'Saving...' : editingBannerId ? 'Save Changes' : 'Create Banner'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
