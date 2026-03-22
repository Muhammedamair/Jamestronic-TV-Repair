"use client";
import React from 'react';
import { Dialog, Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { SystemUpdateAlt as UpdateIcon } from '@mui/icons-material';

interface PWAUpdatePromptProps {
    open: boolean;
    onUpdate: () => void;
}

const PWAUpdatePrompt: React.FC<PWAUpdatePromptProps> = ({ open, onUpdate }) => {
    return (
        <Dialog
            open={open}
            // Enforce unclosable nature so the user MUST update.
            onClose={(e, reason) => {
                if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                    // ignore
                }
            }}
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    overflow: 'hidden',
                    m: 2,
                    p: 0,
                    maxWidth: 400,
                    background: '#FFFFFF',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
                }
            }}
            slotProps={{
                backdrop: {
                    sx: {
                        backdropFilter: 'blur(8px)',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)'
                    }
                }
            }}
        >
            <Box sx={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
                color: '#FFF',
                py: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Subtle background ring animations */}
                <Box sx={{
                    position: 'absolute', top: -50, right: -50, width: 150, height: 150,
                    borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                }} />

                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                >
                    <Box sx={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        mb: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                    }}>
                        <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        >
                            <UpdateIcon sx={{ fontSize: 40, color: '#FFF' }} />
                        </motion.div>
                    </Box>
                </motion.div>

                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                    New Update Available!
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', px: 3 }}>
                    We've just released some magical new features and improvements to JamesTronic. Let's get you updated!
                </Typography>
            </Box>

            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 3, fontWeight: 500 }}>
                    Updating only takes a split second.
                </Typography>

                <Button
                    variant="contained"
                    fullWidth
                    onClick={onUpdate}
                    sx={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFF',
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 700,
                        fontSize: '1rem',
                        textTransform: 'none',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 12px 24px rgba(16, 185, 129, 0.4)',
                        },
                        transition: 'all 0.2s',
                    }}
                >
                    Update & Restart App 🚀
                </Button>
            </Box>
        </Dialog>
    );
};

export default PWAUpdatePrompt;
