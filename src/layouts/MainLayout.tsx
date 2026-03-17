import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Avatar, Divider, useMediaQuery,
    useTheme, Tooltip, Badge,
} from '@mui/material';
import {
    Dashboard as DashboardIcon, ConfirmationNumber as TicketIcon,
    People as PeopleIcon, Add as AddIcon,
    Menu as MenuIcon, ChevronLeft as ChevronLeftIcon, Settings as SettingsIcon,
    Logout as LogoutIcon, Build as BuildIcon, Store as StoreIcon,
    BarChart as AnalyticsIcon, Engineering as TechIcon,
    LocalShipping as TransportIcon, Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

const navItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
    { label: 'Tickets', icon: <TicketIcon />, path: '/admin/tickets' },
    { label: 'Customers', icon: <PeopleIcon />, path: '/admin/customers' },
    { label: 'Dealer Network', icon: <StoreIcon />, path: '/admin/dealers' },
    { label: 'Tech Network', icon: <TechIcon />, path: '/admin/technicians' },
    { label: 'Transporters', icon: <TransportIcon />, path: '/admin/transporters' },
    { label: 'Procurement', icon: <BuildIcon />, path: '/admin/parts' },
    { label: 'Notifications', icon: <NotificationsIcon />, path: '/admin/notifications' },
    { label: 'Analytics', icon: <AnalyticsIcon />, path: '/admin/analytics' },
];

const MainLayout: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [drawerOpen, setDrawerOpen] = useState(!isMobile);
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut } = useAuth();
    const [badgeCounts, setBadgeCounts] = useState({
        procurement: 0,
        transporters: 0,
        techNetwork: 0,
        tickets: 0
    });

    const drawerWidth = drawerOpen ? DRAWER_WIDTH : DRAWER_COLLAPSED;

    // Fetch initial badge counts and subscribe to changes
    React.useEffect(() => {
        const fetchCounts = async () => {
            let procurementCount = 0, transportCount = 0, techCount = 0, ticketCount = 0;

            try {
                const res = await supabase.from('part_requests')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['PENDING_REVIEW', 'OPEN', 'BIDS_RECEIVED']);
                procurementCount = res.count || 0;
            } catch { /* table may not exist */ }

            try {
                const res = await supabase.from('transport_jobs')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']);
                transportCount = res.count || 0;
            } catch { /* table may not exist */ }

            try {
                const res = await supabase.from('ticket_technician_log')
                    .select('*', { count: 'exact', head: true })
                    .in('tech_status', ['ASSIGNED', 'IN_PROGRESS', 'PART_REQUIRED']);
                techCount = res.count || 0;
            } catch { /* table may not exist */ }

            try {
                // Use actual ticket_status enum values from the DB
                const res = await supabase.from('tickets')
                    .select('*', { count: 'exact', head: true })
                    .not('status', 'in', '(CLOSED,DELIVERED)');
                ticketCount = res.count || 0;
            } catch { /* ignore */ }

            setBadgeCounts({
                procurement: procurementCount,
                transporters: transportCount,
                techNetwork: techCount,
                tickets: ticketCount
            });
        };

        fetchCounts();

        // Optional: polling fallback (every 60s) just in case realtime drops
        const pollInterval = setInterval(fetchCounts, 60000);

        // Realtime Subscription on all 4 tables
        const badgesChannel = supabase.channel('sidebar-badges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'part_requests' }, fetchCounts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_jobs' }, fetchCounts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_technician_log' }, fetchCounts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchCounts)
            .subscribe();

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(badgesChannel);
        };
    }, []);

    const drawerContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 }}>
                <Avatar 
                    src="/logo.png" 
                    alt="JamesTronic Logo"
                    sx={{
                        width: 40, height: 40,
                        bgcolor: 'transparent',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }} 
                />
                {drawerOpen && (
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ color: '#F1F5F9', fontSize: '0.9rem' }}>
                            Jamestronic
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ color: '#64748B', fontSize: '0.7rem' }}>
                            TV Repair Centre
                        </Typography>
                    </Box>
                )}
            </Box>

            <Divider sx={{ borderColor: 'rgba(108,99,255,0.1)' }} />

            {/* Quick Create Button */}
            <Box sx={{ px: 1.5, py: 1.5 }}>
                <ListItemButton
                    onClick={() => { navigate('/admin/tickets/new'); isMobile && setDrawerOpen(false); }}
                    sx={{
                        borderRadius: 2.5,
                        background: 'linear-gradient(135deg, #6C63FF 0%, #8B85FF 100%)',
                        color: '#fff',
                        py: 1.2,
                        justifyContent: drawerOpen ? 'flex-start' : 'center',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #5A52E0 0%, #7A74FF 100%)',
                            transform: 'scale(1.02)',
                        },
                        transition: 'all 0.2s ease',
                    }}
                >
                    <AddIcon sx={{ mr: drawerOpen ? 1 : 0 }} />
                    {drawerOpen && <Typography fontWeight={600} fontSize="0.9rem">New Ticket</Typography>}
                </ListItemButton>
            </Box>

            <List sx={{ px: 1, flex: 1 }}>
                {navItems.map(item => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/admin' && location.pathname.startsWith(item.path));
                    return (
                        <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                            <Tooltip title={drawerOpen ? '' : item.label} placement="right">
                                <ListItemButton
                                    onClick={() => { navigate(item.path); isMobile && setDrawerOpen(false); }}
                                    sx={{
                                        borderRadius: 2,
                                        py: 1.2,
                                        justifyContent: drawerOpen ? 'flex-start' : 'center',
                                        backgroundColor: isActive ? 'rgba(108, 99, 255, 0.12)' : 'transparent',
                                        color: isActive ? '#6C63FF' : '#94A3B8',
                                        '&:hover': {
                                            backgroundColor: isActive ? 'rgba(108, 99, 255, 0.18)' : 'rgba(148, 163, 184, 0.08)',
                                            color: isActive ? '#8B85FF' : '#F1F5F9',
                                        },
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        '&::before': isActive ? {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            top: '20%',
                                            height: '60%',
                                            width: 3,
                                            borderRadius: 4,
                                            backgroundColor: '#6C63FF',
                                        } : {},
                                    }}
                                >
                                    <ListItemIcon sx={{
                                        minWidth: drawerOpen ? 40 : 'auto',
                                        color: 'inherit',
                                    }}>
                                        {item.label === 'Tickets' ? (
                                            <Badge badgeContent={badgeCounts.tickets} color="error" max={99}>{item.icon}</Badge>
                                        ) : item.label === 'Procurement' ? (
                                            <Badge badgeContent={badgeCounts.procurement} color="error" max={99}>{item.icon}</Badge>
                                        ) : item.label === 'Transporters' ? (
                                            <Badge badgeContent={badgeCounts.transporters} color="error" max={99}>{item.icon}</Badge>
                                        ) : item.label === 'Tech Network' ? (
                                            <Badge badgeContent={badgeCounts.techNetwork} color="error" max={99}>{item.icon}</Badge>
                                        ) : (
                                            item.icon
                                        )}
                                    </ListItemIcon>
                                    {drawerOpen && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive ? 600 : 400, fontSize: '0.9rem' }} />}
                                </ListItemButton>
                            </Tooltip>
                        </ListItem>
                    );
                })}
            </List>

            <Divider sx={{ borderColor: 'rgba(108,99,255,0.1)' }} />
            <List sx={{ px: 1, pb: 1 }}>
                <ListItem disablePadding>
                    <Tooltip title={drawerOpen ? '' : 'Sign Out'} placement="right">
                        <ListItemButton
                            onClick={signOut}
                            sx={{
                                borderRadius: 2, py: 1,
                                justifyContent: drawerOpen ? 'flex-start' : 'center',
                                color: '#94A3B8',
                                '&:hover': { color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)' },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: drawerOpen ? 40 : 'auto', color: 'inherit' }}>
                                <LogoutIcon />
                            </ListItemIcon>
                            {drawerOpen && <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: '0.9rem' }} />}
                        </ListItemButton>
                    </Tooltip>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100dvh', backgroundColor: '#0A0E1A' }}>
            {isMobile ? (
                <Drawer
                    variant="temporary"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
                >
                    {drawerContent}
                </Drawer>
            ) : (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: drawerWidth,
                        flexShrink: 0,
                        transition: 'width 0.3s ease',
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            transition: 'width 0.3s ease',
                            overflowX: 'hidden',
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
            )}

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        backgroundColor: 'rgba(10, 14, 26, 0.8)',
                        backdropFilter: 'blur(12px)',
                        borderBottom: '1px solid rgba(108, 99, 255, 0.08)',
                    }}
                >
                    <Toolbar sx={{ gap: 1 }}>
                        <IconButton
                            onClick={() => setDrawerOpen(!drawerOpen)}
                            sx={{ color: '#94A3B8' }}
                        >
                            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
                        </IconButton>
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="caption" sx={{ color: '#64748B', mr: 1 }}>
                            Manikonda, Hyderabad
                        </Typography>
                        <Avatar sx={{
                            width: 34, height: 34,
                            background: 'linear-gradient(135deg, #6C63FF, #00D9FF)',
                            fontSize: '0.85rem',
                        }}>
                            A
                        </Avatar>
                    </Toolbar>
                </AppBar>

                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        p: { xs: 2, sm: 3 },
                        overflow: 'auto',
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(108,99,255,0.3)', borderRadius: 3 },
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export default MainLayout;
