import React, { useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Button, IconButton,
    InputAdornment, Alert, CircularProgress, keyframes,
} from '@mui/material';
import { Visibility, VisibilityOff, Build as BuildIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

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

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 20% 50%, rgba(108, 99, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0, 217, 255, 0.1) 0%, transparent 50%), #0A0E1A',
            p: 2,
        }}>
            {/* Background decorative elements */}
            <Box sx={{
                position: 'absolute', top: '15%', left: '10%',
                width: 200, height: 200, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(108,99,255,0.08), transparent)',
                animation: `${float} 6s ease-in-out infinite`,
            }} />
            <Box sx={{
                position: 'absolute', bottom: '20%', right: '15%',
                width: 150, height: 150, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,217,255,0.06), transparent)',
                animation: `${float} 8s ease-in-out infinite 2s`,
            }} />

            <Card sx={{
                width: '100%',
                maxWidth: 420,
                position: 'relative',
                overflow: 'visible',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -1,
                    borderRadius: 'inherit',
                    padding: 1,
                    background: 'linear-gradient(135deg, rgba(108,99,255,0.3), rgba(0,217,255,0.1))',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'xor',
                    WebkitMaskComposite: 'xor',
                    pointerEvents: 'none',
                },
            }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Box sx={{
                            display: 'inline-flex',
                            p: 2,
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,217,255,0.1))',
                            mb: 2,
                            animation: `${pulse} 3s ease-in-out infinite`,
                        }}>
                            <BuildIcon sx={{ fontSize: 36, color: '#6C63FF' }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} sx={{
                            background: 'linear-gradient(135deg, #F1F5F9, #94A3B8)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            Jamestronic
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            TV Repair Management System
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                            autoFocus
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            sx={{ mb: 3 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#64748B' }}>
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{
                                py: 1.5,
                                fontSize: '1rem',
                                position: 'relative',
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default LoginPage;
