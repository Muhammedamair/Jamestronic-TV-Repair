import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Lottie from 'lottie-react';

interface BookingSuccessProps {
    ticketNumber: string;
}

/* ═══ SVG Animated Checkmark ═══ */
const AnimatedCheckmark: React.FC = () => (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Circle draw */}
        <motion.circle
            cx="26" cy="26" r="23"
            stroke="#10B981" strokeWidth="3" fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
        {/* Check path draws after circle */}
        <motion.path
            d="M15 27 L22 34 L37 19"
            stroke="#10B981" strokeWidth="3.5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: 0.45, ease: 'easeOut' }}
        />
    </svg>
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
                <Card sx={{ borderRadius: 4, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: 'none' }}>
                    <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                        {/* Checkmark circle */}
                        <Box sx={{ 
                            width: 80, height: 80, borderRadius: '50%', background: '#D1FAE5', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 
                        }}>
                            <AnimatedCheckmark />
                        </Box>

                        {/* Typing text */}
                        <TypingText text="Booking Confirmed! 🎉" delay={0.85} />

                        <motion.div
                            initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.8, duration: 0.4 }}
                        >
                            <Typography sx={{ color: '#6B7280', fontSize: '0.95rem', mb: 4 }}>
                                Our expert will arrive at your location shortly. Save your ticket number to track progress.
                            </Typography>
                        </motion.div>

                        {/* Ticket number card — spring slide up */}
                        <motion.div
                            initial={shouldReduce ? {} : { y: 30, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 2.0 }}
                        >
                            <Box sx={{ background: '#F3F4F6', borderRadius: 3, py: 2.5, mb: 4 }}>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', mb: 0.5 }}>
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
                            transition={{ delay: 2.5, duration: 0.5, ease: 'easeOut' }}
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
                            transition={{ delay: 2.8, duration: 0.3 }}
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
