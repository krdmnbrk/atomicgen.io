import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { lineDiff, diffStats } from '../utils/lineDiff';

const lineSx = {
    px: 1,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    borderLeft: '3px solid transparent',
};

export default function DiffViewer({ original, current }) {
    const diff = React.useMemo(
        () => lineDiff(original || '', current || ''),
        [original, current]
    );
    const stats = React.useMemo(() => diffStats(diff), [diff]);

    if (!original) {
        return (
            <Typography sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>
                No baseline to compare. The Diff tab is available after loading a test from atomic-red-team,
                a sample, an upload, AI, or a restored draft.
            </Typography>
        );
    }

    if (stats.added === 0 && stats.removed === 0) {
        return (
            <Typography sx={{ p: 2, color: 'success.main', fontSize: 13 }}>
                Identical — no changes vs originally loaded YAML.
            </Typography>
        );
    }

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    mb: 1,
                    alignItems: 'center',
                    fontFamily: "'JetBrains Mono', monospace",
                }}
            >
                <Box
                    component="span"
                    sx={{
                        fontSize: 11,
                        color: 'success.main',
                        background: 'rgba(77,221,150,0.10)',
                        border: '1px solid rgba(77,221,150,0.30)',
                        px: 0.75,
                        borderRadius: 0.75,
                    }}
                >
                    +{stats.added}
                </Box>
                <Box
                    component="span"
                    sx={{
                        fontSize: 11,
                        color: 'error.main',
                        background: 'rgba(229,72,77,0.10)',
                        border: '1px solid rgba(229,72,77,0.30)',
                        px: 0.75,
                        borderRadius: 0.75,
                    }}
                >
                    −{stats.removed}
                </Box>
                <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', flex: 1 }}>
                    vs originally loaded YAML
                </Typography>
            </Box>
            <Box
                sx={{
                    background: 'var(--glass-strong)',
                    border: '1px solid var(--glass-stroke)',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                }}
            >
                {diff.map((d, i) => (
                    <Box
                        key={i}
                        sx={{
                            ...lineSx,
                            background:
                                d.type === 'add'
                                    ? 'rgba(77,221,150,0.10)'
                                    : d.type === 'del'
                                    ? 'rgba(229,72,77,0.10)'
                                    : 'transparent',
                            color:
                                d.type === 'add'
                                    ? 'success.main'
                                    : d.type === 'del'
                                    ? 'error.main'
                                    : 'text.secondary',
                            borderLeftColor:
                                d.type === 'add'
                                    ? '#4DDD96'
                                    : d.type === 'del'
                                    ? '#E5484D'
                                    : 'transparent',
                        }}
                    >
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-block',
                                width: 14,
                                opacity: 0.7,
                                color:
                                    d.type === 'add'
                                        ? 'success.main'
                                        : d.type === 'del'
                                        ? 'error.main'
                                        : 'text.secondary',
                            }}
                        >
                            {d.type === 'add' ? '+' : d.type === 'del' ? '−' : ' '}
                        </Box>
                        {d.line || ' '}
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
