import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const SEVERITY_META = {
    error: {
        color: '#E5484D',
        bg: 'rgba(229, 72, 77, 0.10)',
        border: 'rgba(229, 72, 77, 0.30)',
        Icon: ErrorOutlineRoundedIcon,
        label: 'Error',
    },
    warning: {
        color: '#F5B74E',
        bg: 'rgba(245, 183, 78, 0.10)',
        border: 'rgba(245, 183, 78, 0.30)',
        Icon: WarningAmberRoundedIcon,
        label: 'Warning',
    },
    info: {
        color: '#6FA9FF',
        bg: 'rgba(111, 169, 255, 0.10)',
        border: 'rgba(111, 169, 255, 0.30)',
        Icon: InfoOutlinedIcon,
        label: 'Hint',
    },
};

const SEVERITY_ORDER = ['error', 'warning', 'info'];

export default function LintPanel({ findings, onJumpToField }) {
    if (!findings || findings.length === 0) return null;

    const grouped = SEVERITY_ORDER.map((sev) => ({
        sev,
        items: findings.filter((f) => f.severity === sev),
    })).filter((g) => g.items.length > 0);

    return (
        <Box sx={{ p: 2, pb: 0 }}>
            <Box
                sx={{
                    border: '1px solid var(--glass-stroke)',
                    background: 'var(--glass-strong)',
                    borderRadius: 2,
                    overflow: 'hidden',
                }}
            >
                {grouped.map((group, gi) => {
                    const meta = SEVERITY_META[group.sev];
                    const Icon = meta.Icon;
                    return (
                        <Box
                            key={group.sev}
                            sx={{
                                borderBottom: gi < grouped.length - 1 ? '1px solid var(--glass-stroke)' : 'none',
                            }}
                        >
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 0.6,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: meta.color,
                                    letterSpacing: '0.10em',
                                    textTransform: 'uppercase',
                                    background: meta.bg,
                                    borderBottom: '1px solid var(--glass-stroke)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                }}
                            >
                                <Icon sx={{ fontSize: 12 }} />
                                {meta.label} · {group.items.length}
                            </Box>
                            {group.items.map((f, i) => (
                                <Box
                                    key={`${f.code}-${i}`}
                                    role={f.field ? 'button' : undefined}
                                    tabIndex={f.field ? 0 : -1}
                                    onClick={() => f.field && onJumpToField?.(f.field)}
                                    onKeyDown={(e) => {
                                        if ((e.key === 'Enter' || e.key === ' ') && f.field) {
                                            e.preventDefault();
                                            onJumpToField?.(f.field);
                                        }
                                    }}
                                    sx={{
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'flex-start',
                                        px: 1.5,
                                        py: 0.75,
                                        cursor: f.field ? 'pointer' : 'default',
                                        transition: 'background 0.12s',
                                        '&:hover': f.field
                                            ? { background: 'var(--glass-inset)' }
                                            : {},
                                        '&:focus-visible': f.field
                                            ? {
                                                  outline: 'none',
                                                  background: 'var(--glass-inset)',
                                                  boxShadow: 'inset 0 0 0 2px var(--accent)',
                                              }
                                            : {},
                                    }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.4 }}>
                                            {f.message}
                                        </Typography>
                                    </Box>
                                    <Tooltip title={`Rule ${f.code}`} placement="left">
                                        <Chip
                                            label={f.code}
                                            size="small"
                                            sx={{
                                                fontSize: 10,
                                                height: 18,
                                                fontFamily: "'JetBrains Mono', monospace",
                                                color: meta.color,
                                                background: meta.bg,
                                                border: `1px solid ${meta.border}`,
                                                flexShrink: 0,
                                                '& .MuiChip-label': { px: 0.6 },
                                            }}
                                        />
                                    </Tooltip>
                                </Box>
                            ))}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
