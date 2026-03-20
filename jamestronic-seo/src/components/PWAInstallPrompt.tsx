"use client";
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Paper, Slide, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Close as CloseIcon, GetApp as DownloadIcon, IosShare as IosShareIcon, AddBox as AddToHomeScreenIcon } from '@mui/icons-material';

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
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // Handle standard PWA install prompt (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            
            if (!(typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).getItem('pwa_prompt_dismissed')) {
                const timer = setTimeout(() => setShowPrompt(true), 3000);
                return () => clearTimeout(timer);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check iOS
        const ua = window.navigator.userAgent;
        const ios = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
        const webkit = !!ua.match(/WebKit/i);
        const iosSafari = ios && webkit && !ua.match(/CriOS/i);
        
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || (window.navigator as any).standalone === true;

        if (iosSafari && !isStandalone && !(typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).getItem('pwa_prompt_dismissed')) {
            setIsIOS(true);
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }

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
            // Show visual iOS instructions instead of an alert
            if (isIOS) {
                setShowPrompt(false);
                setShowIOSInstructions(true);
            }
            return;
        }

        setShowPrompt(false);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        } else {
            (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).setItem('pwa_prompt_dismissed', 'true');
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).setItem('pwa_prompt_dismissed', 'true');
    };

    const handleCloseIOS = () => {
        setShowIOSInstructions(false);
        (typeof window !== 'undefined' ? localStorage : { getItem:()=>null, setItem:()=>{}, removeItem:()=>{}, clear:()=>{} }).setItem('pwa_prompt_dismissed', 'true');
    };

    return (
        <>
            {/* Banner Prompt */}
            <Slide direction="up" in={showPrompt} mountOnEnter unmountOnExit>
                <Paper
                    elevation={6}
                    sx={{
                        position: 'fixed', bottom: { xs: 80, sm: 24 }, left: { xs: 16, sm: 'auto' }, right: { xs: 16, sm: 24 },
                        width: { sm: 380 }, zIndex: 2000, borderRadius: 4, background: '#FFF',
                        p: 2, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #F3F4F6'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ 
                            width: 52, height: 52, borderRadius: 3, background: '#F3F4F6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2, flexShrink: 0,
                            boxShadow: 'inset 0px -2px 6px rgba(0,0,0,0.05)', color: '#111827', fontWeight: 900, fontSize: '1.2rem'
                        }}>
                            JT
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1rem', mb: 0.5, letterSpacing: '-0.2px' }}>
                                Add JamesTronic App
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                Enjoy faster booking & instant repair tracking directly from your home screen.
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={handleDismiss} sx={{ color: '#9CA3AF', p: 0.5, ml: 1, '&:hover': { background: '#F3F4F6', color: '#111827' } }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <Button
                        fullWidth variant="contained" startIcon={!isIOS ? <DownloadIcon /> : null} onClick={handleInstallClick}
                        sx={{ background: '#5B4CF2', textTransform: 'none', fontWeight: 700, borderRadius: 3, py: 1.2, boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' } }}
                    >
                        {isIOS ? 'Install on iPhone 🚀' : 'Install App (Free)'}
                    </Button>
                </Paper>
            </Slide>

            {/* Visual iOS Instructions Dialog */}
            <Dialog 
                open={showIOSInstructions} 
                onClose={handleCloseIOS}
                PaperProps={{ sx: { borderRadius: 4, width: '100%', maxWidth: 400, m: 2, p: 1 } }}
            >
                <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: '#111827', letterSpacing: '-0.3px' }}>
                        Install the App
                    </Typography>
                    <IconButton onClick={handleCloseIOS} sx={{ color: '#9CA3AF' }}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pb: 3 }}>
                    <Typography sx={{ color: '#6B7280', fontSize: '0.95rem', mb: 4, lineHeight: 1.4 }}>
                        Install the **JamesTronic** app on your iPhone or iPad for the best experience. It's free and takes 10 seconds!
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Step 1 */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ 
                                width: 36, height: 36, borderRadius: '50%', background: '#E0E7FF', color: '#4F46E5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0
                            }}>1</Box>
                            <Box>
                                <Typography sx={{ color: '#111827', fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>Tap the Share button</Typography>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.85rem' }}>Look at the bottom of your Safari browser and tap the Share icon:</Typography>
                                <Box sx={{ mt: 1, color: '#007AFF', display: 'flex', justifyContent: 'center', p: 1, background: '#F3F4F6', borderRadius: 2, width: 'fit-content' }}>
                                    <IosShareIcon fontSize="large" />
                                </Box>
                            </Box>
                        </Box>

                        {/* Step 2 */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ 
                                width: 36, height: 36, borderRadius: '50%', background: '#E0E7FF', color: '#4F46E5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0
                            }}>2</Box>
                            <Box>
                                <Typography sx={{ color: '#111827', fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>Select Add to Home Screen</Typography>
                                <Typography sx={{ color: '#6B7280', fontSize: '0.85rem' }}>Scroll down in the menu and tap 'Add to Home Screen':</Typography>
                                <Box sx={{ mt: 1, color: '#111827', display: 'flex', justifyContent: 'center', p: 1, background: '#F3F4F6', borderRadius: 2, width: 'fit-content' }}>
                                    <AddToHomeScreenIcon fontSize="large" sx={{ color: '#111827' }} />
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    <Button 
                        fullWidth variant="contained" onClick={handleCloseIOS}
                        sx={{ mt: 5, py: 1.5, borderRadius: 3, background: '#F3F4F6', color: '#111827', fontWeight: 700, boxShadow: 'none', '&:hover': { background: '#E5E7EB', boxShadow: 'none' }, textTransform: 'none' }}
                    >
                        Got it!
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PWAInstallPrompt;
