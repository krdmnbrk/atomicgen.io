import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import LinkIcon from '@mui/icons-material/Link';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';

// Footer status bar — Vim/VS Code modeline-style. Always visible.
// Shows: source provenance · dirty/clean · lint counts · saved-at · ⌘K hint.
function fmtAgo(date) {
    if (!date) return null;
    const diff = (Date.now() - date) / 1000;
    if (diff < 5) return 'just now';
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleString();
}

function sourceLabel(source) {
    if (!source) return 'fresh';
    switch (source.type) {
        case 'repo':    return `repo · ${source.tid || 'AT'}`;
        case 'sample':  return `sample · ${source.label || ''}`;
        case 'upload':  return `upload · ${source.filename || ''}`;
        case 'ai':      return 'AI generated';
        case 'draft':   return 'autosave';
        case 'shared':  return 'shared link';
        case 'library': return 'library';
        default: return source.type;
    }
}

export default function StatusBar({
    loadedSource,
    changed,
    errorCount = 0,
    warningCount = 0,
    infoCount = 0,
    lastSavedAt = null,
    onOpenCommandPalette,
}) {
    const [, force] = React.useReducer((x) => x + 1, 0);
    React.useEffect(() => {
        // Tick every 30s so "saved 14s ago" stays current.
        const t = setInterval(force, 30000);
        return () => clearInterval(t);
    }, []);

    const totalLint = errorCount + warningCount + infoCount;
    const lintColor = errorCount > 0 ? 'error.main' : warningCount > 0 ? 'warning.main' : infoCount > 0 ? 'info.main' : 'success.main';
    const lintGlow = errorCount > 0 ? '#E5484D' : warningCount > 0 ? '#F5B74E' : infoCount > 0 ? '#6FA9FF' : '#4DDD96';

    return (
        <Box
            role="status"
            aria-label="Status bar"
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                height: 28,
                px: { xs: 1.25, sm: 2 },
                display: 'flex',
                alignItems: 'center',
                gap: 1.75,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'text.secondary',
                background: 'var(--glass-strong)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                borderTop: '1px solid var(--glass-stroke)',
                whiteSpace: 'nowrap',
                overflowX: 'auto',
                overflowY: 'hidden',
            }}
        >
            <Tooltip title="Always client-side · BYOK · keys never leave your browser" placement="top">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'success.main', flexShrink: 0 }}>
                    <LockOutlinedIcon sx={{ fontSize: 12 }} />
                    BYOK
                </Box>
            </Tooltip>

            <Box sx={{ opacity: 0.4 }}>·</Box>

            <Tooltip title={loadedSource ? `Source: ${sourceLabel(loadedSource)}` : 'Authoring from scratch'}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                    <LinkIcon sx={{ fontSize: 12 }} />
                    {sourceLabel(loadedSource)}
                </Box>
            </Tooltip>

            {changed && (
                <>
                    <Box sx={{ opacity: 0.4 }}>·</Box>
                    <Tooltip title="You have unsaved changes — Cmd/Ctrl+S to download, Cmd/Ctrl+Shift+S to save to library">
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'warning.main', flexShrink: 0 }}>
                            <CircleRoundedIcon sx={{ fontSize: 8 }} />
                            modified
                        </Box>
                    </Tooltip>
                </>
            )}

            {totalLint > 0 && (
                <>
                    <Box sx={{ opacity: 0.4 }}>·</Box>
                    <Tooltip title={`${errorCount} error · ${warningCount} warning · ${infoCount} hint`}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: lintColor, flexShrink: 0 }}>
                            <CircleRoundedIcon sx={{ fontSize: 8, filter: `drop-shadow(0 0 3px ${lintGlow})` }} />
                            {errorCount > 0 && `${errorCount}E`}
                            {warningCount > 0 && ` ${warningCount}W`}
                            {infoCount > 0 && ` ${infoCount}i`}
                        </Box>
                    </Tooltip>
                </>
            )}

            {lastSavedAt && (
                <>
                    <Box sx={{ opacity: 0.4 }}>·</Box>
                    <Tooltip title={`Last saved ${new Date(lastSavedAt).toLocaleString()}`}>
                        <Box sx={{ flexShrink: 0 }}>saved {fmtAgo(lastSavedAt)}</Box>
                    </Tooltip>
                </>
            )}

            <Box sx={{ flex: 1 }} />

            <Tooltip title="Open command palette">
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={onOpenCommandPalette}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenCommandPalette && onOpenCommandPalette();
                        }
                    }}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        flexShrink: 0,
                        opacity: 0.7,
                        transition: 'opacity 0.12s',
                        '&:hover': { opacity: 1, color: 'text.primary' },
                        '&:focus-visible': { outline: '1px solid var(--accent)', outlineOffset: 2, borderRadius: 0.5 },
                    }}
                >
                    <Box component="kbd" sx={{ px: 0.6, py: 0.05, fontSize: 10, background: 'var(--glass-inset)', border: '1px solid var(--glass-stroke)', borderRadius: 0.5 }}>⌘K</Box>
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                        <Typography component="span" sx={{ fontFamily: 'inherit', fontSize: 11 }}>commands</Typography>
                    </Box>
                </Box>
            </Tooltip>
        </Box>
    );
}
