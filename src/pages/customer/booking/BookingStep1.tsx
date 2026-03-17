import React from 'react';
import { Box, Typography, TextField, InputAdornment } from '@mui/material';

interface BookingStep1Props {
    form: {
        mobile: string;
        customerName: string;
    };
    updateField: (field: string, value: any) => void;
}

// Clean Light Theme Inputs
const lightTextFieldStyle = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#F9FAFB', borderRadius: 2.5, color: '#111827', fontSize: '1rem',
        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
        '&:hover fieldset': { borderColor: '#D1D5DB' },
        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
    },
};

const BookingStep1: React.FC<BookingStep1Props> = ({ form, updateField }) => {
    return (
        <>
            <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Mobile Number</Typography>
                <TextField
                    fullWidth placeholder="9052222901" value={form.mobile}
                    onChange={e => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    type="tel"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#111827', fontWeight: 600 }}>+91</Typography></InputAdornment> }}
                    sx={lightTextFieldStyle}
                />
            </Box>
            <Box sx={{ mb: 1 }}>
                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Your Name</Typography>
                <TextField
                    fullWidth placeholder="e.g. Rahul Kumar" value={form.customerName}
                    onChange={e => updateField('customerName', e.target.value)}
                    sx={lightTextFieldStyle}
                />
            </Box>
        </>
    );
};

export default BookingStep1;
