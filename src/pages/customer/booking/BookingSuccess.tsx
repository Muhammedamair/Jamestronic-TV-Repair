import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Lottie from 'lottie-react';

interface BookingSuccessProps {
    ticketNumber: string;
}

/* ═══ Premium TV Success Animation ═══ */
const PremiumSuccessAnimation: React.FC = () => (
    <Box sx={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
        {/* Glow behind TV */}
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(91,76,242,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}
        />
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 2 }}>
            {/* TV Frame */}
            <motion.rect
                x="8" y="14" width="48" height="32" rx="4"
                stroke="#111827" strokeWidth="3" fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            {/* TV Stand Base */}
            <motion.path
                d="M 24 54 L 40 54"
                stroke="#111827" strokeWidth="3" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
            />
            <motion.path
                d="M 32 46 L 32 54"
                stroke="#111827" strokeWidth="3" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
            />

            {/* Inner Screen Color Fill (Turns on) */}
            <motion.rect
                x="11" y="17" width="42" height="26" rx="2"
                fill="#D1FAE5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.8, ease: "easeOut" }}
            />

            {/* Success Checkmark inside TV */}
            <motion.path
                d="M 24 30 L 29 35 L 40 23"
                stroke="#10B981" strokeWidth="3.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.1, ease: "easeOut" }}
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
            p: 3, zIndex: 9999 
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
                <Card sx={{ 
                    borderRadius: 4, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', 
                    border: 'none', bgcolor: '#FFFFFF !important', color: '#111827 !important' 
                }}>
                    <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                        {/* Premium TV Success Animation */}
                        <PremiumSuccessAnimation />

                        {/* Typing text */}
                        <TypingText text="Booking Confirmed! 🎉" delay={1.4} />

                        <motion.div
                            initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 2.2, duration: 0.4 }}
                        >
                            <Typography sx={{ color: '#4B5563 !important', fontSize: '0.95rem', mb: 4, fontWeight: 500 }}>
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
                                <Typography sx={{ color: '#4B5563 !important', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', mb: 0.5 }}>
                                    Ticket Number
                                </Typography>
                                <Typography sx={{ color: '#5B4CF2 !important', fontWeight: 800, fontSize: '1.6rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
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
                                    mb: 2, boxShadow: '0 4px 14px rgba(91,76,242,0.4)', '&:hover': { background: '#4F46E5' }
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
                    </CardContent>
                </Card>
            </motion.div>
        </Box>
    );
};

export default BookingSuccess;
