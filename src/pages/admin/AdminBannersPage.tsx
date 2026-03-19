import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Button, IconButton, TextField,
    CircularProgress, Switch, Card, Alert, Divider, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { useBanners } from '../../hooks/useBanners';
import { PromotionalBanner } from '../../types/database';

export const AdminBannersPage: React.FC = () => {
    const [banners, setBanners] = useState<PromotionalBanner[]>([]);
    const { fetchBanners, createBanner, updateBanner, deleteBanner, loading } = useBanners();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Draft state for the banner being edited
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
        });
    };

    const saveBanner = async (id: string) => {
        setSaving(true);
        setError(null);
        const { error: err } = await updateBanner(id, draft);
        if (err) {
            setError('Failed to save banner.');
        } else {
            setSuccess('Banner saved! Changes are live.');
            setEditingId(null);
            loadBanners();
            setTimeout(() => setSuccess(null), 3000);
        }
        setSaving(false);
    };

    const toggleActive = async (banner: PromotionalBanner) => {
        const { error: err } = await updateBanner(banner.id, { is_active: !banner.is_active });
        if (err) {
            setError('Failed to toggle status.');
        } else {
            setBanners(prev => prev.map(b =>
                b.id === banner.id ? { ...b, is_active: !banner.is_active } : b
            ));
        }
    };

    const addNewBanner = async () => {
        const { error: err } = await createBanner({
            title: 'New Banner',
            subtitle: 'Your headline here',
            highlight_text: '₹999',
            tag_text: 'NEW',
            offer_text: 'Special offer details',
            gradient_start: '#667EEA',
            gradient_end: '#764BA2',
            banner_type: 'hero',
            animation_style: 'particles',
            is_active: false,
            order_index: banners.length,
            image_url: '',
        });
        if (err) {
            setError('Failed to create banner.');
        } else {
            loadBanners();
            setSuccess('New banner created! Edit the content below.');
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    const removeBanner = async (id: string) => {
        if (!window.confirm('Delete this banner? This cannot be undone.')) return;
        const { error: err } = await deleteBanner(id);
        if (err) {
            setError('Failed to delete.');
        } else {
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

        return (
            <Box sx={{
                background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
                borderRadius: 4, p: 3, position: 'relative', overflow: 'hidden',
                minHeight: 160,
            }}>
                {/* Decorative orb */}
                <Box sx={{
                    position: 'absolute', top: -30, right: -20,
                    width: 120, height: 120, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                }} />
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
                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 500, mt: 1 }}>
                            {b.offer_text}
                        </Typography>
                    )}
                </Box>
            </Box>
        );
    };

    // ─── Edit Form ───
    const renderEditForm = (banner: PromotionalBanner) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    label="Brand Title"
                    size="small"
                    fullWidth
                    value={draft.title ?? banner.title ?? ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. JamesTronic Care"
                    helperText="Last word becomes accent color"
                />
                <TextField
                    label="Tag Badge"
                    size="small"
                    value={draft.tag_text ?? banner.tag_text ?? ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, tag_text: e.target.value }))}
                    placeholder="10 MINS"
                    sx={{ minWidth: 140 }}
                />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    label="Headline Subtitle"
                    size="small"
                    fullWidth
                    value={draft.subtitle ?? banner.subtitle ?? ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Expert TV Repair at"
                />
                <TextField
                    label="Price / Highlight"
                    size="small"
                    value={draft.highlight_text ?? banner.highlight_text ?? ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, highlight_text: e.target.value }))}
                    placeholder="₹249*"
                    sx={{ minWidth: 140 }}
                />
            </Box>
            <TextField
                label="Offer Details"
                size="small"
                fullWidth
                value={draft.offer_text ?? banner.offer_text ?? ''}
                onChange={(e) => setDraft(prev => ({ ...prev, offer_text: e.target.value }))}
                placeholder="* Valid for first 3 bookings • Zero visitation fee"
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', mb: 0.5 }}>
                        Gradient Start
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input
                            type="color"
                            value={draft.gradient_start ?? banner.gradient_start ?? '#5B4CF2'}
                            onChange={(e) => setDraft(prev => ({ ...prev, gradient_start: e.target.value }))}
                            style={{ width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        />
                        <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6B7280' }}>
                            {draft.gradient_start ?? banner.gradient_start ?? '#5B4CF2'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', mb: 0.5 }}>
                        Gradient End
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input
                            type="color"
                            value={draft.gradient_end ?? banner.gradient_end ?? '#7C3AED'}
                            onChange={(e) => setDraft(prev => ({ ...prev, gradient_end: e.target.value }))}
                            style={{ width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        />
                        <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6B7280' }}>
                            {draft.gradient_end ?? banner.gradient_end ?? '#7C3AED'}
                        </Typography>
                    </Box>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
                <Button
                    variant="outlined"
                    onClick={() => setEditingId(null)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                    disabled={saving}
                    onClick={() => saveBanner(banner.id)}
                    sx={{
                        background: '#10B981', '&:hover': { background: '#059669' },
                        borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3,
                    }}
                >
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
                    <Typography variant="h4" fontWeight={800} color="#111827">
                        Banner Manager
                    </Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', mt: 0.5 }}>
                        Control the hero banner on the customer landing page. Changes go live instantly.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addNewBanner}
                    sx={{
                        background: '#5B4CF2', '&:hover': { background: '#4F46E5' },
                        borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 3, py: 1.2,
                    }}
                >
                    New Banner
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            <Divider sx={{ my: 3 }} />

            {/* Banner List */}
            {loading && !banners.length ? (
                <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />
            ) : banners.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, background: '#F9FAFB', borderRadius: 4, border: '2px dashed #E5E7EB' }}>
                    <PreviewIcon sx={{ fontSize: 64, color: '#D1D5DB', mb: 2 }} />
                    <Typography sx={{ fontWeight: 700, color: '#374151' }}>No banners yet</Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: '0.9rem' }}>
                        Click "New Banner" to create your first hero banner
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {banners.map((banner) => (
                        <Card
                            key={banner.id}
                            sx={{
                                p: 3, borderRadius: 4,
                                border: editingId === banner.id ? '2px solid #5B4CF2' : '1px solid #E5E7EB',
                                boxShadow: editingId === banner.id
                                    ? '0 8px 25px rgba(91,76,242,0.15)'
                                    : '0 4px 6px -1px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {/* Status + Actions bar */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Chip
                                        label={banner.is_active ? '🟢 LIVE' : '⚫ Hidden'}
                                        size="small"
                                        sx={{
                                            fontWeight: 700, fontSize: '0.75rem',
                                            background: banner.is_active ? '#D1FAE5' : '#F3F4F6',
                                            color: banner.is_active ? '#065F46' : '#6B7280',
                                        }}
                                    />
                                    <Chip
                                        label={banner.banner_type === 'hero' ? '🎯 Hero Banner' : '📢 Promo Card'}
                                        size="small"
                                        sx={{ fontWeight: 600, fontSize: '0.75rem', background: '#EEF2FF', color: '#4338CA' }}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Switch
                                        checked={banner.is_active}
                                        onChange={() => toggleActive(banner)}
                                        size="small"
                                        color="success"
                                    />
                                    {editingId !== banner.id && (
                                        <IconButton
                                            size="small"
                                            onClick={() => startEditing(banner)}
                                            sx={{ color: '#5B4CF2', background: '#EEF2FF', '&:hover': { background: '#E0E7FF' } }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <IconButton
                                        size="small"
                                        onClick={() => removeBanner(banner.id)}
                                        sx={{ color: '#EF4444', background: '#FEF2F2', '&:hover': { background: '#FEE2E2' } }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Live Preview */}
                            {renderPreview(banner)}

                            {/* Edit Form (only when editing) */}
                            {editingId === banner.id && renderEditForm(banner)}
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    );
};
