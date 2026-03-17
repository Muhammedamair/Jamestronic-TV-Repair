import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, IconButton,
    CircularProgress, Switch, Card, TextField, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useBanners } from '../../hooks/useBanners';
import { PromotionalBanner } from '../../types/database';

export const AdminBannersPage: React.FC = () => {
    const [banners, setBanners] = useState<PromotionalBanner[]>([]);
    const { fetchBanners, uploadBannerImage, createBanner, updateBanner, deleteBanner, loading } = useBanners();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadBanners = async () => {
        const { data, error } = await fetchBanners();
        if (data) setBanners(data);
        if (error) setError('Failed to load banners');
    };

    useEffect(() => {
        loadBanners();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (png, jpg, webp).');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError('Image should be under 2MB to keep the app fast.');
            return;
        }

        setUploading(true);
        setError(null);

        const { url, error: uploadErr } = await uploadBannerImage(file);
        
        if (uploadErr || !url) {
            setError('Image upload failed.');
            setUploading(false);
            return;
        }

        // Create new banner record
        const { error: createErr } = await createBanner({
            image_url: url,
            is_active: true,
            order_index: banners.length
        });

        if (createErr) {
            setError('Failed to save banner record.');
        } else {
            loadBanners();
        }
        
        setUploading(false);
    };

    const toggleActive = async (banner: PromotionalBanner) => {
        const { error: updateErr } = await updateBanner(banner.id, { is_active: !banner.is_active });
        if (updateErr) {
            setError('Failed to update status.');
        } else {
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !banner.is_active } : b));
        }
    };

    const updateLink = async (banner: PromotionalBanner, newLink: string) => {
        const { error: updateErr } = await updateBanner(banner.id, { link_url: newLink });
        if (updateErr) {
            setError('Failed to save link.');
        } else {
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, link_url: newLink } : b));
        }
    };

    const removeBanner = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this banner? This cannot be undone.')) return;
        
        const { error: deleteErr } = await deleteBanner(id);
        if (deleteErr) {
            setError('Failed to delete banner.');
        } else {
            setBanners(prev => prev.filter(b => b.id !== id));
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight={800} color="#111827">Manage Banners</Typography>
                
                <Button
                    component="label"
                    variant="contained"
                    startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <AddPhotoAlternateIcon />}
                    disabled={uploading}
                    sx={{
                        background: '#5B4CF2', '&:hover': { background: '#4F46E5' },
                        borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 3, py: 1.2
                    }}
                >
                    {uploading ? 'Uploading...' : 'Upload New Banner'}
                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', mb: 4, maxWidth: 600 }}>
                These promotional banners will scroll automatically on the Customer Landing Page. Banners marked as "Active" will be visible immediately. Use a consistent aspect ratio (e.g. 16:9 or 21:9) for the best look.
            </Typography>

            {loading && !uploading && banners.length === 0 ? (
                <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />
            ) : banners.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8, background: '#F9FAFB', borderRadius: 4, border: '2px dashed #E5E7EB' }}>
                    <AddPhotoAlternateIcon sx={{ fontSize: 64, color: '#D1D5DB', mb: 2 }} />
                    <Typography sx={{ fontWeight: 700, color: '#374151' }}>No banners uploaded yet</Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: '0.9rem' }}>Upload your first promotional banner to make the landing page pop!</Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {banners.map((banner) => (
                        <Card key={banner.id} sx={{ 
                            p: 2, display: 'flex', gap: 3, alignItems: 'center', borderRadius: 3,
                            border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }}>
                            <Box sx={{ color: '#D1D5DB', cursor: 'grab' }}>
                                <DragIndicatorIcon />
                            </Box>

                            <Box sx={{ 
                                width: 240, height: 120, borderRadius: 2, overflow: 'hidden', 
                                background: '#F3F4F6', flexShrink: 0 
                            }}>
                                <img 
                                    src={banner.image_url} 
                                    alt="Promotional Banner" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            </Box>

                            <Box sx={{ flex: 1 }}>
                                <TextField
                                    label="Action Link (Optional URL)"
                                    fullWidth
                                    size="small"
                                    defaultValue={banner.link_url || ''}
                                    placeholder="e.g. https://jamestronic.com/diwali-offer"
                                    onBlur={(e) => {
                                        if (e.target.value !== banner.link_url) {
                                            updateLink(banner, e.target.value);
                                        }
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Switch
                                        checked={banner.is_active}
                                        onChange={() => toggleActive(banner)}
                                        color="primary"
                                    />
                                    <Typography sx={{ fontWeight: 600, color: banner.is_active ? '#10B981' : '#6B7280' }}>
                                        {banner.is_active ? 'Live / Active' : 'Hidden'}
                                    </Typography>
                                </Box>
                            </Box>

                            <IconButton 
                                onClick={() => removeBanner(banner.id)}
                                sx={{ color: '#EF4444', background: '#FEF2F2', '&:hover': { background: '#FEE2E2' }, p: 1.5 }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    );
};
