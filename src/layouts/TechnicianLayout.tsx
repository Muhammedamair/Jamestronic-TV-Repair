import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Avatar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Engineering, Logout } from '@mui/icons-material';

const TechnicianLayout: React.FC = () => {
    const { signOut } = useAuth();

    return (
        <Box sx={{ height: '100dvh', bgcolor: '#0A0E1A', color: 'text.primary', display: 'flex', flexDirection: 'column' }}>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: 'rgba(18, 24, 39, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
                    zIndex: 10,
                }}
            >
                <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 0.5 }}>
                    <Avatar
                        sx={{
                            bgcolor: 'rgba(0, 217, 255, 0.15)',
                            color: '#00D9FF',
                            mr: 1.5,
                            width: 36,
                            height: 36,
                        }}
                    >
                        <Engineering fontSize="small" />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}
                        >
                            JamesTronic
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', lineHeight: 1 }}>
                            Technician Portal
                        </Typography>
                    </Box>
                    <Button
                        onClick={signOut}
                        startIcon={<Logout fontSize="small" />}
                        size="small"
                        sx={{
                            color: '#94A3B8',
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.08)' },
                        }}
                    >
                        Sign Out
                    </Button>
                </Toolbar>
            </AppBar>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    px: { xs: 1.5, sm: 3 },
                    py: { xs: 2, sm: 3 },
                    pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 3 },
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default TechnicianLayout;
