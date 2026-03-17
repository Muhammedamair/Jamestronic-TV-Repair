import React from 'react';
import { Box, Typography, TextField, Button, Chip } from '@mui/material';
import {
    MyLocation as MyLocationIcon,
    LocationOn as LocationIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';

// Clean Light Theme Inputs
const lightTextFieldStyle = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#F9FAFB', borderRadius: 2.5, color: '#111827', fontSize: '1rem',
        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
        '&:hover fieldset': { borderColor: '#D1D5DB' },
        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
    },
};

interface BookingStep3Props {
    form: {
        address: string;
        lat: number;
        lng: number;
    };
    updateField: (field: string, value: any) => void;
    handleGetCurrentLocation: () => void;
}

const BookingStep3: React.FC<BookingStep3Props> = ({ form, updateField, handleGetCurrentLocation }) => {
    return (
        <>
            {/* Show pre-filled location if available */}
            {form.address && (
                <Box sx={{ 
                    background: '#F0FDF4', border: '1.5px solid #D1FAE5', borderRadius: 3, 
                    p: 2.5, mb: 3, display: 'flex', alignItems: 'center', gap: 2
                }}>
                    <Box sx={{ p: 1, background: '#10B981', borderRadius: '50%', color: '#FFF', display: 'flex' }}>
                        <LocationIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, color: '#065F46', fontSize: '0.8rem', mb: 0.3 }}>
                            📍 Auto-filled from your location
                        </Typography>
                        <Typography sx={{ color: '#047857', fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {form.address}
                        </Typography>
                    </Box>
                </Box>
            )}

            <Button
                fullWidth variant="outlined" startIcon={<MyLocationIcon />} onClick={handleGetCurrentLocation}
                sx={{
                    mb: 3, py: 1.5, borderRadius: 3, color: '#5B4CF2', borderColor: 'rgba(91,76,242,0.3)',
                    textTransform: 'none', fontWeight: 700, fontSize: '0.95rem',
                    '&:hover': { borderColor: '#5B4CF2', backgroundColor: 'rgba(91,76,242,0.05)' }
                }}
            >
                {form.address ? 'Refresh Location via GPS' : 'Use My Current Location'}
            </Button>

            <Typography sx={{ color: '#9CA3AF', textAlign: 'center', fontSize: '0.85rem', mb: 3, fontWeight: 500 }}>
                — OR EDIT / TYPE MANUALLY —
            </Typography>

            <Box sx={{ mb: 1 }}>
                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Pickup Address *</Typography>
                <TextField
                    fullWidth placeholder="Type your full address here..."
                    value={form.address} onChange={e => updateField('address', e.target.value)}
                    multiline rows={2} sx={lightTextFieldStyle}
                />
            </Box>

            {form.lat > 0 && (
                <Chip icon={<CheckIcon sx={{ fontSize: 16, color: '#10B981 !important' }} />} label="GPS location captured"
                    sx={{ mt: 2, color: '#065F46', backgroundColor: '#D1FAE5', fontWeight: 600, borderRadius: 2 }}
                />
            )}
        </>
    );
};

export default BookingStep3;
