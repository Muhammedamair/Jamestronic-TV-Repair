import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, TextField, Button, Card, CardContent, Grid,
    MenuItem, Autocomplete, Divider, Alert, CircularProgress, Chip,
    InputAdornment, Tooltip, IconButton, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
    Save as SaveIcon, Phone as PhoneIcon, Person as PersonIcon,
    LocationOn, Tv, Description, Speed as SpeedIcon,
    Map as MapIcon, WhatsApp as WhatsAppIcon,
    Build as RepairIcon, InstallDesktop as InstallIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../hooks/useCustomers';
import { useTickets } from '../../hooks/useTickets';
import { TV_BRANDS, Customer, TicketServiceType } from '../../types/database';
import { sendInteraktMessage } from '../../utils/interakt';

const TicketCreatePage: React.FC = () => {
    const navigate = useNavigate();
    const { searchByMobile, createCustomer } = useCustomers();
    const { createTicket } = useTickets();

    const [customerName, setCustomerName] = useState('');
    const [mobile, setMobile] = useState('');
    const [altMobile, setAltMobile] = useState('');
    const [address, setAddress] = useState('');
    const [area, setArea] = useState('');
    const [tvBrand, setTvBrand] = useState('');
    const [tvModel, setTvModel] = useState('');
    const [tvSize, setTvSize] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [timeSlot, setTimeSlot] = useState('');
    const [diagnosedIssue, setDiagnosedIssue] = useState('');
    const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [serviceType, setServiceType] = useState<TicketServiceType>('REPAIR');

    const isInstallation = serviceType === 'INSTALLATION';

    const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
    const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Search customer by mobile as user types
    const handleMobileChange = useCallback(async (value: string) => {
        setMobile(value);
        setExistingCustomer(null);

        if (value.length >= 4) {
            setSearching(true);
            const { data } = await searchByMobile(value);
            if (data && data.length > 0) {
                setCustomerSuggestions(data);
            } else {
                setCustomerSuggestions([]);
            }
            setSearching(false);
        } else {
            setCustomerSuggestions([]);
        }
    }, [searchByMobile]);

    const selectCustomer = (customer: Customer) => {
        setExistingCustomer(customer);
        setCustomerName(customer.name);
        setMobile(customer.mobile);
        setAltMobile(customer.alt_mobile || '');
        setAddress(customer.address);
        setArea(customer.area || '');
        setCustomerSuggestions([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            let customerId = existingCustomer?.id;

            // Create customer if not existing
            if (!customerId) {
                const { data: newCustomer, error: custError } = await createCustomer({
                    name: customerName,
                    mobile,
                    alt_mobile: altMobile || undefined,
                    address,
                    area: area || undefined,
                });
                if (custError || !newCustomer) {
                    setError('Failed to create customer: ' + (custError?.message || 'Unknown error'));
                    setSubmitting(false);
                    return;
                }
                customerId = newCustomer.id;
            }

            // Create ticket
            const { data: ticket, error: ticketError } = await createTicket({
                customer_id: customerId,
                service_type: serviceType,
                tv_brand: tvBrand,
                tv_model: tvModel || undefined,
                tv_size: tvSize || undefined,
                issue_description: issueDescription,
                time_slot: timeSlot || undefined,
                diagnosed_issue: isInstallation ? undefined : (diagnosedIssue || undefined),
                priority,
                estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
            });

            if (ticketError || !ticket) {
                setError('Failed to create ticket: ' + (ticketError?.message || 'Unknown error'));
                setSubmitting(false);
                return;
            }

            // Fire and forget the automated WhatsApp confirmation
            console.log('📋 [TICKET] Ticket created. Mobile number for Interakt:', mobile);
            if (mobile) {
                console.log('📋 [TICKET] Sending Interakt message to:', mobile);
                sendInteraktMessage({
                    phoneNumber: mobile,
                    templateName: isInstallation ? 'installation_booking_confirmation' : 'service_booking_confirmation',
                    bodyValues: isInstallation ? [customerName || 'Customer', ticket.ticket_number] : undefined
                }).then(result => {
                    console.log('📋 [TICKET] Interakt send result:', result);
                }).catch(err => {
                    console.error('📋 [TICKET] Interakt send failed:', err);
                });
            } else {
                console.warn('📋 [TICKET] No mobile number found, skipping Interakt message');
            }

            setSuccess(`Ticket ${ticket.ticket_number} created successfully!`);
            setTimeout(() => navigate(`/tickets/${ticket.id}`), 1200);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        }
        setSubmitting(false);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Box sx={{
                    p: 1.5, borderRadius: 3,
                    background: isInstallation
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(0,217,255,0.12))'
                        : 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(0,217,255,0.12))',
                    boxShadow: isInstallation
                        ? '0 4px 20px rgba(16,185,129,0.2)'
                        : '0 4px 20px rgba(108,99,255,0.2)',
                }}>
                    {isInstallation
                        ? <InstallIcon sx={{ color: '#10B981', fontSize: 26 }} />
                        : <PhoneIcon sx={{ color: '#8B85FF', fontSize: 26 }} />}
                </Box>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{
                        background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px'
                    }}>
                        {isInstallation ? 'New Installation Ticket' : 'New Repair Ticket'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                        {isInstallation ? 'Book TV wall-mount / stand installation' : 'Quick create during call — fill details fast'}
                    </Typography>
                </Box>
                <Chip
                    icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                    label="CALL MODE"
                    size="small"
                    sx={{
                        ml: 'auto',
                        background: 'linear-gradient(135deg, #F59E0B20, #F9731620)',
                        color: '#F59E0B',
                        fontWeight: 700,
                        border: '1px solid #F59E0B40',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.7 },
                        },
                    }}
                />
            </Box>

            {/* Service Type Toggle */}
            <Card sx={{
                mb: 3,
                background: 'rgba(26, 34, 53, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
            }}>
                <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Service Type:
                    </Typography>
                    <ToggleButtonGroup
                        value={serviceType}
                        exclusive
                        onChange={(_, val) => val && setServiceType(val)}
                        size="small"
                        sx={{ flexGrow: 1 }}
                    >
                        <ToggleButton
                            value="REPAIR"
                            sx={{
                                flex: 1,
                                gap: 1,
                                fontWeight: 700,
                                borderColor: 'rgba(148,163,184,0.15)',
                                transition: 'all 0.25s ease',
                                '&.Mui-selected': {
                                    background: 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(108,99,255,0.1))',
                                    color: '#8B85FF',
                                    borderColor: '#6C63FF',
                                    boxShadow: '0 4px 15px rgba(108,99,255,0.2)',
                                },
                            }}
                        >
                            <RepairIcon fontSize="small" /> TV Repair
                        </ToggleButton>
                        <ToggleButton
                            value="INSTALLATION"
                            sx={{
                                flex: 1,
                                gap: 1,
                                fontWeight: 700,
                                borderColor: 'rgba(148,163,184,0.15)',
                                transition: 'all 0.25s ease',
                                '&.Mui-selected': {
                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.1))',
                                    color: '#10B981',
                                    borderColor: '#10B981',
                                    boxShadow: '0 4px 15px rgba(16,185,129,0.2)',
                                },
                            }}
                        >
                            <InstallIcon fontSize="small" /> TV Installation
                        </ToggleButton>
                    </ToggleButtonGroup>
                </CardContent>
            </Card>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    {/* Customer Info */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card sx={{
                            background: 'rgba(26, 34, 53, 0.7)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(148, 163, 184, 0.1)',
                            transition: 'border-color 0.3s',
                            '&:hover': { borderColor: 'rgba(108,99,255,0.25)' },
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                    <PersonIcon sx={{ color: '#8B85FF' }} />
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.85rem' }}>
                                        Customer Details
                                    </Typography>
                                </Box>

                                <TextField
                                    fullWidth
                                    label="Mobile Number"
                                    value={mobile}
                                    onChange={e => handleMobileChange(e.target.value)}
                                    required
                                    autoFocus
                                    inputProps={{ inputMode: 'tel', maxLength: 10 }}
                                    sx={{ mb: 1 }}
                                    helperText={searching ? 'Searching...' : mobile.length >= 4 && customerSuggestions.length === 0 ? 'New customer' : ''}
                                />

                                {customerSuggestions.length > 0 && !existingCustomer && (
                                    <Box sx={{ mb: 2 }}>
                                        {customerSuggestions.map(c => (
                                            <Chip
                                                key={c.id}
                                                label={`${c.name} — ${c.mobile}`}
                                                onClick={() => selectCustomer(c)}
                                                sx={{
                                                    mr: 0.5, mb: 0.5,
                                                    cursor: 'pointer',
                                                    backgroundColor: 'rgba(108,99,255,0.12)',
                                                    '&:hover': { backgroundColor: 'rgba(108,99,255,0.25)' },
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}

                                {existingCustomer && (
                                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                                        Existing customer found — details auto-filled
                                    </Alert>
                                )}

                                <TextField
                                    fullWidth
                                    label="Address"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    required
                                    multiline
                                    rows={2}
                                    sx={{ mb: 2 }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <Tooltip title="Search on Google Maps">
                                                    <IconButton
                                                        component="a"
                                                        href={`https://maps.google.com/?q=${encodeURIComponent(address || area)}`}
                                                        target="_blank"
                                                        disabled={!address && !area}
                                                        size="small"
                                                        sx={{ color: '#F59E0B' }}
                                                    >
                                                        <MapIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Request Location via WhatsApp">
                                                    <IconButton
                                                        component="a"
                                                        href={`https://wa.me/91${mobile}?text=${encodeURIComponent('Please share your exact location on WhatsApp so our technician can reach you easily.')}`}
                                                        target="_blank"
                                                        disabled={!mobile}
                                                        size="small"
                                                        sx={{ color: '#25D366' }}
                                                    >
                                                        <WhatsAppIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Area"
                                            value={area}
                                            onChange={e => setArea(e.target.value)}
                                            placeholder="e.g. Manikonda"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Alt. Mobile"
                                            value={altMobile}
                                            onChange={e => setAltMobile(e.target.value)}
                                            inputProps={{ inputMode: 'tel', maxLength: 10 }}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* TV & Issue */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Card sx={{
                            background: 'rgba(26, 34, 53, 0.7)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(148, 163, 184, 0.1)',
                            transition: 'border-color 0.3s',
                            '&:hover': { borderColor: isInstallation ? 'rgba(16,185,129,0.25)' : 'rgba(0,217,255,0.25)' },
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                    <Tv sx={{ color: isInstallation ? '#10B981' : '#00D9FF' }} />
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: '0.85rem' }}>
                                        {isInstallation ? 'TV & Installation Details' : 'TV & Issue Details'}
                                    </Typography>
                                </Box>

                                <TextField
                                    fullWidth
                                    select
                                    label="TV Brand"
                                    value={tvBrand}
                                    onChange={e => setTvBrand(e.target.value)}
                                    required
                                    sx={{ mb: 2 }}
                                >
                                    {TV_BRANDS.map(brand => (
                                        <MenuItem key={brand} value={brand}>{brand}</MenuItem>
                                    ))}
                                </TextField>

                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="TV Model"
                                            value={tvModel}
                                            onChange={e => setTvModel(e.target.value)}
                                            placeholder="e.g. UA43T5500"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Screen Size"
                                            value={tvSize}
                                            onChange={e => setTvSize(e.target.value)}
                                            placeholder='e.g. 43"'
                                        />
                                    </Grid>
                                </Grid>

                                <TextField
                                    fullWidth
                                    label={isInstallation ? 'Installation Requirements' : "Issue Description (Customer's words)"}
                                    value={issueDescription}
                                    onChange={e => setIssueDescription(e.target.value)}
                                    required
                                    multiline
                                    rows={2}
                                    sx={{ mb: 2 }}
                                    placeholder={isInstallation
                                        ? 'e.g. Wall mount needed, stand setup, tilting bracket...'
                                        : 'e.g. TV not turning on, sound but no picture...'}
                                />

                                {isInstallation && (
                                    <TextField
                                        fullWidth
                                        label="Preferred Time Slot (Optional)"
                                        value={timeSlot}
                                        onChange={e => setTimeSlot(e.target.value)}
                                        sx={{ mb: 2 }}
                                        placeholder="e.g. Today 5 PM, Tomorrow Morning..."
                                    />
                                )}

                                {!isInstallation && (
                                    <>
                                        <Divider sx={{ my: 2, borderColor: 'rgba(108,99,255,0.1)' }} />

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Description sx={{ color: '#10B981' }} />
                                            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                                                Your Diagnosis (Optional — add on call)
                                            </Typography>
                                        </Box>

                                        <TextField
                                            fullWidth
                                            label="Diagnosed Issue"
                                            value={diagnosedIssue}
                                            onChange={e => setDiagnosedIssue(e.target.value)}
                                            multiline
                                            rows={2}
                                            sx={{ mb: 2 }}
                                            placeholder="e.g. Likely backlight issue, need to check LED strips..."
                                        />
                                    </>
                                )}

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            fullWidth
                                            select
                                            label="Priority"
                                            value={priority}
                                            onChange={e => setPriority(e.target.value as any)}
                                        >
                                            <MenuItem value="LOW">Low</MenuItem>
                                            <MenuItem value="MEDIUM">Medium</MenuItem>
                                            <MenuItem value="HIGH">High</MenuItem>
                                            <MenuItem value="URGENT">Urgent</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Est. Cost (₹)"
                                            value={estimatedCost}
                                            onChange={e => setEstimatedCost(e.target.value)}
                                            inputProps={{ inputMode: 'numeric' }}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Submit */}
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/tickets')}
                                sx={{
                                    borderColor: 'rgba(148,163,184,0.2)',
                                    color: '#94A3B8',
                                    fontWeight: 600,
                                    px: 3,
                                    '&:hover': { borderColor: 'rgba(148,163,184,0.4)', background: 'rgba(148,163,184,0.05)' },
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={submitting}
                                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                sx={{
                                    minWidth: 220,
                                    fontWeight: 700,
                                    background: isInstallation
                                        ? 'linear-gradient(135deg, #10B981, #059669)'
                                        : 'linear-gradient(135deg, #6C63FF, #8B85FF)',
                                    boxShadow: isInstallation
                                        ? '0 6px 20px rgba(16,185,129,0.35)'
                                        : '0 6px 20px rgba(108,99,255,0.35)',
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                        background: isInstallation
                                            ? 'linear-gradient(135deg, #059669, #047857)'
                                            : 'linear-gradient(135deg, #5A52E0, #7A74FF)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: isInstallation
                                            ? '0 8px 28px rgba(16,185,129,0.45)'
                                            : '0 8px 28px rgba(108,99,255,0.45)',
                                    }
                                }}
                            >
                                {submitting ? 'Creating...' : (isInstallation ? 'Create Installation Ticket' : 'Create Repair Ticket')}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};

export default TicketCreatePage;
