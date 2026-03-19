import React from 'react';
import { Box, Typography, TextField, Button, Chip } from '@mui/material';
import {
    MyLocation as MyLocationIcon,
    LocationOn as LocationIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

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
        serviceType: string;
        tvBrand: string;
        tvSize: string;
        issueDescription: string;
        bracketStatus: string;
    };
    updateField: (field: string, value: any) => void;
    handleGetCurrentLocation: () => void;
}

const BookingStep3: React.FC<BookingStep3Props> = ({ form, updateField, handleGetCurrentLocation }) => {
    const shouldReduce = useReducedMotion();

    return (
        <>
            {/* ═══ BOOKING SUMMARY ═══ */}
            <motion.div
                initial={shouldReduce ? {} : { opacity: 0, y: -10 }}
                animate={shouldReduce ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Box sx={{ p: 2, background: '#F8FAFC', borderRadius: 3, mb: 4, border: '1px solid #E2E8F0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#1E293B', mb: 1.5, letterSpacing: '-0.2px' }}>
                        Booking Summary
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>Service</Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', textTransform: 'capitalize' }}>
                                {form.serviceType}
                            </Typography>
                        </Box>
                        {form.serviceType === 'repair' && form.issueDescription && (
                            <Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>Issue</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {form.issueDescription}
                                </Typography>
                            </Box>
                        )}
                        {form.serviceType === 'installation' && form.bracketStatus && (
                            <Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>Bracket</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {form.bracketStatus}
                                </Typography>
                            </Box>
                        )}
                        <Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>TV Brand</Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                                {form.tvBrand || 'Not provided'}
                            </Typography>
                        </Box>
                        {form.tvSize && (
                            <Box>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, mb: 0.2 }}>Size</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                                    {form.tvSize}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </motion.div>

            {/* Show pre-filled location if available */}
            <AnimatePresence>
                {form.address && (
                    <motion.div
                        initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 }}
                        animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                        exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                        <Box sx={{ 
                            background: '#F0FDF4', border: '1.5px solid #D1FAE5', borderRadius: 3, 
                            p: 2.5, mb: 3, display: 'flex', alignItems: 'center', gap: 2,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
                        }}>
                            <motion.div 
                                initial={shouldReduce ? {} : { scale: 0 }}
                                animate={shouldReduce ? {} : { scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                            >
                                <Box sx={{ p: 1, background: '#10B981', borderRadius: '50%', color: '#FFF', display: 'flex' }}>
                                    <LocationIcon sx={{ fontSize: 22 }} />
                                </Box>
                            </motion.div>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, color: '#065F46', fontSize: '0.8rem', mb: 0.3 }}>
                                    📍 Auto-filled from your location
                                </Typography>
                                <Typography sx={{ color: '#047857', fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {form.address}
                                </Typography>
                            </Box>
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div whileTap={shouldReduce ? {} : { scale: 0.97 }}>
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
            </motion.div>

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
                <motion.div
                    initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
                    animate={shouldReduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                    <Chip icon={<CheckIcon sx={{ fontSize: 16, color: '#10B981 !important' }} />} label="GPS location captured"
                        sx={{ mt: 2, color: '#065F46', backgroundColor: '#D1FAE5', fontWeight: 600, borderRadius: 2 }}
                    />
                </motion.div>
            )}
        </>
    );
};

export default BookingStep3;
