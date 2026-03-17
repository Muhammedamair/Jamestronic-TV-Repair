import React from 'react';
import {
    Box, Typography, Container, Card, CardContent, IconButton, Button, Chip
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    ShoppingBag as ShopIcon,
    Tv as TvIcon,
    Headphones as HeadphonesIcon,
    SpeakerGroup as SpeakerIcon,
    NotificationsActive as NotifyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
    { label: 'Smart TVs', icon: <TvIcon />, color: '#5B4CF2', bg: '#EDE9FE' },
    { label: 'Soundbars', icon: <SpeakerIcon />, color: '#10B981', bg: '#D1FAE5' },
    { label: 'Accessories', icon: <HeadphonesIcon />, color: '#F59E0B', bg: '#FEF3C7' },
];

const CustomerBuyPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100dvh', background: '#F9FAFB', overflowX: 'hidden', width: '100%', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif', pb: 12 }}>
            {/* Header */}
            <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, background: '#FFF', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
                <IconButton onClick={() => navigate('/')} sx={{ color: '#111827' }}><BackIcon /></IconButton>
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem' }}>Buy Electronics</Typography>
                <Chip label="Coming Soon" size="small" sx={{ ml: 'auto', background: '#EDE9FE', color: '#5B4CF2', fontWeight: 700, fontSize: '0.7rem' }} />
            </Box>

            <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
                {/* Hero Card */}
                <Card sx={{ background: 'linear-gradient(135deg, #5B4CF2 0%, #4338CA 100%)', borderRadius: 5, mb: 4, boxShadow: '0 8px 32px rgba(91,76,242,0.25)', overflow: 'hidden', position: 'relative' }}>
                    <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
                        <Box sx={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                            <ShopIcon sx={{ fontSize: 40, color: '#FFF' }} />
                        </Box>
                        <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: '1.6rem', mb: 1, letterSpacing: '-0.5px' }}>
                            JamesTronic Store
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', mb: 3, lineHeight: 1.6 }}>
                            Buy quality electronics from JamesTronic — Smart TVs, Soundbars, Accessories & more. Delivered to your doorstep.
                        </Typography>
                        <Chip label="🚀 Launching Soon" sx={{ background: 'rgba(255,255,255,0.2)', color: '#FFF', fontWeight: 700, fontSize: '0.85rem', px: 2, py: 0.5 }} />
                    </CardContent>
                </Card>

                {/* Category Preview */}
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.2rem', mb: 2.5 }}>
                    Browse Categories
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    {CATEGORIES.map((cat) => (
                        <Card key={cat.label} sx={{ flex: 1, textAlign: 'center', borderRadius: 4, border: '1px solid #F3F4F6', boxShadow: 'none', opacity: 0.7, cursor: 'default' }}>
                            <CardContent sx={{ p: 2, pb: '16px !important' }}>
                                <Box sx={{ background: cat.bg, width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, color: cat.color }}>
                                    {cat.icon}
                                </Box>
                                <Typography sx={{ color: '#111827', fontWeight: 700, fontSize: '0.8rem' }}>{cat.label}</Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                {/* Notify Me */}
                <Card sx={{ background: '#FFF', border: '2px dashed #E5E7EB', borderRadius: 4, textAlign: 'center', boxShadow: 'none' }}>
                    <CardContent sx={{ py: 4 }}>
                        <NotifyIcon sx={{ fontSize: 40, color: '#F59E0B', mb: 2 }} />
                        <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem', mb: 1 }}>
                            Get Notified When We Launch
                        </Typography>
                        <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', mb: 3, lineHeight: 1.6 }}>
                            Be the first to shop from JamesTronic's online store. We'll notify you on WhatsApp!
                        </Typography>
                        <Button variant="contained" startIcon={<NotifyIcon />}
                            sx={{ px: 4, py: 1.5, borderRadius: 3, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1rem', boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' } }}>
                            Notify Me
                        </Button>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
};

export default CustomerBuyPage;
