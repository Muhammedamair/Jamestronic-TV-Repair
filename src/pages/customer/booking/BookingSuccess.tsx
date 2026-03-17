import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface BookingSuccessProps {
    ticketNumber: string;
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ ticketNumber }) => {
    const navigate = useNavigate();

    return (
        <Box sx={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            p: 3, zIndex: 9999 
        }}>
            <Card sx={{ maxWidth: 440, width: '100%', borderRadius: 4, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: 'none' }}>
                <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                    <Box sx={{ 
                        width: 80, height: 80, borderRadius: '50%', background: '#D1FAE5', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 
                    }}>
                        <CheckIcon sx={{ fontSize: 44, color: '#10B981' }} />
                    </Box>
                    <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.6rem', mb: 1, letterSpacing: '-0.3px' }}>
                        Booking Confirmed! 🎉
                    </Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: '0.95rem', mb: 4 }}>
                        Our expert will arrive at your location shortly. Save your ticket number to track progress.
                    </Typography>

                    <Box sx={{ background: '#F3F4F6', borderRadius: 3, py: 2.5, mb: 4 }}>
                        <Typography sx={{ color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', mb: 0.5 }}>
                            Ticket Number
                        </Typography>
                        <Typography sx={{ color: '#5B4CF2', fontWeight: 800, fontSize: '1.6rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                            {ticketNumber}
                        </Typography>
                    </Box>

                    <Button fullWidth variant="contained" onClick={() => navigate(`/track/${ticketNumber}`)}
                        sx={{
                            py: 1.8, borderRadius: 3, background: '#5B4CF2', fontWeight: 700, textTransform: 'none', fontSize: '1.05rem', 
                            mb: 2, boxShadow: '0 4px 14px rgba(91,76,242,0.4)', '&:hover': { background: '#4F46E5' }
                        }}
                    >
                        Track Your TV Status
                    </Button>
                    <Button fullWidth variant="text" onClick={() => navigate('/')} sx={{ color: '#6B7280', textTransform: 'none', fontWeight: 600 }}>
                        Back to Home
                    </Button>
                </CardContent>
            </Card>
        </Box>
    );
};

export default BookingSuccess;
