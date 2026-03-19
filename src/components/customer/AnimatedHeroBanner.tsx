import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PromotionalBanner } from '../../types/database';

// ───────────────────────────────────────────────
// ANIMATION LAYERS
// ───────────────────────────────────────────────

// ─── Floating Particles ───
const FloatingParticles: React.FC<{ count?: number }> = ({ count = 15 }) => {
    const particles = useMemo(() =>
        Array.from({ length: count }, (_, i) => ({
            id: i,
            size: 2 + Math.random() * 4,
            left: Math.random() * 100,
            top: Math.random() * 100,
            delay: Math.random() * 8,
            duration: 6 + Math.random() * 10,
            opacity: 0.15 + Math.random() * 0.35,
        })), [count]
    );
    return (
        <>
            {particles.map((p) => (
                <Box key={p.id} sx={{
                    position: 'absolute', width: p.size, height: p.size,
                    borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                    left: `${p.left}%`, top: `${p.top}%`, opacity: p.opacity,
                    pointerEvents: 'none', willChange: 'transform, opacity',
                    animation: `floatP${p.id % 3} ${p.duration}s ease-in-out ${p.delay}s infinite`,
                    '@keyframes floatP0': {
                        '0%,100%': { transform: 'translate(0,0) scale(1)', opacity: p.opacity },
                        '50%': { transform: 'translate(15px,-30px) scale(1.3)', opacity: p.opacity * 1.5 },
                    },
                    '@keyframes floatP1': {
                        '0%,100%': { transform: 'translate(0,0)' },
                        '33%': { transform: 'translate(-20px,-25px) scale(1.4)' },
                        '66%': { transform: 'translate(10px,-40px) scale(0.6)' },
                    },
                    '@keyframes floatP2': {
                        '0%,100%': { transform: 'translate(0,0)', opacity: p.opacity },
                        '50%': { transform: 'translate(25px,-30px)', opacity: p.opacity * 2 },
                    },
                }} />
            ))}
        </>
    );
};

// ─── Celebration Confetti ───
const CelebrationConfetti: React.FC = () => {
    const confetti = useMemo(() =>
        Array.from({ length: 20 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 3 + Math.random() * 4,
            size: 4 + Math.random() * 6,
            color: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8FD8', '#A78BFA'][i % 6],
            rotation: Math.random() * 360,
        })), []
    );
    return (
        <>
            {confetti.map((c) => (
                <Box key={c.id} sx={{
                    position: 'absolute', width: c.size, height: c.size * 0.6,
                    background: c.color, borderRadius: '2px',
                    left: `${c.left}%`, top: '-5%',
                    opacity: 0.8, pointerEvents: 'none',
                    willChange: 'transform, opacity',
                    animation: `confettiFall ${c.duration}s ease-in ${c.delay}s infinite`,
                    '@keyframes confettiFall': {
                        '0%': { transform: `translateY(0) rotate(${c.rotation}deg)`, opacity: 0.9 },
                        '100%': { transform: `translateY(250px) rotate(${c.rotation + 720}deg)`, opacity: 0 },
                    },
                }} />
            ))}
        </>
    );
};

// ─── Aurora Waves ───
const AuroraWaves: React.FC<{ color1?: string; color2?: string }> = ({
    color1 = 'rgba(167,139,250,0.25)',
    color2 = 'rgba(99,102,241,0.2)',
}) => (
    <>
        <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: `linear-gradient(180deg, transparent 0%, ${color1} 40%, transparent 80%)`,
            animation: 'auroraFlow1 8s ease-in-out infinite',
            pointerEvents: 'none', opacity: 0.6,
            '@keyframes auroraFlow1': {
                '0%,100%': { transform: 'translateY(0) scaleY(1)' },
                '50%': { transform: 'translateY(-15px) scaleY(1.2)' },
            },
        }} />
        <Box sx={{
            position: 'absolute', top: '20%', left: '-20%', right: '-20%', bottom: 0,
            background: `radial-gradient(ellipse at 50% 50%, ${color2} 0%, transparent 60%)`,
            animation: 'auroraFlow2 10s ease-in-out 2s infinite',
            pointerEvents: 'none', opacity: 0.5,
            '@keyframes auroraFlow2': {
                '0%,100%': { transform: 'translateX(0) scale(1)' },
                '50%': { transform: 'translateX(30px) scale(1.1)' },
            },
        }} />
    </>
);

// ─── Floating Emojis ───
const FloatingEmojis: React.FC<{ emojis: string[] }> = ({ emojis }) => {
    const items = useMemo(() =>
        emojis.length > 0
            ? Array.from({ length: 12 }, (_, i) => ({
                id: i,
                emoji: emojis[i % emojis.length],
                left: 5 + Math.random() * 90,
                top: Math.random() * 100,
                size: 14 + Math.random() * 14,
                delay: Math.random() * 6,
                duration: 5 + Math.random() * 8,
            }))
            : [],
        [emojis]
    );
    if (!items.length) return null;
    return (
        <>
            {items.map((e) => (
                <Box key={e.id} sx={{
                    position: 'absolute', left: `${e.left}%`, top: `${e.top}%`,
                    fontSize: e.size, pointerEvents: 'none',
                    opacity: 0.4, willChange: 'transform, opacity',
                    animation: `emojiFloat ${e.duration}s ease-in-out ${e.delay}s infinite`,
                    '@keyframes emojiFloat': {
                        '0%,100%': { transform: 'translateY(0) rotate(0deg)', opacity: 0.3 },
                        '50%': { transform: 'translateY(-20px) rotate(15deg)', opacity: 0.6 },
                    },
                }}>
                    {e.emoji}
                </Box>
            ))}
        </>
    );
};

// ─── Glowing Orbs ───
const GlowingOrbs: React.FC = () => (
    <>
        <Box sx={{
            position: 'absolute', top: -60, right: -40, width: 200, height: 200,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)',
            animation: 'orbPulse1 6s ease-in-out infinite', pointerEvents: 'none',
            '@keyframes orbPulse1': {
                '0%,100%': { transform: 'scale(1) translate(0,0)', opacity: 0.6 },
                '50%': { transform: 'scale(1.3) translate(-10px,15px)', opacity: 1 },
            },
        }} />
        <Box sx={{
            position: 'absolute', bottom: -30, left: -50, width: 180, height: 180,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
            animation: 'orbPulse2 8s ease-in-out infinite', pointerEvents: 'none',
            '@keyframes orbPulse2': {
                '0%,100%': { transform: 'scale(1)', opacity: 0.5 },
                '50%': { transform: 'scale(1.2) translate(15px,-10px)', opacity: 0.9 },
            },
        }} />
    </>
);

// ─── Shimmer Sweep ───
const ShimmerSweep: React.FC = () => (
    <Box sx={{
        position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)',
        animation: 'shimmerSweep 3.5s ease-in-out infinite', pointerEvents: 'none',
        '@keyframes shimmerSweep': { '0%': { left: '-100%' }, '60%,100%': { left: '200%' } },
    }} />
);

// ─── Countdown Timer ───
const CountdownTimer: React.FC<{ endDate: string }> = ({ endDate }) => {
    const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const tick = () => {
            const diff = new Date(endDate).getTime() - Date.now();
            if (diff <= 0) { setExpired(true); return; }
            setTimeLeft({
                d: Math.floor(diff / 86400000),
                h: Math.floor((diff % 86400000) / 3600000),
                m: Math.floor((diff % 3600000) / 60000),
                s: Math.floor((diff % 60000) / 1000),
            });
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [endDate]);

    if (expired) return null;

    const Segment: React.FC<{ value: number; label: string }> = ({ value, label }) => (
        <Box sx={{ textAlign: 'center', mx: 0.5 }}>
            <Box sx={{
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                borderRadius: '8px', px: 1, py: 0.3, minWidth: 32,
                border: '1px solid rgba(255,255,255,0.15)',
            }}>
                <Typography sx={{ color: '#FFF', fontWeight: 900, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>
                    {String(value).padStart(2, '0')}
                </Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.55rem', fontWeight: 600, mt: 0.3, textTransform: 'uppercase' }}>
                {label}
            </Typography>
        </Box>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 700, mr: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⏱ Ends in
                </Typography>
                <Box sx={{ display: 'flex' }}>
                    {timeLeft.d > 0 && <Segment value={timeLeft.d} label="day" />}
                    <Segment value={timeLeft.h} label="hrs" />
                    <Segment value={timeLeft.m} label="min" />
                    <Segment value={timeLeft.s} label="sec" />
                </Box>
            </Box>
        </motion.div>
    );
};

// ─── Pulse Heartbeat ───
const PulseHeartbeat: React.FC<{ color?: string }> = ({ color = 'rgba(255,255,255,0.15)' }) => (
    <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
        animation: 'heartPulse 2.5s ease-in-out infinite',
        pointerEvents: 'none', mixBlendMode: 'screen',
        '@keyframes heartPulse': {
            '0%,100%': { transform: 'scale(1)', opacity: 0.5 },
            '50%': { transform: 'scale(1.2)', opacity: 0.9 },
            '70%': { transform: 'scale(1.05)', opacity: 0.7 },
            '85%': { transform: 'scale(1.15)', opacity: 0.8 },
        },
    }} />
);

// ─── Premium Shimmer ───
const PremiumShimmer: React.FC = () => (
    <Box sx={{
        position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        transform: 'skewX(-20deg)',
        animation: 'shimmerSweepAlt 4s infinite ease-in-out',
        pointerEvents: 'none', mixBlendMode: 'overlay',
        '@keyframes shimmerSweepAlt': {
            '0%': { left: '-100%' },
            '50%,100%': { left: '250%' },
        },
    }} />
);


// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

interface AnimatedHeroBannerProps {
    banner: PromotionalBanner | null;
    isFirstVisit?: boolean;
    onLocationTap?: () => void;
    locationArea?: string;
    locationCity?: string;
    onProfileTap?: () => void;
    children?: React.ReactNode;
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
    const navigate = useNavigate();

    const title = banner?.title || 'JamesTronic Care';
    const subtitle = banner?.subtitle || 'Expert TV Repair at';
    const highlightText = banner?.highlight_text || '₹249*';
    const tagText = banner?.tag_text || '10 MINS';
    const offerText = banner?.offer_text || '* Valid for first 3 bookings • Zero visitation fee';
    const gradStart = banner?.gradient_start || '#5B4CF2';
    const gradEnd = banner?.gradient_end || '#7C3AED';
    const animStyle = banner?.animation_style || 'particles';
    const ctaText = banner?.cta_text || '';
    const ctaLink = banner?.cta_link || '/book';
    const countdownEnd = banner?.countdown_end;
    const emojis = banner?.emoji_set || [];
    const layoutStyle = banner?.layout_style || 'classic';

    const titleParts = title.split(' ');
    const brandPart = titleParts.length > 1 ? titleParts.slice(0, -1).join(' ') : title;
    const accentPart = titleParts.length > 1 ? titleParts[titleParts.length - 1] : '';
    const subtitleWords = subtitle.split(' ');

    // Pick animation layer based on style
    const renderAnimationLayer = () => {
        if (shouldReduce) return null;
        switch (animStyle) {
            case 'celebration': return <><CelebrationConfetti /><GlowingOrbs /><FloatingEmojis emojis={emojis} /></>;
            case 'aurora': return <><AuroraWaves /><FloatingEmojis emojis={emojis} /></>;
            case 'pulse': return <><PulseHeartbeat /><FloatingEmojis emojis={emojis} /></>;
            case 'shimmer': return <><PremiumShimmer /><FloatingEmojis emojis={emojis} /></>;
            case 'minimal': return <FloatingEmojis emojis={emojis} />;
            case 'particles':
            default: return <><FloatingParticles /><GlowingOrbs /><FloatingEmojis emojis={emojis} /></>;
        }
    };

    // ─── Shared sub-components ───
    const TagBadge = () => tagText ? (
        <motion.div
            animate={shouldReduce ? {} : {
                boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 8px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0)'],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ borderRadius: '6px', display: 'inline-block' }}
        >
            <Box sx={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFF', px: 1.2, py: 0.3, borderRadius: '6px',
                fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
                {tagText}
            </Box>
        </motion.div>
    ) : null;

    const CtaButton = () => ctaText ? (
        <motion.div
            initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isFirstVisit ? 1 : 0.2, duration: 0.35 }}
        >
            <Button
                onClick={() => navigate(ctaLink)}
                variant="contained"
                sx={{
                    mt: 2, background: 'rgba(255,255,255,0.95)', color: gradStart,
                    fontWeight: 800, fontSize: '0.9rem', borderRadius: '12px',
                    px: 3, py: 1.2, textTransform: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s',
                    animation: shouldReduce ? 'none' : 'ctaPulse 3s ease-in-out infinite',
                    '&:hover': {
                        background: '#FFF', transform: 'scale(1.03)',
                        boxShadow: '0 6px 25px rgba(0,0,0,0.2)',
                    },
                    '&:active': { transform: 'scale(0.97)' },
                    '@keyframes ctaPulse': {
                        '0%,100%': { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
                        '50%': { boxShadow: `0 4px 25px rgba(0,0,0,0.15), 0 0 0 4px rgba(255,255,255,0.2)` },
                    },
                }}
            >
                {ctaText} →
            </Button>
        </motion.div>
    ) : null;

    // ═══════════════════════════════════════════
    // LAYOUT RENDERERS
    // ═══════════════════════════════════════════

    // ─── CLASSIC: Left-aligned. Brand → Tag → Headline → Offer → CTA ───
    const renderClassicLayout = () => (
        <Box sx={{ flex: 1 }}>
            <motion.div
                initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: isFirstVisit ? 0.25 : 0 }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ color: '#FFF', fontStyle: 'italic', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
                        {brandPart}{' '}
                        {accentPart && <span style={{ color: '#A78BFA' }}>{accentPart}</span>}
                    </Typography>
                    <TagBadge />
                </Box>
            </motion.div>
            <Box sx={{ mb: 1 }}>
                {subtitleWords.map((word, i) => (
                    <motion.span key={word + i}
                        initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: isFirstVisit ? 0.35 + i * 0.08 : 0 }}
                        style={{ display: 'inline-block', marginRight: '8px' }}
                    >
                        <Typography component="span" sx={{ color: '#FFF', fontWeight: 800, fontSize: { xs: '1.8rem', sm: '2.2rem' }, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
                            {word}
                        </Typography>
                    </motion.span>
                ))}
                {highlightText && (
                    <motion.span
                        initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: isFirstVisit ? 0.7 : 0 }}
                        style={{ display: 'inline-block', position: 'relative' }}
                    >
                        <Typography component="span" sx={{
                            color: '#FCD34D', fontWeight: 900, fontSize: { xs: '1.8rem', sm: '2.2rem' },
                            lineHeight: 1.15, letterSpacing: '-0.5px',
                            textShadow: shouldReduce ? 'none' : '0 0 20px rgba(252,211,77,0.4), 0 0 40px rgba(252,211,77,0.2)',
                        }}>
                            {highlightText}
                        </Typography>
                        {!shouldReduce && <ShimmerSweep />}
                    </motion.span>
                )}
            </Box>
            {offerText && (
                <motion.div initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: isFirstVisit ? 0.85 : 0, duration: 0.3 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500 }}>{offerText}</Typography>
                </motion.div>
            )}
            {countdownEnd && <CountdownTimer endDate={countdownEnd} />}
            <CtaButton />
        </Box>
    );

    // ─── CENTER FOCUS: Center-aligned, symmetrical ───
    const renderCenterLayout = () => (
        <Box sx={{ flex: 1, textAlign: 'center' }}>
            <motion.div
                initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: isFirstVisit ? 0.25 : 0 }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <TagBadge />
                </Box>
                <Typography sx={{ color: '#FFF', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.5px', mb: 1 }}>
                    {brandPart}{' '}
                    {accentPart && <span style={{ color: '#A78BFA' }}>{accentPart}</span>}
                </Typography>
            </motion.div>
            <motion.div
                initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: isFirstVisit ? 0.4 : 0 }}
            >
                <Typography sx={{
                    color: '#FFF', fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' },
                    lineHeight: 1.2, letterSpacing: '-0.5px', mb: 0.5,
                }}>
                    {subtitle}
                </Typography>
                {highlightText && (
                    <Box sx={{ display: 'inline-block', position: 'relative' }}>
                        <Typography component="span" sx={{
                            color: '#FCD34D', fontWeight: 900, fontSize: { xs: '2.2rem', sm: '2.8rem' },
                            lineHeight: 1.1,
                            textShadow: shouldReduce ? 'none' : '0 0 25px rgba(252,211,77,0.5), 0 0 50px rgba(252,211,77,0.25)',
                        }}>
                            {highlightText}
                        </Typography>
                        {!shouldReduce && <ShimmerSweep />}
                    </Box>
                )}
            </motion.div>
            {offerText && (
                <motion.div initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: isFirstVisit ? 0.7 : 0, duration: 0.3 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', fontWeight: 500, mt: 1 }}>{offerText}</Typography>
                </motion.div>
            )}
            {countdownEnd && <Box sx={{ display: 'flex', justifyContent: 'center' }}><CountdownTimer endDate={countdownEnd} /></Box>}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}><CtaButton /></Box>
        </Box>
    );

    // ─── OFFER FIRST: Huge price/discount first, then brand below ───
    const renderOfferFirstLayout = () => (
        <Box sx={{ flex: 1 }}>
            {/* Big highlight at the top */}
            <motion.div
                initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 15, delay: isFirstVisit ? 0.2 : 0 }}
            >
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                    {highlightText && (
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <Typography component="span" sx={{
                                color: '#FCD34D', fontWeight: 900, fontSize: { xs: '3rem', sm: '3.8rem' },
                                lineHeight: 1, letterSpacing: '-2px',
                                textShadow: shouldReduce ? 'none' : '0 0 30px rgba(252,211,77,0.5), 0 0 60px rgba(252,211,77,0.2)',
                            }}>
                                {highlightText}
                            </Typography>
                            {!shouldReduce && <ShimmerSweep />}
                        </Box>
                    )}
                    <TagBadge />
                </Box>
            </motion.div>
            {/* Subtitle below the price */}
            <motion.div
                initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: isFirstVisit ? 0.45 : 0 }}
            >
                <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: { xs: '1.4rem', sm: '1.7rem' }, lineHeight: 1.2, mb: 0.5 }}>
                    {subtitle}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                    {brandPart}{' '}
                    {accentPart && <span style={{ color: '#A78BFA' }}>{accentPart}</span>}
                </Typography>
            </motion.div>
            {offerText && (
                <motion.div initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: isFirstVisit ? 0.65 : 0, duration: 0.3 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 500 }}>{offerText}</Typography>
                </motion.div>
            )}
            {countdownEnd && <CountdownTimer endDate={countdownEnd} />}
            <CtaButton />
        </Box>
    );

    // ─── SPLIT: Text left, huge floating emoji right ───
    const renderSplitLayout = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Left: Text */}
            <Box sx={{ flex: 1 }}>
                <motion.div
                    initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: isFirstVisit ? 0.25 : 0 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ color: '#FFF', fontStyle: 'italic', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.3px' }}>
                            {brandPart}{' '}
                            {accentPart && <span style={{ color: '#A78BFA' }}>{accentPart}</span>}
                        </Typography>
                        <TagBadge />
                    </Box>
                </motion.div>
                <motion.div
                    initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: isFirstVisit ? 0.4 : 0 }}
                >
                    <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: { xs: '1.4rem', sm: '1.7rem' }, lineHeight: 1.2, mb: 0.5 }}>
                        {subtitle}
                    </Typography>
                    {highlightText && (
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <Typography component="span" sx={{
                                color: '#FCD34D', fontWeight: 900, fontSize: { xs: '1.6rem', sm: '2rem' },
                                lineHeight: 1.1,
                                textShadow: shouldReduce ? 'none' : '0 0 20px rgba(252,211,77,0.4)',
                            }}>
                                {highlightText}
                            </Typography>
                            {!shouldReduce && <ShimmerSweep />}
                        </Box>
                    )}
                </motion.div>
                {offerText && (
                    <motion.div initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: isFirstVisit ? 0.6 : 0, duration: 0.3 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 500, mt: 0.5 }}>{offerText}</Typography>
                    </motion.div>
                )}
                {countdownEnd && <CountdownTimer endDate={countdownEnd} />}
                <CtaButton />
            </Box>
            {/* Right: Huge emoji showcase */}
            <motion.div
                initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, scale: 0.5, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 15, delay: isFirstVisit ? 0.5 : 0.1 }}
            >
                <Box sx={{
                    fontSize: { xs: '4rem', sm: '5rem' }, lineHeight: 1,
                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))',
                    animation: shouldReduce ? 'none' : 'splitFloat 4s ease-in-out infinite',
                    '@keyframes splitFloat': {
                        '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
                        '50%': { transform: 'translateY(-10px) rotate(5deg)' },
                    },
                }}>
                    {emojis.length > 0 ? emojis[0] : '📺'}
                </Box>
            </motion.div>
        </Box>
    );

    // ─── Layout Switcher ───
    const renderHeroContent = () => {
        switch (layoutStyle) {
            case 'center': return renderCenterLayout();
            case 'offer_first': return renderOfferFirstLayout();
            case 'split': return renderSplitLayout();
            case 'classic':
            default: return renderClassicLayout();
        }
    };

    return (
        <Box
            sx={{
                background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 50%, ${gradStart} 100%)`,
                backgroundSize: '200% 200%',
                animation: shouldReduce ? 'none' : 'gradientShift 8s ease-in-out infinite',
                pt: { xs: 'calc(env(safe-area-inset-top) + 24px)', sm: 'calc(env(safe-area-inset-top) + 32px)' },
                pb: { xs: 5, sm: 6 },
                px: { xs: 2.5, sm: 4 },
                borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
                position: 'relative', overflow: 'hidden',
                '@keyframes gradientShift': {
                    '0%,100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
            }}
        >
            {/* Animation layer */}
            {renderAnimationLayer()}

            {/* Content */}
            <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative', zIndex: 1 }}>
                {/* Header: Location + Profile */}
                {(onLocationTap || onProfileTap) && (
                    <motion.div
                        initial={(shouldReduce || !isFirstVisit) ? false : { opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5 }}>
                            {onLocationTap && (
                                <Box onClick={onLocationTap} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:active': { opacity: 0.7 } }}>
                                    <Box sx={{
                                        background: 'rgba(255,255,255,0.2)', p: 0.8, borderRadius: '50%', display: 'flex',
                                        backdropFilter: 'blur(8px)',
                                        animation: !locationArea ? 'locPulse 2s ease-in-out infinite' : 'none',
                                        '@keyframes locPulse': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.12)' } },
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
                            {onProfileTap && (
                                <Box onClick={onProfileTap} sx={{
                                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                                    color: '#FFF', width: 42, height: 42, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', fontSize: '1.2rem', transition: 'all 0.2s',
                                    '&:hover': { background: 'rgba(255,255,255,0.25)', transform: 'scale(1.05)' },
                                    '&:active': { transform: 'scale(0.95)' },
                                }}>
                                    👤
                                </Box>
                            )}
                        </Box>
                    </motion.div>
                )}

                {/* Search bar (children) */}
                {children && (
                    <motion.div
                        initial={shouldReduce ? false : { opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.15 }}
                    >
                        {children}
                    </motion.div>
                )}

                {/* ═══ HERO CONTENT — Dynamic Layout ═══ */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {renderHeroContent()}
                </Box>
            </Box>
        </Box>
    );
};

export default AnimatedHeroBanner;
