import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Paper, Slide } from '@mui/material';
import { Close as CloseIcon, GetApp as DownloadIcon } from '@mui/icons-material';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Handle standard PWA install prompt (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            
            // Don't show immediately if they just dismissed it recently
            if (!localStorage.getItem('pwa_prompt_dismissed')) {
                // Delay showing to not interrupt immediate user goals
                const timer = setTimeout(() => setShowPrompt(true), 3000);
                return () => clearTimeout(timer);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if device is iOS (iOS doesn't support beforeinstallprompt)
        const ua = window.navigator.userAgent;
        const ios = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
        const webkit = !!ua.match(/WebKit/i);
        const iosSafari = ios && webkit && !ua.match(/CriOS/i);
        
        // Also check if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || (window.navigator as any).standalone === true;

        if (iosSafari && !isStandalone && !localStorage.getItem('pwa_prompt_dismissed')) {
            setIsIOS(true);
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }

        // Handle successful install event
        const handleAppInstalled = () => {
            setShowPrompt(false);
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // For iOS, just show instructions
            if (isIOS) {
                alert('To install: tap the Share button at the bottom of Safari, then tap "Add to Home Screen".');
                handleDismiss();
            }
            return;
        }

        setShowPrompt(false);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        } else {
            // If they dismiss the native prompt, don't nag them again soon
            localStorage.setItem('pwa_prompt_dismissed', 'true');
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Remember dismissal so we don't nag them on every page load
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    return (
        <Slide direction="up" in={showPrompt} mountOnEnter unmountOnExit>
            <Paper
                elevation={6}
                sx={{
                    position: 'fixed',
                    bottom: { xs: 16, sm: 24 },
                    left: { xs: 16, sm: 'auto' },
                    right: { xs: 16, sm: 24 },
                    width: { sm: 380 },
                    zIndex: 2000,
                    borderRadius: 3,
                    background: 'rgba(30,41,59,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(108,99,255,0.3)',
                    p: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ 
                        width: 48, height: 48, borderRadius: 2, 
                        background: 'linear-gradient(135deg, #6C63FF, #00D9FF)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        mr: 2, flexShrink: 0
                    }}>
                        <img src="/logo.png" alt="Logo" style={{ width: 32, height: 32, borderRadius: 4 }} 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.95rem' }}>
                            Install JamesTronic App
                        </Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem', lineHeight: 1.3 }}>
                            Add to your home screen for faster tracking and easy 1-tap bookings.
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={handleDismiss} sx={{ color: '#64748B', p: 0.5, ml: 1 }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
                <Button
                    fullWidth
                    variant="contained"
                    startIcon={!isIOS ? <DownloadIcon /> : null}
                    onClick={handleInstallClick}
                    sx={{
                        background: 'linear-gradient(135deg, #6C63FF, #8B85FF)',
                        textTransform: 'none', fontWeight: 600, borderRadius: 2, py: 1
                    }}
                >
                    {isIOS ? 'Show Install Instructions' : 'Install App (Free)'}
                </Button>
            </Paper>
        </Slide>
    );
};

export default PWAInstallPrompt;
