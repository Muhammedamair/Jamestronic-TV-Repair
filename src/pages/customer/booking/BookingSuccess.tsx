import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Lottie from 'lottie-react';

interface BookingSuccessProps {
    ticketNumber: string;
}

/* ═══ Premium "Sofa Relaxation" Success Animation ═══ */
const SofaRelaxAnimation: React.FC = () => (
    <Box sx={{ position: 'relative', width: 140, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 4 }}>
        {/* Glow behind Animation */}
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            style={{ position: 'absolute', width: '120%', height: '120%', background: 'radial-gradient(circle, rgba(91,76,242,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}
        />
        
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 2 }}>
            {/* TV Screen (Floating above Sofa) */}
            <motion.rect
                x="35" y="5" width="50" height="30" rx="3"
                stroke="#111827" strokeWidth="2.5" fill="none"
                initial={{ pathLength: 0, opacity: 0, y: -10 }}
                animate={{ pathLength: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            />
            {/* TV Stand */}
            <motion.path d="M 55 35 L 55 40 M 50 40 L 60 40" stroke="#111827" strokeWidth="2" strokeLinecap="round" 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} />
            
            {/* TV Success Checkmark */}
            <motion.path
                d="M 54 20 L 58 24 L 66 16"
                stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 1.2 }}
            />

            {/* Sofa (Comfortable Base) */}
            <motion.path
                d="M 10 60 Q 10 50 20 50 L 100 50 Q 110 50 110 60 L 110 75 Q 110 80 100 80 L 20 80 Q 10 80 10 75 Z"
                stroke="#111827" strokeWidth="2.5" fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeInOut" }}
            />
            {/* Sofa Armrests */}
            <motion.path
                d="M 10 60 Q 5 60 5 68 Q 5 75 10 75 M 110 60 Q 115 60 115 68 Q 115 75 110 75"
                stroke="#111827" strokeWidth="2.5" fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
            />
            {/* Sofa "Comfort" Waves */}
            <motion.path
                d="M 30 45 Q 35 40 40 45 M 80 45 Q 85 40 90 45"
                stroke="#5B4CF2" strokeWidth="2" strokeLinecap="round" opacity="0.6"
                animate={{ y: [0, -5, 0], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    </Box>
);

/* ═══ Typing Text Effect ═══ */
const TypingText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0.8 }) => {
    const [displayedText, setDisplayedText] = useState('');
    const shouldReduce = useReducedMotion();

    useEffect(() => {
        if (shouldReduce) {
            setDisplayedText(text);
            return;
        }
        let i = 0;
        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                i++;
                setDisplayedText(text.slice(0, i));
                if (i >= text.length) clearInterval(interval);
            }, 40); // 40ms per character — brisk typing
            return () => clearInterval(interval);
        }, delay * 1000);
        return () => clearTimeout(timeout);
    }, [text, delay, shouldReduce]);

    return (
        <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.6rem', mb: 1, letterSpacing: '-0.3px', minHeight: '2.2rem' }}>
            {displayedText}<motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                style={{ display: displayedText.length < text.length ? 'inline' : 'none' }}
            >|</motion.span>
        </Typography>
    );
};

/* ═══ Main Component ═══ */
const BookingSuccess: React.FC<BookingSuccessProps> = ({ ticketNumber }) => {
    const navigate = useNavigate();
    const shouldReduce = useReducedMotion();
    const [confettiData, setConfettiData] = useState<any>(null);

    // Load confetti JSON from public directory at runtime
    useEffect(() => {
        if (!shouldReduce) {
            fetch('/lottie/confetti.json')
                .then(res => res.json())
                .then(data => setConfettiData(data))
                .catch(() => {}); // Graceful — confetti is cosmetic
        }
    }, [shouldReduce]);

    return (
        <Box sx={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            p: 3, zIndex: 9999,
            colorScheme: 'light' // Force light color scheme for device accessibility
        }}>
            {/* ═══ Lottie Confetti — plays once then stops ═══ */}
            {!shouldReduce && confettiData && (
                <Box sx={{
                    position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                    width: '100%', maxWidth: 500, pointerEvents: 'none', zIndex: 10000
                }}>
                    <Lottie
                        animationData={confettiData}
                        loop={false}
                        autoplay={true}
                        style={{ width: '100%', height: 'auto' }}
                    />
                </Box>
            )}

            <motion.div
                initial={shouldReduce ? {} : { y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
                style={{ width: '100%', maxWidth: 440, willChange: 'transform, opacity' }}
            >
                <Box style={{ background: '#FFFFFF', color: '#111827' }} sx={{ 
                    borderRadius: 4, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', 
                    border: 'none', overflow: 'hidden'
                }}>
                    <Box sx={{ p: { xs: 3, sm: 5 } }}>
                        {/* Premium Sofa Success Animation */}
                        <SofaRelaxAnimation />

                        {/* Typing text */}
                        <TypingText text="Booking Confirmed! 🎉" delay={1.6} />

                        <motion.div
                            initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 2.4, duration: 0.4 }}
                        >
                            <Typography sx={{ color: '#4B5563', fontSize: '0.95rem', mb: 4, fontWeight: 500 }}>
                                Our expert will arrive at your location shortly. Save your ticket number to track progress.
                            </Typography>
                        </motion.div>

                        {/* Ticket number card — spring slide up */}
                        <motion.div
                            initial={shouldReduce ? {} : { y: 30, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 2.4 }}
                        >
                            <Box sx={{ background: '#F3F4F6', borderRadius: 3, py: 2.5, mb: 4, border: '1px solid #E5E7EB' }}>
                                <Typography sx={{ color: '#4B5563', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', mb: 0.5 }}>
                                    Ticket Number
                                </Typography>
                                <Typography sx={{ color: '#5B4CF2', fontWeight: 800, fontSize: '1.6rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                    {ticketNumber}
                                </Typography>
                            </Box>
                        </motion.div>

                        {/* Track button — single pulse after sequence */}
                        <motion.div
                            initial={shouldReduce ? {} : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: [0.9, 1.04, 1] }}
                            transition={{ delay: 2.8, duration: 0.5, ease: 'easeOut' }}
                        >
                            <Button fullWidth variant="contained" onClick={() => navigate(`/track/${ticketNumber}`)}
                                sx={{
                                    py: 1.8, borderRadius: 3, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1.05rem', 
                                    mb: 2, boxShadow: '0 4px 14px rgba(91,76,242,0.4)', '&:hover': { background: '#4F46E5' },
                                    color: '#FFF'
                                }}
                            >
                                Track Your TV Status
                            </Button>
                        </motion.div>
                        <motion.div
                            initial={shouldReduce ? {} : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 3.1, duration: 0.3 }}
                        >
                            <Button fullWidth variant="text" onClick={() => navigate('/')} sx={{ color: '#6B7280', textTransform: 'none', fontWeight: 600 }}>
                                Back to Home
                            </Button>
                        </motion.div>
                    </Box>
                </Box>
            </motion.div>
        </Box>
    );
};

export default BookingSuccess;
