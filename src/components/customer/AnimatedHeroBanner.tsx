import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { PromotionalBanner } from '../../types/database';

// ─── Floating Particle Generator ───
// Creates N tiny luminous circles that drift through the banner
const FloatingParticles: React.FC<{ count?: number }> = ({ count = 18 }) => {
    const particles = useMemo(() =>
        Array.from({ length: count }, (_, i) => ({
            id: i,
            size: 2 + Math.random() * 4,
            left: Math.random() * 100,
            top: Math.random() * 100,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 10,
            opacity: 0.15 + Math.random() * 0.35,
        })),
        [count]
    );

    return (
        <>
            {particles.map((p) => (
                <Box
                    key={p.id}
                    sx={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.9)',
                        left: `${p.left}%`,
                        top: `${p.top}%`,
                        opacity: p.opacity,
                        pointerEvents: 'none',
                        willChange: 'transform, opacity',
                        animation: `floatParticle${p.id % 4} ${p.duration}s ease-in-out ${p.delay}s infinite`,
                        '@keyframes floatParticle0': {
                            '0%, 100%': { transform: 'translate(0,0) scale(1)', opacity: p.opacity },
                            '25%': { transform: 'translate(15px, -20px) scale(1.3)', opacity: p.opacity * 1.5 },
                            '50%': { transform: 'translate(-10px, -35px) scale(0.8)', opacity: p.opacity * 0.7 },
                            '75%': { transform: 'translate(20px, -15px) scale(1.1)', opacity: p.opacity * 1.2 },
                        },
                        '@keyframes floatParticle1': {
                            '0%, 100%': { transform: 'translate(0,0) scale(1)' },
                            '33%': { transform: 'translate(-20px, -25px) scale(1.4)' },
                            '66%': { transform: 'translate(10px, -40px) scale(0.6)' },
                        },
                        '@keyframes floatParticle2': {
                            '0%, 100%': { transform: 'translate(0,0)', opacity: p.opacity },
                            '50%': { transform: 'translate(25px, -30px)', opacity: p.opacity * 2 },
                        },
                        '@keyframes floatParticle3': {
                            '0%, 100%': { transform: 'translate(0,0) rotate(0deg)' },
                            '25%': { transform: 'translate(-15px, -10px) rotate(90deg)' },
                            '50%': { transform: 'translate(-25px, -35px) rotate(180deg)' },
                            '75%': { transform: 'translate(5px, -20px) rotate(270deg)' },
                        },
                    }}
                />
            ))}
        </>
    );
};

// ─── Shimmer Sweep Effect ───
// A diagonal light sweep that moves across the highlight text
const ShimmerSweep: React.FC = () => (
    <Box
        sx={{
            position: 'absolute',
            top: 0, left: '-100%',
            width: '100%', height: '100%',
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)',
            animation: 'shimmerSweep 3.5s ease-in-out infinite',
            pointerEvents: 'none',
            '@keyframes shimmerSweep': {
                '0%': { left: '-100%' },
                '60%, 100%': { left: '200%' },
            },
        }}
    />
);

// ─── Glowing Orbs (Background) ───
const GlowingOrbs: React.FC<{ color1?: string; color2?: string }> = ({
    color1 = 'rgba(167,139,250,0.3)',
    color2 = 'rgba(99,102,241,0.2)',
}) => (
    <>
        <Box sx={{
            position: 'absolute', top: -60, right: -40,
            width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, ${color1} 0%, transparent 70%)`,
            animation: 'orbPulse1 6s ease-in-out infinite',
            pointerEvents: 'none',
            '@keyframes orbPulse1': {
                '0%, 100%': { transform: 'scale(1) translate(0,0)', opacity: 0.6 },
                '50%': { transform: 'scale(1.3) translate(-10px, 15px)', opacity: 1 },
            },
        }} />
        <Box sx={{
            position: 'absolute', bottom: -30, left: -50,
            width: 180, height: 180, borderRadius: '50%',
            background: `radial-gradient(circle, ${color2} 0%, transparent 70%)`,
            animation: 'orbPulse2 8s ease-in-out infinite',
            pointerEvents: 'none',
            '@keyframes orbPulse2': {
                '0%, 100%': { transform: 'scale(1) translate(0,0)', opacity: 0.5 },
                '50%': { transform: 'scale(1.2) translate(15px, -10px)', opacity: 0.9 },
            },
        }} />
        {/* Center glow */}
        <Box sx={{
            position: 'absolute', top: '40%', left: '30%',
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            animation: 'orbPulse3 5s ease-in-out 2s infinite',
            pointerEvents: 'none',
            '@keyframes orbPulse3': {
                '0%, 100%': { transform: 'scale(0.8)', opacity: 0.3 },
                '50%': { transform: 'scale(1.5)', opacity: 0.7 },
            },
        }} />
    </>
);

// ─── Wave Decoration (Bottom) ───
const WaveDecoration: React.FC = () => (
    <Box
        sx={{
            position: 'absolute',
            bottom: -2, left: 0, right: 0,
            height: 30,
            overflow: 'hidden',
            pointerEvents: 'none',
            '&::before': {
                content: '""',
                position: 'absolute',
                bottom: 0, left: '-10%',
                width: '120%', height: 40,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '50%',
                animation: 'waveDrift 7s ease-in-out infinite',
            },
            '@keyframes waveDrift': {
                '0%, 100%': { transform: 'translateX(0) scaleY(1)' },
                '50%': { transform: 'translateX(5%) scaleY(1.3)' },
            },
        }}
    />
);

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT: AnimatedHeroBanner
// ═══════════════════════════════════════════════════════
interface AnimatedHeroBannerProps {
    banner: PromotionalBanner | null;
    isFirstVisit?: boolean;
    onLocationTap?: () => void;
    locationArea?: string;
    locationCity?: string;
    onProfileTap?: () => void;
    children?: React.ReactNode; // For the search bar
}

const AnimatedHeroBanner: React.FC<AnimatedHeroBannerProps> = ({
    banner,
    isFirstVisit = false,
    onLocationTap,
    locationArea,
    locationCity,
    onProfileTap,
    children,
}) => {
    const shouldReduce = useReducedMotion();

    // Defaults if no banner data from DB
    const title = banner?.title || 'JamesTronic Care';
    const subtitle = banner?.subtitle || 'Expert TV Repair at';
    const highlightText = banner?.highlight_text || '₹249*';
    const tagText = banner?.tag_text || '10 MINS';
    const offerText = banner?.offer_text || '* Valid for first 3 bookings • Zero visitation fee';
    const gradStart = banner?.gradient_start || '#5B4CF2';
    const gradEnd = banner?.gradient_end || '#7C3AED';

    // Split title into brand name and accent word (last word is accent)
    const titleParts = title.split(' ');
    const brandPart = titleParts.length > 1 ? titleParts.slice(0, -1).join(' ') : title;
    const accentPart = titleParts.length > 1 ? titleParts[titleParts.length - 1] : '';

    // Split subtitle into words for staggered animation
    const subtitleWords = subtitle.split(' ');

    return (
        <Box
            sx={{
                background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 50%, ${gradStart} 100%)`,
                backgroundSize: '200% 200%',
                animation: shouldReduce ? 'none' : 'gradientShift 8s ease-in-out infinite',
                pt: { xs: 'calc(env(safe-area-inset-top) + 24px)', sm: 'calc(env(safe-area-inset-top) + 32px)' },
                pb: { xs: 5, sm: 6 },
                px: { xs: 2.5, sm: 4 },
                borderBottomLeftRadius: 32,
                borderBottomRightRadius: 32,
                position: 'relative',
                overflow: 'hidden',
                '@keyframes gradientShift': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
            }}
        >
            {/* Ambient animations layer */}
            {!shouldReduce && (
                <>
                    <GlowingOrbs />
                    <FloatingParticles count={15} />
                    <WaveDecoration />
                </>
            )}

            {/* Content layer */}
            <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative', zIndex: 1 }}>
                {/* ─── Header Row: Location + Profile ─── */}
                {(onLocationTap || onProfileTap) && (
                    <motion.div
                        initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5 }}>
                            {/* Location */}
                            {onLocationTap && (
                                <Box
                                    onClick={onLocationTap}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:active': { opacity: 0.7 } }}
                                >
                                    <Box sx={{
                                        background: 'rgba(255,255,255,0.2)', p: 0.8, borderRadius: '50%', display: 'flex',
                                        animation: !locationArea ? 'locPulse 2s ease-in-out infinite' : 'none',
                                        backdropFilter: 'blur(8px)',
                                        '@keyframes locPulse': {
                                            '0%, 100%': { transform: 'scale(1)' },
                                            '50%': { transform: 'scale(1.12)' },
                                        },
                                    }}>
                                        <Box sx={{ color: '#FFF', fontSize: 26, display: 'flex', alignItems: 'center' }}>📍</Box>
                                    </Box>
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#FFF' }}>
                                            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
                                                {locationArea || 'Set Location'}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.9rem', ml: 0.5 }}>▾</Typography>
                                        </Box>
                                        {locationCity && (
                                            <Typography sx={{
                                                color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500,
                                                maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {locationCity}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}
                            {/* Profile icon */}
                            {onProfileTap && (
                                <Box
                                    onClick={onProfileTap}
                                    sx={{
                                        background: 'rgba(255,255,255,0.15)',
                                        backdropFilter: 'blur(8px)',
                                        color: '#FFF',
                                        width: 42, height: 42,
                                        borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        transition: 'all 0.2s',
                                        '&:hover': { background: 'rgba(255,255,255,0.25)', transform: 'scale(1.05)' },
                                        '&:active': { transform: 'scale(0.95)' },
                                    }}
                                >
                                    👤
                                </Box>
                            )}
                        </Box>
                    </motion.div>
                )}

                {/* ─── Search Bar (passed as children) ─── */}
                {children && (
                    <motion.div
                        initial={shouldReduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.15 }}
                    >
                        {children}
                    </motion.div>
                )}

                {/* ═══ HERO PROMOTION CONTENT ═══ */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                        {/* Title Row: "JamesTronic Care" + "10 MINS" badge */}
                        <motion.div
                            initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, delay: isFirstVisit ? 0.25 : 0 }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                <Typography sx={{
                                    color: '#FFF', fontStyle: 'italic', fontWeight: 900,
                                    fontSize: '1.4rem', letterSpacing: '-0.5px',
                                }}>
                                    {brandPart}{' '}
                                    {accentPart && (
                                        <span style={{ color: '#A78BFA' }}>{accentPart}</span>
                                    )}
                                </Typography>

                                {tagText && (
                                    <motion.div
                                        animate={shouldReduce ? {} : {
                                            boxShadow: [
                                                '0 0 0 0 rgba(16,185,129,0.4)',
                                                '0 0 0 8px rgba(16,185,129,0)',
                                                '0 0 0 0 rgba(16,185,129,0)',
                                            ],
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                        style={{ borderRadius: '6px' }}
                                    >
                                        <Box sx={{
                                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                            color: '#FFF',
                                            px: 1.2, py: 0.3,
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {tagText}
                                        </Box>
                                    </motion.div>
                                )}
                            </Box>
                        </motion.div>

                        {/* Staggered subtitle words */}
                        <Box sx={{ mb: 1 }}>
                            {subtitleWords.map((word, i) => (
                                <motion.span
                                    key={word + i}
                                    initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: isFirstVisit ? 0.35 + i * 0.08 : 0 }}
                                    style={{ display: 'inline-block', marginRight: '8px' }}
                                >
                                    <Typography
                                        component="span"
                                        sx={{
                                            color: '#FFF', fontWeight: 800,
                                            fontSize: { xs: '1.8rem', sm: '2.2rem' },
                                            lineHeight: 1.15, letterSpacing: '-0.5px',
                                        }}
                                    >
                                        {word}
                                    </Typography>
                                </motion.span>
                            ))}

                            {/* Highlight text (e.g. ₹249*) with shimmer */}
                            {highlightText && (
                                <motion.span
                                    initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: isFirstVisit ? 0.7 : 0 }}
                                    style={{ display: 'inline-block', position: 'relative' }}
                                >
                                    <Typography
                                        component="span"
                                        sx={{
                                            color: '#FCD34D',
                                            fontWeight: 900,
                                            fontSize: { xs: '1.8rem', sm: '2.2rem' },
                                            lineHeight: 1.15,
                                            letterSpacing: '-0.5px',
                                            textShadow: shouldReduce ? 'none' : '0 0 20px rgba(252,211,77,0.4), 0 0 40px rgba(252,211,77,0.2)',
                                        }}
                                    >
                                        {highlightText}
                                    </Typography>
                                    {!shouldReduce && <ShimmerSweep />}
                                </motion.span>
                            )}
                        </Box>

                        {/* Offer text */}
                        {offerText && (
                            <motion.div
                                initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: isFirstVisit ? 0.85 : 0, duration: 0.3 }}
                            >
                                <Typography sx={{
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                }}>
                                    {offerText}
                                </Typography>
                            </motion.div>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default AnimatedHeroBanner;
