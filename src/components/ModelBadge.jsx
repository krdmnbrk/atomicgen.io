import React from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// Small chip showing "<provider> · <model>" — used in AI loading states
// so the user knows exactly which model their key is being charged for.
// Themed to match the glass + accent + mono aesthetic.
export default function ModelBadge({ providerName, model, sx }) {
    if (!providerName && !model) return null;
    return (
        <Tooltip title="BYOK · this provider + model is billed to your key, never proxied">
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.25,
                    py: 0.5,
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'text.secondary',
                    background: 'var(--glass-strong)',
                    border: '1px solid var(--glass-stroke)',
                    borderRadius: 1.5,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    ...sx,
                }}
            >
                <LockOutlinedIcon sx={{ fontSize: 12, color: 'success.main' }} />
                {providerName && (
                    <Box component="span" sx={{ color: 'text.secondary' }}>{providerName}</Box>
                )}
                {providerName && model && (
                    <Box component="span" sx={{ color: 'var(--text-faint)' }}>·</Box>
                )}
                {model && (
                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>{model}</Box>
                )}
            </Box>
        </Tooltip>
    );
}
