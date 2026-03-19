import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, IconButton, TextField,
    CircularProgress, Switch, Card, Alert, Divider, Chip,
    Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import CelebrationIcon from '@mui/icons-material/Celebration';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TimerIcon from '@mui/icons-material/Timer';
import { useBanners } from '../../hooks/useBanners';
import { PromotionalBanner } from '../../types/database';

// ──────────────────────────────────────────
// FESTIVAL THEME PRESETS
// ──────────────────────────────────────────
const FESTIVAL_PRESETS: Record<string, {
    label: string; icon: string;
    gradient_start: string; gradient_end: string;
    emoji_set: string[]; tag_text: string;
}> = {
    eid: {
        label: '🌙 Eid / Ramzan', icon: '🌙',
        gradient_start: '#065F46', gradient_end: '#047857',
        emoji_set: ['🌙', '✨', '🕌'], tag_text: 'EID SPECIAL',
    },
    diwali: {
        label: '🪔 Diwali', icon: '🪔',
        gradient_start: '#B45309', gradient_end: '#D97706',
        emoji_set: ['🪔', '✨', '🎆'], tag_text: 'DIWALI SALE',
    },
    independence: {
        label: '🇮🇳 Independence Day', icon: '🇮🇳',
        gradient_start: '#C2410C', gradient_end: '#059669',
        emoji_set: ['🇮🇳', '✨', '🎆'], tag_text: '15 AUG SPECIAL',
    },
    christmas: {
        label: '🎄 Christmas / New Year', icon: '🎄',
        gradient_start: '#991B1B', gradient_end: '#166534',
        emoji_set: ['🎄', '🎅', '❄️'], tag_text: 'NEW YEAR OFFER',
    },
    ugadi: {
        label: '🌼 Ugadi / Navratri', icon: '🌼',
        gradient_start: '#9333EA', gradient_end: '#DB2777',
        emoji_set: ['🌼', '🎉', '✨'], tag_text: 'FESTIVAL OFFER',
    },
    summer: {
        label: '☀️ Summer Sale', icon: '☀️',
        gradient_start: '#EA580C', gradient_end: '#EAB308',
        emoji_set: ['☀️', '🔥', '⚡'], tag_text: 'SUMMER SALE',
    },
    default: {
        label: '💜 Default (JamesTronic)', icon: '💜',
        gradient_start: '#5B4CF2', gradient_end: '#7C3AED',
        emoji_set: [], tag_text: '10 MINS',
    },
};

const ANIMATION_STYLES = [
    { value: 'particles', label: 'Particles ✨', desc: 'Floating luminous dots' },
    { value: 'celebration', label: 'Celebration 🎉', desc: 'Confetti + sparkles' },
    { value: 'aurora', label: 'Aurora 🌌', desc: 'Flowing color waves' },
    { value: 'minimal', label: 'Minimal ⚡', desc: 'Clean gradient only' },
];

export const AdminBannersPage: React.FC = () => {
    const [banners, setBanners] = useState<PromotionalBanner[]>([]);
    const { fetchBanners, createBanner, updateBanner, deleteBanner, loading } = useBanners();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<Partial<PromotionalBanner>>({});

    const loadBanners = useCallback(async () => {
        const { data, error: err } = await fetchBanners();
        if (data) setBanners(data);
        if (err) setError('Failed to load banners');
    }, [fetchBanners]);

    useEffect(() => { loadBanners(); }, []);

    const startEditing = (banner: PromotionalBanner) => {
        setEditingId(banner.id);
        setDraft({
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            highlight_text: banner.highlight_text || '',
            tag_text: banner.tag_text || '',
            offer_text: banner.offer_text || '',
            gradient_start: banner.gradient_start || '#5B4CF2',
            gradient_end: banner.gradient_end || '#7C3AED',
            animation_style: banner.animation_style || 'particles',
            cta_text: banner.cta_text || '',
            cta_link: banner.cta_link || '/book',
            schedule_start: banner.schedule_start || '',
            schedule_end: banner.schedule_end || '',
            countdown_end: banner.countdown_end || '',
            emoji_set: banner.emoji_set || [],
        });
    };

    const applyPreset = (key: string) => {
        const preset = FESTIVAL_PRESETS[key];
        if (!preset) return;
        setDraft(prev => ({
            ...prev,
            gradient_start: preset.gradient_start,
            gradient_end: preset.gradient_end,
            emoji_set: preset.emoji_set,
            tag_text: preset.tag_text,
            animation_style: key === 'default' ? 'particles' : 'celebration',
        }));
    };

    const saveBanner = async (id: string) => {
        setSaving(true); setError(null);
        // Clean empty schedule fields to null
        const payload = { ...draft };
        if (!payload.schedule_start) payload.schedule_start = undefined;
        if (!payload.schedule_end) payload.schedule_end = undefined;
        if (!payload.countdown_end) payload.countdown_end = undefined;

        const { error: err } = await updateBanner(id, payload);
        if (err) {
            setError('Failed to save banner.');
        } else {
            setSuccess('✅ Banner saved! Changes are live.');
            setEditingId(null);
            loadBanners();
            setTimeout(() => setSuccess(null), 3000);
        }
        setSaving(false);
    };

    const toggleActive = async (banner: PromotionalBanner) => {
        const { error: err } = await updateBanner(banner.id, { is_active: !banner.is_active });
        if (!err) setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !banner.is_active } : b));
    };

    const addNewBanner = async () => {
        const { error: err } = await createBanner({
            title: 'New Banner', subtitle: 'Your headline here',
            highlight_text: '₹999', tag_text: 'NEW',
            offer_text: 'Special offer details',
            gradient_start: '#667EEA', gradient_end: '#764BA2',
            banner_type: 'hero', animation_style: 'particles',
            is_active: false, order_index: banners.length,
            image_url: '',
        });
        if (!err) { loadBanners(); setSuccess('New banner created!'); setTimeout(() => setSuccess(null), 3000); }
    };

    const removeBanner = async (id: string) => {
        if (!window.confirm('Delete this banner? This cannot be undone.')) return;
        const { error: err } = await deleteBanner(id);
        if (!err) {
            setBanners(prev => prev.filter(b => b.id !== id));
            if (editingId === id) setEditingId(null);
        }
    };

    // ─── Live Preview ───
    const renderPreview = (banner: PromotionalBanner) => {
        const b = editingId === banner.id ? { ...banner, ...draft } : banner;
        const gradStart = b.gradient_start || '#5B4CF2';
        const gradEnd = b.gradient_end || '#7C3AED';
        const titleParts = (b.title || '').split(' ');
        const brand = titleParts.length > 1 ? titleParts.slice(0, -1).join(' ') : b.title;
        const accent = titleParts.length > 1 ? titleParts[titleParts.length - 1] : '';
        const emojis = b.emoji_set || [];

        return (
            <Box sx={{
                background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
                borderRadius: 4, p: 3, position: 'relative', overflow: 'hidden', minHeight: 170,
            }}>
                {/* Decorative orb */}
                <Box sx={{
                    position: 'absolute', top: -30, right: -20, width: 120, height: 120,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                }} />
                {/* Floating emojis preview */}
                {emojis.length > 0 && (
                    <Box sx={{ position: 'absolute', top: 12, right: 16, display: 'flex', gap: 0.5, opacity: 0.5 }}>
                        {emojis.map((e, i) => <span key={i} style={{ fontSize: 18 }}>{e}</span>)}
                    </Box>
                )}
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Typography sx={{ color: '#FFF', fontStyle: 'italic', fontWeight: 900, fontSize: '1.1rem' }}>
                            {brand} {accent && <span style={{ color: '#A78BFA' }}>{accent}</span>}
                        </Typography>
                        {b.tag_text && (
                            <Box sx={{
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                color: '#FFF', px: 1, py: 0.2, borderRadius: '4px',
                                fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                            }}>
                                {b.tag_text}
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ mb: 0.5 }}>
                        <Typography component="span" sx={{ color: '#FFF', fontWeight: 800, fontSize: '1.4rem', lineHeight: 1.2 }}>
                            {b.subtitle}{' '}
                        </Typography>
                        <Typography component="span" sx={{ color: '#FCD34D', fontWeight: 900, fontSize: '1.4rem', lineHeight: 1.2 }}>
                            {b.highlight_text}
                        </Typography>
                    </Box>
                    {b.offer_text && (
                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 500, mt: 0.5 }}>
                            {b.offer_text}
                        </Typography>
                    )}
                    {/* CTA preview */}
                    {b.cta_text && (
                        <Box sx={{
                            display: 'inline-block', mt: 1.5, background: 'rgba(255,255,255,0.9)',
                            color: gradStart, fontWeight: 800, fontSize: '0.8rem',
                            px: 2, py: 0.8, borderRadius: '10px',
                        }}>
                            {b.cta_text} →
                        </Box>
                    )}
                    {/* Schedule/Countdown indicators */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        {b.countdown_end && (
                            <Chip icon={<TimerIcon sx={{ fontSize: 14 }} />} label="Countdown Active"
                                size="small" sx={{ height: 22, fontSize: '0.65rem', background: 'rgba(255,255,255,0.2)', color: '#FFF' }} />
                        )}
                        {(b.schedule_start || b.schedule_end) && (
                            <Chip label="📅 Scheduled" size="small"
                                sx={{ height: 22, fontSize: '0.65rem', background: 'rgba(255,255,255,0.2)', color: '#FFF' }} />
                        )}
                    </Box>
                </Box>
            </Box>
        );
    };

    // ─── Edit Form ───
    const renderEditForm = (banner: PromotionalBanner) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 3 }}>
            {/* ─ SECTION: Festival Theme Presets ─ */}
            <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CelebrationIcon sx={{ fontSize: 18 }} /> Festival Theme Presets
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(FESTIVAL_PRESETS).map(([key, preset]) => (
                        <Button
                            key={key}
                            size="small"
                            onClick={() => applyPreset(key)}
                            sx={{
                                borderRadius: 3, textTransform: 'none', fontWeight: 600,
                                fontSize: '0.75rem', px: 1.5, py: 0.5,
                                background: `linear-gradient(135deg, ${preset.gradient_start}, ${preset.gradient_end})`,
                                color: '#FFF', border: '2px solid transparent',
                                '&:hover': { opacity: 0.9, border: '2px solid rgba(255,255,255,0.5)' },
                            }}
                        >
                            {preset.icon} {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Button>
                    ))}
                </Box>
            </Box>

            <Divider />

            {/* ─ SECTION: Content ─ */}
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>📝 Content</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Brand Title" size="small" fullWidth
                    value={draft.title ?? ''} onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="JamesTronic Care" helperText="Last word = accent color" />
                <TextField label="Tag Badge" size="small" sx={{ minWidth: 140 }}
                    value={draft.tag_text ?? ''} onChange={(e) => setDraft(prev => ({ ...prev, tag_text: e.target.value }))}
                    placeholder="10 MINS" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Headline" size="small" fullWidth
                    value={draft.subtitle ?? ''} onChange={(e) => setDraft(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Expert TV Repair at" />
                <TextField label="Price / Highlight" size="small" sx={{ minWidth: 140 }}
                    value={draft.highlight_text ?? ''} onChange={(e) => setDraft(prev => ({ ...prev, highlight_text: e.target.value }))}
                    placeholder="₹249*" />
            </Box>
            <TextField label="Offer Details" size="small" fullWidth
                value={draft.offer_text ?? ''} onChange={(e) => setDraft(prev => ({ ...prev, offer_text: e.target.value }))}
                placeholder="* Valid for first 3 bookings • Zero visitation fee" />

            <Divider />

            {/* ─ SECTION: CTA Button ─ */}
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>🔘 CTA Button (Optional)</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Button Text" size="small" fullWidth
                    value={draft.cta_text ?? ''} onChange={(e) => setDraft(prev => ({ ...prev, cta_text: e.target.value }))}
                    placeholder="Book Now" helperText='Leave empty to hide button' />
                <TextField label="Button Link" size="small" fullWidth
                    value={draft.cta_link ?? ''} onChange={(e) => setDraft(prev => ({ ...prev, cta_link: e.target.value }))}
                    placeholder="/book" />
            </Box>

            <Divider />

            {/* ─ SECTION: Animation & Colors ─ */}
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AutoAwesomeIcon sx={{ fontSize: 18 }} /> Animation & Colors
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Animation Style</InputLabel>
                    <Select
                        value={draft.animation_style ?? 'particles'}
                        label="Animation Style"
                        onChange={(e) => setDraft(prev => ({ ...prev, animation_style: e.target.value }))}
                    >
                        {ANIMATION_STYLES.map(s => (
                            <MenuItem key={s.value} value={s.value}>
                                {s.label} — <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>{s.desc}</span>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', mb: 0.5 }}>Floating Emojis</Typography>
                    <TextField size="small" fullWidth
                        value={(draft.emoji_set || []).join(' ')}
                        onChange={(e) => {
                            const emojis = e.target.value.split(/\s+/).filter(Boolean);
                            setDraft(prev => ({ ...prev, emoji_set: emojis }));
                        }}
                        placeholder="🌙 ✨ 🕌"
                        helperText="Space-separated emojis" />
                </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', mb: 0.5 }}>Gradient Start</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input type="color" value={draft.gradient_start ?? '#5B4CF2'}
                            onChange={(e) => setDraft(prev => ({ ...prev, gradient_start: e.target.value }))}
                            style={{ width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                        <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6B7280' }}>
                            {draft.gradient_start}
                        </Typography>
                    </Box>
                </Box>
                <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', mb: 0.5 }}>Gradient End</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input type="color" value={draft.gradient_end ?? '#7C3AED'}
                            onChange={(e) => setDraft(prev => ({ ...prev, gradient_end: e.target.value }))}
                            style={{ width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                        <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6B7280' }}>
                            {draft.gradient_end}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Divider />

            {/* ─ SECTION: Scheduling & Countdown ─ */}
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimerIcon sx={{ fontSize: 18 }} /> Schedule & Countdown
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Auto-Publish Date" type="datetime-local" size="small" fullWidth
                    value={draft.schedule_start ? new Date(draft.schedule_start).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, schedule_start: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                    InputLabelProps={{ shrink: true }} helperText="Banner shows automatically" />
                <TextField label="Auto-Hide Date" type="datetime-local" size="small" fullWidth
                    value={draft.schedule_end ? new Date(draft.schedule_end).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, schedule_end: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                    InputLabelProps={{ shrink: true }} helperText="Banner hides automatically" />
            </Box>
            <TextField label="Countdown Timer End" type="datetime-local" size="small" fullWidth
                value={draft.countdown_end ? new Date(draft.countdown_end).toISOString().slice(0, 16) : ''}
                onChange={(e) => setDraft(prev => ({ ...prev, countdown_end: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                InputLabelProps={{ shrink: true }}
                helperText='Shows "Offer ends in X days Y hrs" on the banner. Leave empty to disable.' />

            {/* ─ SAVE / CANCEL ─ */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
                <Button variant="outlined" onClick={() => setEditingId(null)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
                <Button variant="contained"
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                    disabled={saving} onClick={() => saveBanner(banner.id)}
                    sx={{
                        background: '#10B981', '&:hover': { background: '#059669' },
                        borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3,
                    }}>
                    {saving ? 'Saving...' : 'Save & Publish'}
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 900, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} color="#111827">Banner Manager</Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', mt: 0.5 }}>
                        Create promotional banners with animations, festivals themes & countdown timers. Changes go live instantly.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={addNewBanner}
                    sx={{ background: '#5B4CF2', '&:hover': { background: '#4F46E5' }, borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 3, py: 1.2 }}>
                    New Banner
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            <Divider sx={{ my: 3 }} />

            {loading && !banners.length ? (
                <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />
            ) : banners.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, background: '#F9FAFB', borderRadius: 4, border: '2px dashed #E5E7EB' }}>
                    <PreviewIcon sx={{ fontSize: 64, color: '#D1D5DB', mb: 2 }} />
                    <Typography sx={{ fontWeight: 700, color: '#374151' }}>No banners yet</Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: '0.9rem' }}>
                        Click "New Banner" to create your first hero banner with animations!
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {banners.map((banner) => (
                        <Card key={banner.id} sx={{
                            p: 3, borderRadius: 4,
                            border: editingId === banner.id ? '2px solid #5B4CF2' : '1px solid #E5E7EB',
                            boxShadow: editingId === banner.id ? '0 8px 25px rgba(91,76,242,0.15)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s',
                        }}>
                            {/* Status bar */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip label={banner.is_active ? '🟢 LIVE' : '⚫ Hidden'} size="small"
                                        sx={{ fontWeight: 700, fontSize: '0.75rem', background: banner.is_active ? '#D1FAE5' : '#F3F4F6', color: banner.is_active ? '#065F46' : '#6B7280' }} />
                                    <Chip label={`🎯 ${banner.banner_type === 'hero' ? 'Hero' : 'Promo'}`} size="small"
                                        sx={{ fontWeight: 600, fontSize: '0.75rem', background: '#EEF2FF', color: '#4338CA' }} />
                                    {banner.animation_style && (
                                        <Chip label={ANIMATION_STYLES.find(s => s.value === banner.animation_style)?.label || banner.animation_style}
                                            size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', background: '#FEF3C7', color: '#92400E' }} />
                                    )}
                                    {banner.countdown_end && (
                                        <Chip icon={<TimerIcon sx={{ fontSize: 14 }} />} label="Countdown" size="small"
                                            sx={{ fontWeight: 600, fontSize: '0.7rem', background: '#FEE2E2', color: '#991B1B' }} />
                                    )}
                                    {(banner.schedule_start || banner.schedule_end) && (
                                        <Chip label="📅" size="small"
                                            sx={{ fontWeight: 600, fontSize: '0.7rem', background: '#DBEAFE', color: '#1E40AF' }} />
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Switch checked={banner.is_active} onChange={() => toggleActive(banner)} size="small" color="success" />
                                    {editingId !== banner.id && (
                                        <IconButton size="small" onClick={() => startEditing(banner)}
                                            sx={{ color: '#5B4CF2', background: '#EEF2FF', '&:hover': { background: '#E0E7FF' } }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <IconButton size="small" onClick={() => removeBanner(banner.id)}
                                        sx={{ color: '#EF4444', background: '#FEF2F2', '&:hover': { background: '#FEE2E2' } }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Preview */}
                            {renderPreview(banner)}

                            {/* Edit Form */}
                            {editingId === banner.id && renderEditForm(banner)}
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    );
};
