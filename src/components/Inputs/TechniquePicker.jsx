import React from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

// Tactic → accent palette. MITRE tactic strings in atomic-red-team CSV are
// lowercased and hyphenated (e.g. "credential-access").
const TACTIC_COLORS = {
    'reconnaissance':         { fg: '#9AA3AE', ring: 'rgba(154,163,174,0.30)', bg: 'rgba(154,163,174,0.08)' },
    'resource-development':   { fg: '#9AA3AE', ring: 'rgba(154,163,174,0.30)', bg: 'rgba(154,163,174,0.08)' },
    'initial-access':         { fg: '#6FA9FF', ring: 'rgba(111,169,255,0.35)', bg: 'rgba(111,169,255,0.08)' },
    'execution':              { fg: '#FF8A66', ring: 'rgba(255,92,57,0.35)',   bg: 'rgba(255,92,57,0.08)'   },
    'persistence':            { fg: '#C28FFF', ring: 'rgba(194,143,255,0.35)', bg: 'rgba(194,143,255,0.08)' },
    'privilege-escalation':   { fg: '#FFB347', ring: 'rgba(255,179,71,0.35)',  bg: 'rgba(255,179,71,0.08)'  },
    'defense-evasion':        { fg: '#4DDD96', ring: 'rgba(77,221,150,0.35)',  bg: 'rgba(77,221,150,0.08)'  },
    'credential-access':      { fg: '#F45C7B', ring: 'rgba(244,92,123,0.35)',  bg: 'rgba(244,92,123,0.08)'  },
    'discovery':              { fg: '#50D5E0', ring: 'rgba(80,213,224,0.35)',  bg: 'rgba(80,213,224,0.08)'  },
    'lateral-movement':       { fg: '#B4D85A', ring: 'rgba(180,216,90,0.35)',  bg: 'rgba(180,216,90,0.08)'  },
    'collection':             { fg: '#F5B74E', ring: 'rgba(245,183,78,0.35)',  bg: 'rgba(245,183,78,0.08)'  },
    'command-and-control':    { fg: '#A6B3C2', ring: 'rgba(166,179,194,0.35)', bg: 'rgba(166,179,194,0.08)' },
    'exfiltration':           { fg: '#FF8AB0', ring: 'rgba(255,138,176,0.35)', bg: 'rgba(255,138,176,0.08)' },
    'impact':                 { fg: '#F76C6C', ring: 'rgba(247,108,108,0.35)', bg: 'rgba(247,108,108,0.08)' },
};
const DEFAULT_TACTIC_COLOR = { fg: '#9AA3AE', ring: 'rgba(154,163,174,0.30)', bg: 'rgba(154,163,174,0.08)' };
const tacticColor = (t) => TACTIC_COLORS[t] || DEFAULT_TACTIC_COLOR;
const tacticLabel = (t) => (t || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function TacticChip({ tactic, size = 'sm', onClick, active }) {
    const c = tacticColor(tactic);
    return (
        <Box
            component={onClick ? 'button' : 'span'}
            onClick={onClick}
            sx={{
                display: 'inline-flex', alignItems: 'center',
                px: size === 'sm' ? 0.9 : 1.2, py: size === 'sm' ? 0.2 : 0.4,
                fontSize: size === 'sm' ? 10.5 : 11.5, fontWeight: 500,
                borderRadius: 999,
                color: active ? 'var(--accent-2)' : c.fg,
                background: active ? 'var(--accent-soft)' : c.bg,
                border: '1px solid',
                borderColor: active ? 'var(--accent-ring)' : c.ring,
                whiteSpace: 'nowrap',
                cursor: onClick ? 'pointer' : 'default',
                fontFamily: 'inherit',
                '&:hover': onClick ? { background: active ? 'var(--accent-soft)' : 'rgba(255,255,255,0.06)' } : {},
            }}
        >
            {tacticLabel(tactic)}
        </Box>
    );
}

const VALID_TID_RE = /^T\d{4}(\.\d{3})?$/i;

export default function TechniquePicker({
    value,
    onChange,
    options = [],
    tests = [],
    attackUrl,
    required,
    error,
    sx,
}) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [activeTactic, setActiveTactic] = React.useState(null);
    const inputRef = React.useRef(null);

    // Build TID → Set<tactic> map (a technique can map to multiple tactics)
    const tacticByTid = React.useMemo(() => {
        const m = new Map();
        for (const t of tests) {
            if (!t.tid || !t.tactic) continue;
            if (!m.has(t.tid)) m.set(t.tid, new Set());
            m.get(t.tid).add(t.tactic);
        }
        return m;
    }, [tests]);

    const allTactics = React.useMemo(() => {
        const s = new Set();
        for (const tactics of tacticByTid.values()) for (const t of tactics) s.add(t);
        return [...s].sort();
    }, [tacticByTid]);

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        let arr = options;
        if (activeTactic) {
            arr = arr.filter((o) => tacticByTid.get(o.id)?.has(activeTactic));
        }
        if (q) {
            arr = arr.filter(
                (o) =>
                    o.id.toLowerCase().includes(q) ||
                    (o.name || '').toLowerCase().includes(q)
            );
        }
        return arr.slice(0, 200);
    }, [options, activeTactic, query, tacticByTid]);

    // "Use custom TID" suggestion when query looks like a TID and isn't in index
    const customSuggestion = React.useMemo(() => {
        const q = query.trim();
        if (!VALID_TID_RE.test(q)) return null;
        const upper = q.toUpperCase();
        if (options.some((o) => o.id === upper)) return null;
        return upper;
    }, [query, options]);

    const current = React.useMemo(
        () => (value ? options.find((o) => o.id === value) : null),
        [options, value]
    );

    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        setQuery('');
        setActiveTactic(null);
    };
    const handlePick = (option) => {
        if (option && option.id) {
            onChange({ id: option.id, name: option.name });
        }
        handleClose();
    };
    const handlePickCustom = () => {
        if (!customSuggestion) return;
        onChange({ id: customSuggestion, name: null });
        handleClose();
    };

    // Focus search when dialog opens
    React.useEffect(() => {
        if (open) {
            const t = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [open]);

    return (
        <>
            {/* ── Tile ───────────────────────────────────────── */}
            <Box
                role="button"
                tabIndex={0}
                onClick={handleOpen}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(); }
                }}
                sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 0.25,
                    px: 1.75,
                    py: 0.75,
                    pr: 5,
                    minHeight: 52,
                    minWidth: 0,
                    background: 'var(--glass-inset)',
                    border: '1px solid',
                    borderColor: error ? 'error.main' : 'var(--glass-stroke)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color .15s, background .15s, box-shadow .15s',
                    '&:hover': { borderColor: 'var(--glass-stroke-strong)' },
                    '&:focus-visible': {
                        borderColor: 'primary.main',
                        boxShadow: '0 0 0 3px var(--accent-soft)',
                    },
                    ...sx,
                }}
            >
                <Box
                    sx={{
                        fontSize: 11, fontWeight: 600,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: error ? 'error.main' : 'var(--text-faint)',
                    }}
                >
                    ATT&amp;CK technique{required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 22, minWidth: 0 }}>
                    {value ? (
                        <>
                            <Box
                                className="mono"
                                sx={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600, fontSize: 14,
                                    color: 'primary.main',
                                    flexShrink: 0,
                                }}
                            >
                                {value}
                            </Box>
                            {current?.name && (
                                <Box
                                    sx={{
                                        fontSize: 14, color: 'text.primary',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        flex: 1, minWidth: 0,
                                    }}
                                    title={current.name}
                                >
                                    {current.name}
                                </Box>
                            )}
                        </>
                    ) : (
                        <Box sx={{ fontSize: 14, color: 'var(--text-faint)' }}>
                            Choose a technique…
                        </Box>
                    )}
                </Box>
                {/* Adornments */}
                <Box sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                    {attackUrl && (
                        <Tooltip title="Open on attack.mitre.org">
                            <IconButton
                                component="a"
                                href={attackUrl}
                                target="_blank"
                                rel="noopener"
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                                sx={{ color: 'primary.main' }}
                            >
                                <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <KeyboardArrowDownRoundedIcon sx={{ color: 'var(--text-faint)', fontSize: 18, ml: 0.25 }} />
                </Box>
            </Box>

            {/* ── Picker Dialog ──────────────────────────────── */}
            <Dialog
                open={open}
                onClose={handleClose}
                fullWidth
                maxWidth="sm"
                sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
                PaperProps={{
                    sx: {
                        mt: { xs: '6vh', sm: '12vh' },
                        mx: 2,
                        background: '#14181E',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 32px 80px -16px rgba(0,0,0,0.85)',
                    },
                }}
            >
                {/* Search bar */}
                <Box
                    sx={{
                        display: 'flex', alignItems: 'center', gap: 1.25,
                        px: 2, py: 1.5,
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <SearchRoundedIcon sx={{ fontSize: 18, color: 'var(--text-faint)' }} />
                    <Box
                        component="input"
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by ID or name (e.g. T1003 or 'credential dump')"
                        sx={{
                            flex: 1, background: 'transparent', border: 0, outline: 0,
                            color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, padding: 0,
                            '&::placeholder': { color: 'var(--text-faint)' },
                        }}
                    />
                    <Box
                        sx={{
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
                            px: 0.75, py: 0.25, borderRadius: 0.5,
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        esc
                    </Box>
                    <IconButton size="small" onClick={handleClose} sx={{ color: 'var(--text-faint)' }}>
                        <CloseRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                {/* Tactic filter */}
                {allTactics.length > 0 && (
                    <Box
                        sx={{
                            display: 'flex', gap: 0.75,
                            px: 1.75, py: 1.25,
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            overflowX: 'auto',
                            '&::-webkit-scrollbar': { height: 4 },
                            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: 2 },
                        }}
                    >
                        <TacticChip
                            tactic="all"
                            onClick={() => setActiveTactic(null)}
                            active={activeTactic === null}
                        />
                        {allTactics.map((t) => (
                            <TacticChip
                                key={t}
                                tactic={t}
                                onClick={() => setActiveTactic(t === activeTactic ? null : t)}
                                active={activeTactic === t}
                            />
                        ))}
                    </Box>
                )}

                {/* Results list */}
                <Box sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    {filtered.length === 0 && !customSuggestion && (
                        <Box sx={{ py: 4, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
                            No matches.
                        </Box>
                    )}
                    {filtered.map((option) => {
                        const tac = [...(tacticByTid.get(option.id) || [])][0];
                        return (
                            <Box
                                key={option.id}
                                onClick={() => handlePick(option)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                    px: 2, py: 1.25,
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'background .12s',
                                    '&:hover': { background: '#1B2029' },
                                    '&:last-of-type': { borderBottom: 0 },
                                }}
                            >
                                <Box
                                    sx={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 12, fontWeight: 500,
                                        color: 'primary.main',
                                        minWidth: 88,
                                    }}
                                >
                                    {option.id}
                                </Box>
                                <Box
                                    sx={{
                                        fontSize: 13.5, color: 'text.primary',
                                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}
                                >
                                    {option.name}
                                </Box>
                                {tac && <TacticChip tactic={tac} />}
                            </Box>
                        );
                    })}
                    {customSuggestion && (
                        <Box
                            onClick={handlePickCustom}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                px: 2, py: 1.25,
                                cursor: 'pointer',
                                background: 'rgba(255,92,57,0.06)',
                                borderTop: '1px solid rgba(255,92,57,0.2)',
                                '&:hover': { background: 'rgba(255,92,57,0.10)' },
                            }}
                        >
                            <Box sx={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 88 }}>
                                Custom
                            </Box>
                            <Box sx={{ fontSize: 13.5, color: 'text.primary' }}>
                                Use{' '}
                                <Box component="span" sx={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600, color: 'primary.main',
                                }}>
                                    {customSuggestion}
                                </Box>{' '}
                                as TID (not in atomic-red-team index)
                            </Box>
                        </Box>
                    )}
                </Box>
            </Dialog>
        </>
    );
}
