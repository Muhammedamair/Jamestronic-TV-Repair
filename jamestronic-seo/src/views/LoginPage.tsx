"use client";
import React, { useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Button, IconButton,
    InputAdornment, Alert, CircularProgress, Container
} from '@mui/material';
import { Visibility, VisibilityOff, Build as BuildIcon, Person as PersonIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const { push: navigate } = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await signIn(email, password);
        if (error) {
            setError(error.message);
        } else {
            navigate('/');
        }
        setLoading(false);
    };

    // Clean Light Theme Inputs
    const lightTextFieldStyle = {
        '& .MuiOutlinedInput-root': {
            backgroundColor: '#F9FAFB', borderRadius: 2.5, color: '#111827', fontSize: '1rem',
            '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
            '&:hover fieldset': { borderColor: '#D1D5DB' },
            '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
        },
    };

    return (
        <Box sx={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F9FAFB',
            fontFamily: '"Inter", sans-serif',
            px: 2, py: 4
        }}>
            <Container maxWidth="xs" sx={{ p: 0 }}>
                <Card sx={{ 
                    background: '#FFF', 
                    borderRadius: 5, 
                    boxShadow: '0 10px 40px rgba(0,0,0,0.06)', 
                    border: '1px solid #F3F4F6' 
                }}>
                    <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
                        
                        <Box sx={{ 
                            width: 72, height: 72, borderRadius: '50%', background: '#F3F4F6', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 
                        }}>
                            <PersonIcon sx={{ fontSize: 36, color: '#5B4CF2' }} />
                        </Box>
                        
                        <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.5px' }}>
                            JamesTronic
                        </Typography>
                        <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', mb: 4, fontWeight: 500 }}>
                            Staff & Admin Portal
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 3, borderRadius: 2, textAlign: 'left' }}>
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                            <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Email Address</Typography>
                            <TextField
                                fullWidth
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@jamestronic.com"
                                required
                                sx={{ mb: 3, ...lightTextFieldStyle }}
                                autoFocus
                            />

                            <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Password</Typography>
                            <TextField
                                fullWidth
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                sx={{ mb: 4, ...lightTextFieldStyle }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#9CA3AF' }}>
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            
                            <Button
                                fullWidth type="submit" variant="contained" disabled={loading}
                                sx={{
                                    py: 1.6, borderRadius: 3, background: '#5B4CF2', fontWeight: 800, textTransform: 'none', fontSize: '1.05rem',
                                    boxShadow: '0 4px 14px rgba(91,76,242,0.3)', '&:hover': { background: '#4F46E5' },
                                    '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' }
                                }}
                            >
                                {loading ? <CircularProgress size={24} sx={{ color: '#FFF' }} /> : 'Sign In'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button onClick={() => navigate('/')} sx={{ color: '#6B7280', textTransform: 'none', fontWeight: 600 }}>
                        ← Back to Customer Home
                    </Button>
                </Box>
            </Container>
        </Box>
    );
};

export default LoginPage;
