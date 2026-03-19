import React from 'react';
import { Box, Typography, TextField, Dialog, DialogContent } from '@mui/material';
import { CheckCircleOutline as CheckCircleOutlineIcon } from '@mui/icons-material';
import { motion, useReducedMotion, Variants } from 'framer-motion';

// Brand config — all popular TV brands in India (especially Hyderabad market)
const TV_BRANDS = [
    { name: 'Samsung', color: '#1428A0', bg: '#E8EEFF', accent: '#D0DBFF' },
    { name: 'LG', color: '#A50034', bg: '#FFF0F3', accent: '#FFD6E0' },
    { name: 'Sony', color: '#000000', bg: '#F0F0F0', accent: '#E0E0E0' },
    { name: 'Mi/Xiaomi', color: '#FF6900', bg: '#FFF4EC', accent: '#FFE0CC' },
    { name: 'OnePlus', color: '#EB0029', bg: '#FFF0F0', accent: '#FFD4D4' },
    { name: 'TCL', color: '#004990', bg: '#EDF4FF', accent: '#CCE0FF' },
    { name: 'Vu', color: '#FF3E00', bg: '#FFF3EE', accent: '#FFD8C8' },
    { name: 'Hisense', color: '#00AE4D', bg: '#EEFFF5', accent: '#CCFFE0' },
    { name: 'Panasonic', color: '#003087', bg: '#EDF0FF', accent: '#CCD8FF' },
    { name: 'Toshiba', color: '#E60012', bg: '#FFF0F0', accent: '#FFD4D4' },
    { name: 'Realme', color: '#F5C518', bg: '#FFFBEB', accent: '#FFF0B3' },
    { name: 'Thomson', color: '#00875A', bg: '#EEFFF7', accent: '#B8F0D8' },
    { name: 'Motorola', color: '#5C92FA', bg: '#EEF4FF', accent: '#C8DBFF' },
    { name: 'Aiwa', color: '#D32F2F', bg: '#FFF0EE', accent: '#FFD4CF' },
    { name: 'Other', color: '#6B7280', bg: '#F9FAFB', accent: '#E5E7EB' },
];

const TV_SIZES = ['32"', '40"', '41"', '42"', '43"', '46"', '49"', '50"', '55"', '65"', '75"', '84"', '108"'];

const COMMON_ISSUES = [
    { label: 'No display', image: '/services/issues/black_screen.png' },
    { label: 'Flickering', image: '/services/issues/flickering.png' },
    { label: 'No sound', image: '/services/issues/no_sound.png' },
    { label: 'Power issue', image: '/services/issues/power.png' },
    { label: 'Lines on screen', image: '/services/issues/lines.png' },
    { label: 'Screen Repair', image: '/services/tv_screen_repair.png' },
    { label: 'Not sure', image: '/services/issues/unknown.png' }
];

// Service type config with 3D icon images
const SERVICE_TYPES = [
    { value: 'repair', label: 'TV Repair', image: '/services/tv_checkup.png', color: '#5B4CF2', bg: 'linear-gradient(135deg, #F3F0FF 0%, #EDE9FE 100%)' },
    { value: 'installation', label: 'TV Installation', image: '/services/tv_installation.png', color: '#10B981', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' },
    { value: 'uninstallation', label: 'TV Uninstallation', image: '/services/tv_uninstallation.png', color: '#F59E0B', bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' },
];

// Clean Light Theme Inputs
const lightTextFieldStyle = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#F9FAFB', borderRadius: 2.5, color: '#111827', fontSize: '1rem',
        '& fieldset': { borderColor: '#E5E7EB', borderWidth: '1.5px' },
        '&:hover fieldset': { borderColor: '#D1D5DB' },
        '&.Mui-focused fieldset': { borderColor: '#5B4CF2' },
    },
};

interface BookingStep2Props {
    form: {
        serviceType: string;
        tvBrand: string;
        tvModel: string;
        tvSize: string;
        issueDescription: string;
        bracketStatus: string;
    };
    updateField: (field: string, value: any) => void;
    showBrandPicker: boolean;
    setShowBrandPicker: (show: boolean) => void;
    showSizePicker: boolean;
    setShowSizePicker: (show: boolean) => void;
}

const BookingStep2: React.FC<BookingStep2Props> = ({ form, updateField, showBrandPicker, setShowBrandPicker, showSizePicker, setShowSizePicker }) => {
    const shouldReduce = useReducedMotion();

    // Shake animation variant for issue cards
    const shakeVariants = {
        shake: { x: [0, -4, 4, -4, 4, 0], transition: { duration: 0.4 } },
        tap: { scale: 0.95 }
    };

    // Staggered list container
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    
    // Staggered list item
    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 15, scale: 0.9 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 22 } }
    };

    return (
        <>
            {/* ═══ BRAND PICKER DIALOG — Circular Brand Buttons ═══ */}
            <Dialog
                open={showBrandPicker}
                onClose={() => setShowBrandPicker(false)}
                fullWidth maxWidth="xs"
                PaperProps={{
                    sx: {
                        position: 'fixed', bottom: 0, m: 0, borderRadius: '24px 24px 0 0',
                        background: '#FFF', maxHeight: '75dvh', width: '100%', overflowY: 'auto'
                    }
                }}
            >
                <DialogContent sx={{ p: 2.5, pt: 2 }}>
                    <Box sx={{ width: 40, height: 5, borderRadius: 3, background: '#E5E7EB', mx: 'auto', mb: 2 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#111827', mb: 0.5, px: 0.5 }}>
                        Select TV Brand
                    </Typography>
                    <Typography sx={{ color: '#9CA3AF', fontSize: '0.78rem', mb: 3, px: 0.5 }}>
                        Popular brands in Hyderabad
                    </Typography>
                    <motion.div variants={shouldReduce ? {} : containerVariants} initial="hidden" animate="show">
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                            {TV_BRANDS.map(brand => {
                                const isSelected = form.tvBrand === brand.name;
                                return (
                                    <motion.div key={brand.name} variants={shouldReduce ? {} : itemVariants}>
                                        <motion.div
                                            whileTap={shouldReduce ? {} : { scale: 0.9 }}
                                            onClick={() => { updateField('tvBrand', brand.name); setShowBrandPicker(false); }}
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {/* Circular Brand badge */}
                                            <Box sx={{
                                                width: 68, height: 68, borderRadius: '50%',
                                                background: '#FFF',
                                                border: isSelected ? `2.5px solid ${brand.color}` : '1.5px solid #F3F4F6',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                mb: 1, position: 'relative',
                                                boxShadow: isSelected
                                                    ? `0 6px 16px ${brand.color}30, inset 0 0 20px ${brand.bg}`
                                                    : '0 4px 12px rgba(0,0,0,0.03)',
                                            }}>
                                                <Typography sx={{
                                                    fontWeight: 900,
                                                    fontSize: brand.name.length <= 4 ? '1.1rem' : '0.8rem',
                                                    color: brand.color,
                                                    letterSpacing: brand.name.length <= 3 ? '0.5px' : '-0.3px',
                                                    lineHeight: 1,
                                                    textTransform: brand.name.length <= 4 ? 'uppercase' : 'none',
                                                    position: 'relative', zIndex: 1
                                                }}>
                                                    {brand.name.length <= 5 ? brand.name : brand.name.split('/')[0]}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{
                                                fontWeight: isSelected ? 800 : 500,
                                                fontSize: '0.75rem',
                                                color: isSelected ? brand.color : '#4B5563',
                                                textAlign: 'center', lineHeight: 1.2,
                                            }}>
                                                {brand.name}
                                            </Typography>
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </Box>
                    </motion.div>
                </DialogContent>
            </Dialog>

            {/* ═══ TV SIZE PICKER DIALOG — Premium Bottom Sheet ═══ */}
            <Dialog
                open={showSizePicker}
                onClose={() => setShowSizePicker(false)}
                fullWidth maxWidth="xs"
                PaperProps={{
                    sx: {
                        position: 'fixed', bottom: 0, m: 0, borderRadius: '24px 24px 0 0',
                        background: '#FFF', maxHeight: '60dvh', width: '100%', overflowY: 'auto'
                    }
                }}
            >
                <DialogContent sx={{ p: 2.5, pt: 2 }}>
                    <Box sx={{ width: 40, height: 5, borderRadius: 3, background: '#E5E7EB', mx: 'auto', mb: 2 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#111827', mb: 3, px: 0.5 }}>
                        Select TV Size
                    </Typography>
                    <motion.div variants={shouldReduce ? {} : containerVariants} initial="hidden" animate="show">
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                            {TV_SIZES.map(size => {
                                const isSelected = form.tvSize === size;
                                return (
                                    <motion.div key={size} variants={shouldReduce ? {} : itemVariants}>
                                        <motion.div
                                            whileTap={shouldReduce ? {} : { scale: 0.9 }}
                                            onClick={() => { updateField('tvSize', size); setShowSizePicker(false); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '16px 0', borderRadius: '12px', cursor: 'pointer',
                                                border: isSelected ? `2px solid #5B4CF2` : '1.5px solid #F3F4F6',
                                                background: isSelected ? '#F3F0FF' : '#FAFAFA',
                                            }}
                                        >
                                            <Typography sx={{
                                                fontWeight: isSelected ? 800 : 600,
                                                fontSize: '1rem',
                                                color: isSelected ? '#5B4CF2' : '#374151',
                                            }}>
                                                {size}
                                            </Typography>
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </Box>
                    </motion.div>
                </DialogContent>
            </Dialog>

            {/* Service Type Selector */}
            <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1.5 }}>Service Type</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
                    {SERVICE_TYPES.map(option => {
                        const isActive = form.serviceType === option.value;
                        return (
                            <Box
                                key={option.value}
                                onClick={() => updateField('serviceType', option.value)}
                                sx={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
                                    minWidth: 100, py: 2.5, px: 1, borderRadius: 4, cursor: 'pointer',
                                    transition: 'all 0.2s', flexShrink: 0,
                                    border: isActive ? `2px solid ${option.color}` : '1.5px solid #F3F4F6',
                                    background: '#FFF',
                                    boxShadow: isActive ? `0 8px 20px ${option.color}25` : '0 2px 8px rgba(0,0,0,0.04)',
                                    '&:active': { transform: 'scale(0.96)' },
                                    position: 'relative'
                                }}
                            >
                                <Box sx={{
                                    width: 90, height: 90, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#FFF', position: 'relative',
                                    boxShadow: isActive ? `0 4px 12px ${option.color}40` : '0 2px 8px rgba(0,0,0,0.06)',
                                    mb: 0.5
                                }}>
                                    {/* Animated SVG Ring */}
                                    {isActive && !shouldReduce && (
                                        <svg width="90" height="90" viewBox="0 0 90 90" style={{ position: 'absolute', top: 0, left: 0 }}>
                                            <motion.circle
                                                cx="45" cy="45" r="43.5"
                                                fill="transparent"
                                                stroke={option.color}
                                                strokeWidth="3"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                            />
                                        </svg>
                                    )}
                                    <Box sx={{
                                        width: 84, height: 84, borderRadius: '50%', overflow: 'hidden',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <img src={option.image} alt={option.label}
                                            style={{ 
                                                width: '100%', height: '100%', objectFit: 'cover', 
                                                filter: isActive ? 'none' : 'grayscale(0.6)',
                                                transform: 'scale(1.16)',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                                            }}
                                        />
                                    </Box>
                                </Box>
                                <Typography sx={{
                                    fontWeight: isActive ? 800 : 600, fontSize: '0.75rem',
                                    color: isActive ? option.color : '#6B7280',
                                    textAlign: 'center', lineHeight: 1.2
                                }}>
                                    {option.label}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* Brand Picker */}
            <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>TV Brand *</Typography>
                <Box
                    onClick={() => setShowBrandPicker(true)}
                    sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        py: 1.8, px: 2, borderRadius: 2.5, cursor: 'pointer',
                        background: '#F9FAFB', border: form.tvBrand ? '2px solid #5B4CF2' : '1.5px solid #E5E7EB',
                        transition: 'all 0.2s', '&:active': { background: '#F3F4F6' }
                    }}
                >
                    <Typography sx={{ color: form.tvBrand ? '#111827' : '#9CA3AF', fontWeight: form.tvBrand ? 700 : 400, fontSize: '1rem' }}>
                        {form.tvBrand || 'Tap to select brand'}
                    </Typography>
                    <Typography sx={{ color: '#9CA3AF', fontSize: '0.9rem' }}>▾</Typography>
                </Box>
            </Box>

            {/* Model + Size */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>Model (Opt)</Typography>
                    <TextField fullWidth placeholder="e.g. AU7700" value={form.tvModel} onChange={e => updateField('tvModel', e.target.value)} sx={lightTextFieldStyle} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1 }}>
                        {form.serviceType === 'installation' ? 'Size *' : 'Size (Opt)'}
                    </Typography>
                    <Box
                        onClick={() => setShowSizePicker(true)}
                        sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            py: 1.8, px: 2, borderRadius: 2.5, cursor: 'pointer', height: '56px',
                            background: '#F9FAFB', border: form.tvSize ? '2px solid #5B4CF2' : '1.5px solid #E5E7EB',
                            transition: 'all 0.2s', '&:active': { background: '#F3F4F6' }
                        }}
                    >
                        <Typography sx={{ color: form.tvSize ? '#111827' : '#9CA3AF', fontWeight: form.tvSize ? 700 : 400, fontSize: '1rem' }}>
                            {form.tvSize || 'size'}
                        </Typography>
                        <Typography sx={{ color: '#9CA3AF', fontSize: '0.9rem' }}>▾</Typography>
                    </Box>
                </Box>
            </Box>

            {/* Issue Description (Repair mode) */}
            {form.serviceType === 'repair' && (
                <Box sx={{ mb: 1 }}>
                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1.5 }}>Describe the Issue *</Typography>
                    {/* Quick select options */}
                    <Box sx={{ 
                        display: 'flex', overflowX: 'auto', gap: 2, pb: 2, mb: 1, pt: 1, px: 0.5, mx: -0.5,
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch',
                        '&::-webkit-scrollbar': { display: 'none' } 
                    }}>
                        {[...COMMON_ISSUES].sort((a, b) => {
                            if (a.label === form.issueDescription) return -1;
                            if (b.label === form.issueDescription) return 1;
                            return 0;
                        }).map(issue => {
                            const isSelected = form.issueDescription === issue.label;
                            return (
                                <motion.div
                                    key={issue.label}
                                    variants={shouldReduce ? {} : shakeVariants}
                                    animate={isSelected ? "shake" : ""}
                                    whileTap={shouldReduce ? {} : "tap"}
                                    onClick={() => updateField('issueDescription', issue.label)}
                                    style={{
                                        flex: '0 0 auto', width: 135,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                        padding: '20px 12px', borderRadius: '20px', cursor: 'pointer',
                                        scrollSnapAlign: 'start',
                                        border: isSelected ? '2px solid #5B4CF2' : '1.5px solid #F3F4F6',
                                        background: isSelected ? 'linear-gradient(135deg, #F3F0FF 0%, #EDE9FE 100%)' : '#FFF',
                                        boxShadow: isSelected ? '0 8px 16px rgba(91, 76, 242, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                                    }}
                                >
                                    <Box sx={{
                                        width: 90, height: 90, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyItems: 'center',
                                        overflow: 'hidden', background: '#FFF',
                                        boxShadow: isSelected ? '0 4px 12px rgba(91,76,242,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                        border: isSelected ? '3px solid #FFF' : '2px solid #F9FAFB',
                                        mb: 0.5
                                    }}>
                                        <img src={issue.image} alt={issue.label} style={{
                                            width: '100%', height: '100%', objectFit: 'cover',
                                            filter: isSelected ? 'none' : 'grayscale(0.6)',
                                            transform: 'scale(1.16)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }} />
                                    </Box>
                                    <Typography sx={{
                                        fontWeight: isSelected ? 800 : 600,
                                        fontSize: '0.85rem',
                                        color: isSelected ? '#5B4CF2' : '#4B5563',
                                        textAlign: 'center', lineHeight: 1.2
                                    }}>
                                        {issue.label}
                                    </Typography>
                                </motion.div>
                            );
                        })}
                    </Box>
                    <TextField
                        fullWidth placeholder="Or type your issue here..."
                        value={form.issueDescription} onChange={e => updateField('issueDescription', e.target.value)}
                        multiline rows={2} sx={lightTextFieldStyle}
                    />
                </Box>
            )}

            {/* Bracket Status (Installation mode) */}
            {form.serviceType === 'installation' && (
                <Box sx={{ mb: 1 }}>
                    <Typography sx={{ color: '#4B5563', fontSize: '0.85rem', fontWeight: 600, mb: 1.5 }}>Wallmount Bracket *</Typography>
                    <Box sx={{ 
                        display: 'flex', overflowX: 'auto', gap: 2, pb: 2, mb: 1, pt: 1, px: 0.5, mx: -0.5,
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch',
                        '&::-webkit-scrollbar': { display: 'none' } 
                    }}>
                        {[
                            { label: 'I Have a Bracket', val: 'Customer has bracket', desc: "We'll install yours", icon: <CheckCircleOutlineIcon sx={{ fontSize: 40 }} /> },
                            { label: 'Non-Movable', val: 'Needs Fixed Bracket', desc: "Standard flat mount", image: '/assets/brackets/bracket-fixed.png' },
                            { label: 'Movable', val: 'Needs Movable Bracket', desc: "Swivel/tilt mount", image: '/assets/brackets/bracket-movable.png' }
                        ].map(opt => {
                            const isSelected = form.bracketStatus === opt.val;
                            return (
                                <motion.div
                                    key={opt.val}
                                    variants={shouldReduce ? {} : shakeVariants}
                                    animate={isSelected ? "shake" : ""}
                                    whileTap={shouldReduce ? {} : "tap"}
                                    onClick={() => updateField('bracketStatus', opt.val)}
                                    style={{
                                        flex: '0 0 auto', width: 140,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                        padding: '20px 12px', borderRadius: '20px', cursor: 'pointer',
                                        scrollSnapAlign: 'start',
                                        border: isSelected ? '2px solid #5B4CF2' : '1.5px solid #F3F4F6',
                                        background: isSelected ? 'linear-gradient(135deg, #F3F0FF 0%, #EDE9FE 100%)' : '#FFF',
                                        boxShadow: isSelected ? '0 8px 16px rgba(91, 76, 242, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                                    }}
                                >
                                    <Box sx={{
                                        width: 90, height: 90, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden',
                                        background: opt.image ? '#FFF' : (isSelected ? '#5B4CF2' : '#F3F4F6'),
                                        color: isSelected ? '#FFF' : '#6B7280',
                                        boxShadow: isSelected ? '0 4px 12px rgba(91,76,242,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                                        border: isSelected ? '3px solid #FFF' : '2px solid #F9FAFB',
                                        mb: 0.5,
                                        transition: 'all 0.3s'
                                    }}>
                                        {opt.image ? (
                                            <img src={opt.image} alt={opt.label} style={{
                                                width: '100%', height: '100%', objectFit: 'cover',
                                                filter: isSelected ? 'none' : 'grayscale(0.6)',
                                                transform: 'scale(1.16)',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }} />
                                        ) : opt.icon}
                                    </Box>
                                    <Typography sx={{
                                        fontWeight: isSelected ? 800 : 700,
                                        fontSize: '0.9rem',
                                        color: isSelected ? '#5B4CF2' : '#111827',
                                        textAlign: 'center', lineHeight: 1.2
                                    }}>
                                        {opt.label}
                                    </Typography>
                                    <Typography sx={{
                                        fontWeight: 500,
                                        fontSize: '0.75rem',
                                        color: isSelected ? '#5B4CF2' : '#6B7280',
                                        opacity: isSelected ? 0.9 : 1,
                                        textAlign: 'center', lineHeight: 1.2
                                    }}>
                                        {opt.desc}
                                    </Typography>
                                </motion.div>
                            );
                        })}
                    </Box>
                    <TextField
                        fullWidth placeholder="Any specific requirements? (Optional)"
                        value={form.issueDescription} onChange={e => updateField('issueDescription', e.target.value)}
                        multiline rows={2} sx={lightTextFieldStyle}
                    />
                </Box>
            )}
        </>
    );
};

export default BookingStep2;
