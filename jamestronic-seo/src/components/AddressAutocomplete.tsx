"use client";
import React, { useRef, useEffect, useState } from 'react';
import { TextField, Box, Paper, Typography, InputAdornment } from '@mui/material';
import { LocationOn, MyLocation } from '@mui/icons-material';

interface AddressAutocompleteProps {
    value: string;
    onChange: (address: string, lat?: number, lng?: number) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    multiline?: boolean;
    rows?: number;
    sx?: any;
    endAdornment?: React.ReactNode;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    value,
    onChange,
    label = 'Address',
    placeholder = 'Start typing an address...',
    required = false,
    disabled = false,
    fullWidth = true,
    multiline = false,
    rows,
    sx,
    endAdornment,
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

    useEffect(() => {
        // Check if Google Maps is loaded
        const checkGoogle = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                setIsGoogleLoaded(true);
            } else {
                setTimeout(checkGoogle, 500);
            }
        };
        checkGoogle();
    }, []);

    useEffect(() => {
        if (!isGoogleLoaded || !inputRef.current || autocompleteRef.current) return;

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'in' }, // India only
            fields: ['formatted_address', 'geometry', 'name'],
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place && place.formatted_address) {
                const lat = place.geometry?.location?.lat();
                const lng = place.geometry?.location?.lng();
                onChange(place.formatted_address, lat, lng);
            }
        });

        autocompleteRef.current = autocomplete;

        return () => {
            if (autocompleteRef.current) {
                google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, [isGoogleLoaded, onChange]);

    return (
        <TextField
            inputRef={inputRef}
            fullWidth={fullWidth}
            label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
            multiline={multiline}
            rows={rows}
            placeholder={placeholder}
            sx={sx}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <LocationOn sx={{ color: isGoogleLoaded ? '#10B981' : '#64748B', fontSize: 20 }} />
                    </InputAdornment>
                ),
                ...(endAdornment ? { endAdornment } : {}),
            }}
        />
    );
};

export default AddressAutocomplete;
