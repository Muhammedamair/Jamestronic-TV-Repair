import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Button, TextField, Container, Card, CardContent,
    InputAdornment, Chip, IconButton, useMediaQuery, useTheme
} from '@mui/material';
import {
    PhoneAndroid as PhoneIcon,
    LocationOn as LocationIcon,
    Build as RepairIcon,
    SettingsInputAntenna as InstallIcon,
    ArrowForward as ArrowIcon,
    Star as StarIcon,
    CheckCircle as CheckIcon,
    LocalShipping as TruckIcon,
    Search as SearchIcon,
    Shield as ShieldIcon,
    Phone as PhoneCallIcon, 
    WhatsApp as WhatsAppIcon,
    ConfirmationNumber as TicketIcon,
    Person as PersonIcon,
    Verified as VerifiedIcon,
    SupportAgent as SupportIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const SERVICES = [
    { id: 'repair', label: 'TV Repair', icon: <RepairIcon />, desc: 'Expert diagnosis & repair for all TV brands', color: '#6C63FF' },
    { id: 'installation', label: 'TV Installation', icon: <InstallIcon />, desc: 'Wall mount & setup by certified technicians', color: '#10B981' },
];

const STEPS = [
    { num: '01', title: 'Book Service', desc: 'Enter your mobile & address — takes 30 seconds', icon: <PhoneIcon />, color: '#6C63FF' },
    { num: '02', title: 'We Pick Up', desc: 'Our transporter collects your TV from your doorstep', icon: <TruckIcon />, color: '#F59E0B' },
    { num: '03', title: 'Expert Repair', desc: 'Certified technicians diagnose & fix at our centre', icon: <RepairIcon />, color: '#10B981' },
    { num: '04', title: 'Delivered Back', desc: 'Your TV returns working perfectly — guaranteed', icon: <CheckIcon />, color: '#00D9FF' },
];

const TRUST_STATS = [
    { value: '500+', label: 'TVs Repaired', icon: <PersonIcon /> }, // Changed icon to PersonIcon for consistency with new header
    { value: '4.9★', label: 'Google Rating', icon: <StarIcon /> },
    { value: '24hr', label: 'Avg Turnaround', icon: <PhoneCallIcon /> }, // Changed icon to PhoneCallIcon
    { value: '100%', label: 'Service Warranty', icon: <ShieldIcon /> },
];

const TV_BRANDS = ['Samsung', 'LG', 'Sony', 'Mi/Xiaomi', 'OnePlus', 'TCL', 'Vu', 'Hisense', 'Panasonic', 'Other'];

const CustomerLandingPage: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [selectedService, setSelectedService] = useState<string>('repair');
    const [mobile, setMobile] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [animatedStats, setAnimatedStats] = useState<number[]>([0, 0, 0, 0]);
    const statsRef = useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = useState(false);

    // Animate stats on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    const targets = [500, 4.9, 24, 100];
                    const duration = 1500;
                    const steps = 60;
                    let step = 0;
                    const interval = setInterval(() => {
                        step++;
                        const progress = Math.min(step / steps, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setAnimatedStats(targets.map(t => Math.round(t * eased * 10) / 10));
                        if (step >= steps) clearInterval(interval);
                    }, duration / steps);
                }
            },
            { threshold: 0.3 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    // Handle scroll for fixed header
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleBookNow = () => {
        if (mobile.length >= 10) {
            navigate(`/book?mobile=${mobile}&service=${selectedService}`);
        } else {
            navigate(`/book?service=${selectedService}`);
        }
    };

    const handleTrack = () => {
        if (trackingNumber.trim()) {
            navigate(`/track/${trackingNumber.trim()}`);
        }
    };

    return (
        <Box sx={{ 
            minHeight: '100dvh', 
            background: 'linear-gradient(180deg, #0A0E1A 0%, #111827 50%, #0F172A 100%)',
            overflowX: 'hidden'
        }}>
            {/* Header / Nav */}
            <Box sx={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100,
                background: scrolled ? 'rgba(10,14,26,0.9)' : 'transparent',
                backdropFilter: scrolled ? 'blur(10px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(148,163,184,0.1)' : '1px solid transparent',
                transition: 'all 0.3s ease',
                py: 2, px: { xs: 2, md: 4 }
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, mx: 'auto' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#F8FAFC', cursor: 'pointer' }} onClick={() => navigate('/')}>
                        JamesTronic
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button
                            variant="text"
                            onClick={() => navigate('/my-tickets')}
                            startIcon={<PersonIcon />}
                            sx={{
                                color: '#94A3B8', textTransform: 'none', fontWeight: 600,
                                '&:hover': { color: '#F8FAFC', background: 'rgba(148,163,184,0.1)' }
                            }}
                        >
                            My Tickets
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<PhoneCallIcon />}
                            href="tel:+919885422901"
                            sx={{
                                color: '#10B981', borderColor: 'rgba(16,185,129,0.5)',
                                textTransform: 'none', fontWeight: 600, borderRadius: 2,
                                display: { xs: 'none', sm: 'flex' },
                                '&:hover': { borderColor: '#10B981', background: 'rgba(16,185,129,0.1)' }
                            }}
                        >
                            Call Us
                        </Button>
                        <IconButton
                            href="tel:+919885422901"
                            sx={{
                                color: '#10B981', background: 'rgba(16,185,129,0.1)',
                                display: { xs: 'flex', sm: 'none' }
                            }}
                        >
                            <PhoneCallIcon />
                        </IconButton>
                    </Box>
                </Box>
            </Box>

            {/* ════════ HERO SECTION ════════ */}
            <Container maxWidth="md" sx={{ pt: { xs: 4, md: 8 }, pb: { xs: 4, md: 6 }, textAlign: 'center' }}>
                {/* Specialty Badge */}
                <Chip
                    icon={<VerifiedIcon sx={{ fontSize: 16, color: '#F59E0B !important' }} />}
                    label="Hyderabad's Specialised TV Repair Experts"
                    sx={{
                        mb: 3, px: 1, py: 2.5,
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.2)',
                        color: '#F59E0B', fontWeight: 600, fontSize: '0.8rem',
                        letterSpacing: '0.02em',
                        '& .MuiChip-icon': { ml: 1 }
                    }}
                />

                {/* Hero Headline */}
                <Typography
                    variant="h1"
                    sx={{
                        color: '#F8FAFC',
                        fontSize: { xs: '2rem', sm: '2.8rem', md: '3.5rem' },
                        fontWeight: 800,
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        mb: 2,
                    }}
                >
                    Your TV, Fixed
                    <Box component="span" sx={{
                        background: 'linear-gradient(135deg, #6C63FF, #00D9FF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'block'
                    }}>
                        Right at Your Doorstep.
                    </Box>
                </Typography>

                <Typography sx={{
                    color: '#94A3B8', fontSize: { xs: '1rem', md: '1.15rem' },
                    maxWidth: 500, mx: 'auto', mb: 4, lineHeight: 1.7
                }}>
                    We pick up your TV, repair it at our service centre, and deliver it back — all with real-time updates.
                </Typography>

                {/* ═══ Service Selection ═══ */}
                <Box sx={{
                    display: 'flex', justifyContent: 'center', gap: 2, mb: 3,
                    flexDirection: { xs: 'column', sm: 'row' },
                    px: { xs: 2, sm: 0 }
                }}>
                    {SERVICES.map(svc => (
                        <Card
                            key={svc.id}
                            onClick={() => setSelectedService(svc.id)}
                            sx={{
                                flex: { sm: 1 }, maxWidth: 260,
                                cursor: 'pointer',
                                background: selectedService === svc.id
                                    ? `linear-gradient(135deg, ${svc.color}15, ${svc.color}08)`
                                    : 'rgba(30,41,59,0.4)',
                                border: `2px solid ${selectedService === svc.id ? `${svc.color}60` : 'rgba(148,163,184,0.08)'}`,
                                borderRadius: 3,
                                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                                transform: selectedService === svc.id ? 'scale(1.02)' : 'scale(1)',
                                '&:hover': {
                                    borderColor: `${svc.color}40`,
                                    transform: 'scale(1.02)',
                                }
                            }}
                        >
                            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                                <Box sx={{
                                    color: selectedService === svc.id ? svc.color : '#64748B',
                                    mb: 1, transition: 'color 0.3s',
                                    '& svg': { fontSize: 32 }
                                }}>
                                    {svc.icon}
                                </Box>
                                <Typography sx={{
                                    color: selectedService === svc.id ? '#F8FAFC' : '#94A3B8',
                                    fontWeight: 700, fontSize: '1rem', mb: 0.5
                                }}>
                                    {svc.label}
                                </Typography>
                                <Typography sx={{ color: '#64748B', fontSize: '0.75rem' }}>
                                    {svc.desc}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                {/* ═══ Booking CTA Card ═══ */}
                <Card sx={{
                    maxWidth: 440, mx: 'auto',
                    background: 'rgba(30,41,59,0.6)',
                    border: '1px solid rgba(148,163,184,0.1)',
                    borderRadius: 4,
                    backdropFilter: 'blur(10px)',
                    overflow: 'visible'
                }}>
                    <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                        <TextField
                            fullWidth
                            placeholder="Enter your mobile number"
                            value={mobile}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setMobile(v);
                            }}
                            type="tel"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Typography sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.95rem' }}>+91</Typography>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(15,23,42,0.6)',
                                    borderRadius: 2.5,
                                    fontSize: '1.1rem',
                                    color: '#F8FAFC',
                                    '& fieldset': { borderColor: 'rgba(148,163,184,0.15)' },
                                    '&:hover fieldset': { borderColor: 'rgba(108,99,255,0.4)' },
                                    '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
                                },
                            }}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleBookNow}
                            endIcon={<ArrowIcon />}
                            sx={{
                                py: 1.8, borderRadius: 2.5,
                                fontSize: '1.05rem', fontWeight: 700,
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                    boxShadow: '0 12px 40px rgba(16,185,129,0.4)',
                                    transform: 'translateY(-1px)',
                                },
                                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                            }}
                        >
                            📺 Book Service Now
                        </Button>
                        <Typography sx={{ color: '#64748B', fontSize: '0.7rem', mt: 1.5, textAlign: 'center' }}>
                            No payment required at booking • Free pickup & delivery
                        </Typography>
                    </CardContent>
                </Card>
            </Container>

            {/* ════════ TRUST STATS ════════ */}
            <Box ref={statsRef} sx={{
                py: { xs: 4, md: 6 },
                background: 'rgba(15,23,42,0.4)',
                borderTop: '1px solid rgba(148,163,184,0.05)',
                borderBottom: '1px solid rgba(148,163,184,0.05)',
            }}>
                <Container maxWidth="md">
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                        gap: { xs: 2, md: 3 }
                    }}>
                        {TRUST_STATS.map((stat, i) => (
                            <Box key={i} sx={{ textAlign: 'center' }}>
                                <Box sx={{ color: '#F59E0B', mb: 0.5, '& svg': { fontSize: 28 } }}>
                                    {stat.icon}
                                </Box>
                                <Typography sx={{
                                    color: '#F8FAFC', fontWeight: 800,
                                    fontSize: { xs: '1.5rem', md: '2rem' },
                                    lineHeight: 1.2
                                }}>
                                    {i === 0 ? `${Math.round(animatedStats[0])}+` :
                                     i === 1 ? `${animatedStats[1].toFixed(1)}★` :
                                     i === 2 ? `${Math.round(animatedStats[2])}hr` :
                                     `${Math.round(animatedStats[3])}%`}
                                </Typography>
                                <Typography sx={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {stat.label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ════════ HOW IT WORKS ════════ */}
            <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
                <Typography sx={{
                    color: '#F8FAFC', fontWeight: 700,
                    fontSize: { xs: '1.5rem', md: '2rem' },
                    textAlign: 'center', mb: 1
                }}>
                    How It Works
                </Typography>
                <Typography sx={{ color: '#64748B', textAlign: 'center', mb: 5, fontSize: '0.95rem' }}>
                    From booking to delivery — we handle everything.
                </Typography>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 3
                }}>
                    {STEPS.map((step, i) => (
                        <Box key={i} sx={{ textAlign: 'center', position: 'relative' }}>
                            {/* Step number */}
                            <Typography sx={{
                                color: `${step.color}30`, fontSize: '3rem', fontWeight: 900,
                                lineHeight: 1, mb: -1.5, position: 'relative', zIndex: 0
                            }}>
                                {step.num}
                            </Typography>
                            <Box sx={{
                                width: 56, height: 56,
                                borderRadius: '50%',
                                background: `${step.color}15`,
                                border: `2px solid ${step.color}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mx: 'auto', mb: 2,
                                color: step.color,
                                position: 'relative', zIndex: 1,
                                '& svg': { fontSize: 24 }
                            }}>
                                {step.icon}
                            </Box>
                            <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: '0.95rem', mb: 0.5 }}>
                                {step.title}
                            </Typography>
                            <Typography sx={{ color: '#64748B', fontSize: '0.8rem', lineHeight: 1.5, px: 1 }}>
                                {step.desc}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Container>

            {/* ════════ TV BRANDS WE SERVICE ════════ */}
            <Box sx={{
                py: { xs: 4, md: 6 },
                background: 'rgba(15,23,42,0.3)',
                borderTop: '1px solid rgba(148,163,184,0.05)',
            }}>
                <Container maxWidth="md">
                    <Typography sx={{
                        color: '#F8FAFC', fontWeight: 700,
                        fontSize: { xs: '1.2rem', md: '1.5rem' },
                        textAlign: 'center', mb: 3
                    }}>
                        All TV Brands. One Expert Team.
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}>
                        {TV_BRANDS.map(brand => (
                            <Chip
                                key={brand}
                                label={brand}
                                sx={{
                                    backgroundColor: 'rgba(30,41,59,0.6)',
                                    border: '1px solid rgba(148,163,184,0.1)',
                                    color: '#CBD5E1',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    px: 1, py: 2.5,
                                    '&:hover': {
                                        backgroundColor: 'rgba(108,99,255,0.1)',
                                        borderColor: 'rgba(108,99,255,0.3)',
                                    }
                                }}
                            />
                        ))}
                    </Box>
                </Container>
            </Box>

            {/* ════════ TRACK YOUR TV ════════ */}
            <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
                <Card sx={{
                    background: 'linear-gradient(135deg, rgba(0,217,255,0.05), rgba(108,99,255,0.05))',
                    border: '1px solid rgba(0,217,255,0.15)',
                    borderRadius: 4, overflow: 'visible'
                }}>
                    <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
                        <Typography sx={{ color: '#00D9FF', fontWeight: 700, fontSize: '1.2rem', mb: 1 }}>
                            🔍 Track Your TV
                        </Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.85rem', mb: 3 }}>
                            Already booked? Enter your ticket number to see real-time status.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <TextField
                                fullWidth
                                placeholder="e.g. JT-20260317001"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgba(15,23,42,0.6)',
                                        borderRadius: 2,
                                        color: '#F8FAFC',
                                        '& fieldset': { borderColor: 'rgba(148,163,184,0.15)' },
                                        '&:hover fieldset': { borderColor: 'rgba(0,217,255,0.4)' },
                                        '&.Mui-focused fieldset': { borderColor: '#00D9FF' },
                                    },
                                }}
                            />
                            <Button
                                variant="contained"
                                onClick={handleTrack}
                                sx={{
                                    px: 3, borderRadius: 2,
                                    background: 'linear-gradient(135deg, #00D9FF, #6C63FF)',
                                    fontWeight: 700, textTransform: 'none',
                                    minWidth: 'auto',
                                    '&:hover': { background: 'linear-gradient(135deg, #00B4D8, #5B54E6)' }
                                }}
                            >
                                Track
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Container>

            {/* ════════ WHY JAMESTRONIC ════════ */}
            <Container maxWidth="md" sx={{ pb: { xs: 5, md: 8 } }}>
                <Typography sx={{
                    color: '#F8FAFC', fontWeight: 700,
                    fontSize: { xs: '1.3rem', md: '1.8rem' },
                    textAlign: 'center', mb: 4
                }}>
                    Why Choose JamesTronic?
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2.5
                }}>
                    {[
                        {
                            icon: <VerifiedIcon />, color: '#6C63FF',
                            title: 'TV Specialists Only',
                            desc: 'Unlike multi-category platforms, we focus exclusively on TV repair & installation. Our technicians are TV experts.'
                        },
                        {
                            icon: <TruckIcon />, color: '#10B981',
                            title: 'Free Doorstep Pickup',
                            desc: 'Our transporter comes to your home, picks up the TV, and brings it back after repair — no extra charge.'
                        },
                        {
                            icon: <ShieldIcon />, color: '#F59E0B',
                            title: 'Service Warranty',
                            desc: 'Every repair comes with a warranty. If the same issue returns, we fix it free — that\'s our guarantee.'
                        },
                        {
                            icon: <SupportIcon />, color: '#00D9FF',
                            title: 'Real-Time Updates',
                            desc: 'Track your TV\'s repair progress live on WhatsApp. Know exactly where your TV is at every stage.'
                        },
                    ].map((item, i) => (
                        <Card key={i} sx={{
                            background: 'rgba(30,41,59,0.4)',
                            border: '1px solid rgba(148,163,184,0.08)',
                            borderRadius: 3,
                            transition: 'all 0.3s',
                            '&:hover': {
                                borderColor: `${item.color}30`,
                                transform: 'translateY(-2px)'
                            }
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ color: item.color, mb: 1.5, '& svg': { fontSize: 28 } }}>
                                    {item.icon}
                                </Box>
                                <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                                    {item.title}
                                </Typography>
                                <Typography sx={{ color: '#94A3B8', fontSize: '0.82rem', lineHeight: 1.6 }}>
                                    {item.desc}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </Container>

            {/* ════════ BOTTOM CTA ════════ */}
            <Box sx={{
                py: { xs: 5, md: 7 },
                background: 'linear-gradient(180deg, rgba(108,99,255,0.08), rgba(16,185,129,0.05))',
                borderTop: '1px solid rgba(108,99,255,0.1)',
                textAlign: 'center'
            }}>
                <Container maxWidth="sm">
                    <Typography sx={{
                        color: '#F8FAFC', fontWeight: 800,
                        fontSize: { xs: '1.5rem', md: '2rem' }, mb: 2
                    }}>
                        Ready to get your TV fixed?
                    </Typography>
                    <Typography sx={{ color: '#94A3B8', mb: 3, fontSize: '0.95rem' }}>
                        Book now in 30 seconds. No payment required upfront.
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate('/book')}
                        endIcon={<ArrowIcon />}
                        sx={{
                            py: 1.8, px: 5, borderRadius: 3,
                            fontSize: '1.1rem', fontWeight: 700,
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #6C63FF 0%, #8B85FF 100%)',
                            boxShadow: '0 8px 32px rgba(108,99,255,0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5B54E6 0%, #7B75FF 100%)',
                                boxShadow: '0 12px 40px rgba(108,99,255,0.4)',
                            },
                        }}
                    >
                        Book Your TV Repair
                    </Button>
                </Container>
            </Box>

            {/* ════════ FOOTER ════════ */}
            <Box sx={{
                py: 3, px: 3,
                borderTop: '1px solid rgba(148,163,184,0.05)',
                textAlign: 'center'
            }}>
                <Typography sx={{ color: '#475569', fontSize: '0.75rem' }}>
                    © {new Date().getFullYear()} JamesTronic TV Repair Centre • Manikonda, Hyderabad
                </Typography>
                <Typography sx={{ color: '#334155', fontSize: '0.65rem', mt: 0.5 }}>
                    Specialised in TV Repair & Installation Services
                </Typography>
            </Box>
        </Box>
    );
};

export default CustomerLandingPage;
