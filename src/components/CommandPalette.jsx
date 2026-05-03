import React from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

// Lightweight command palette — fuzzy substring filter, keyboard
// navigable. Commands are passed in as a flat list keyed by group.
//
// Shape:
//   { id, label, hint, group, keys?, icon, onRun, disabled?, disabledReason? }

function matches(item, q) {
    if (!q) return true;
    const hay = `${item.label} ${item.hint || ''} ${item.group || ''}`.toLowerCase();
    return q
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((tok) => hay.includes(tok));
}

function Kbd({ children }) {
    return (
        <Box
            component="kbd"
            sx={{
                px: 0.6,
                py: 0.05,
                ml: 0.5,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                background: 'var(--glass-inset)',
                border: '1px solid var(--glass-stroke)',
                borderRadius: 0.5,
                color: 'text.secondary',
            }}
        >
            {children}
        </Box>
    );
}

export default function CommandPalette({ open, onClose, commands }) {
    const [query, setQuery] = React.useState('');
    const [activeIdx, setActiveIdx] = React.useState(0);
    const inputRef = React.useRef(null);
    const listRef = React.useRef(null);

    React.useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIdx(0);
            setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
        }
    }, [open]);

    const filtered = React.useMemo(
        () => (commands || []).filter((c) => matches(c, query)),
        [commands, query]
    );

    React.useEffect(() => {
        setActiveIdx(0);
    }, [query]);

    const grouped = React.useMemo(() => {
        const out = [];
        let lastGroup = null;
        filtered.forEach((c) => {
            if (c.group !== lastGroup) {
                out.push({ type: 'group', label: c.group });
                lastGroup = c.group;
            }
            out.push({ type: 'item', cmd: c });
        });
        return out;
    }, [filtered]);

    const runCmd = (cmd) => {
        if (!cmd || cmd.disabled) return;
        onClose();
        // small delay so the modal is unmounted before action runs (avoids
        // focus issues for follow-up dialogs)
        setTimeout(() => cmd.onRun && cmd.onRun(), 50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            runCmd(filtered[activeIdx]);
        }
    };

    React.useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        position: 'absolute',
                        top: '12vh',
                        m: 0,
                    },
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.25, borderBottom: '1px solid var(--glass-stroke)' }}>
                <SearchRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                <InputBase
                    inputRef={inputRef}
                    fullWidth
                    placeholder="Search commands…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    sx={{ fontSize: 14, color: 'text.primary' }}
                />
                <Kbd>esc</Kbd>
            </Box>

            <Box ref={listRef} sx={{ maxHeight: '50vh', overflowY: 'auto', py: 0.5 }}>
                {filtered.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>
                        No commands match.
                    </Box>
                ) : (
                    <List dense disablePadding>
                        {grouped.map((row, i) => {
                            if (row.type === 'group') {
                                return (
                                    <Box
                                        key={`g-${i}`}
                                        sx={{
                                            px: 2,
                                            pt: i === 0 ? 0.5 : 1.25,
                                            pb: 0.4,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            letterSpacing: '0.10em',
                                            textTransform: 'uppercase',
                                            color: 'var(--text-faint)',
                                        }}
                                    >
                                        {row.label}
                                    </Box>
                                );
                            }
                            const cmd = row.cmd;
                            const realIdx = filtered.indexOf(cmd);
                            const Icon = cmd.icon;
                            const active = realIdx === activeIdx;
                            return (
                                <ListItem key={cmd.id} disablePadding data-idx={realIdx}>
                                    <ListItemButton
                                        disabled={cmd.disabled}
                                        onClick={() => runCmd(cmd)}
                                        onMouseEnter={() => setActiveIdx(realIdx)}
                                        sx={{
                                            mx: 0.75,
                                            borderRadius: 1.25,
                                            background: active ? 'var(--accent-soft)' : 'transparent',
                                            '&:hover': { background: 'var(--accent-soft)' },
                                            '& .MuiListItemIcon-root': { minWidth: 30 },
                                        }}
                                    >
                                        {Icon && (
                                            <ListItemIcon>
                                                <Icon sx={{ fontSize: 16, color: active ? 'primary.main' : 'text.secondary' }} />
                                            </ListItemIcon>
                                        )}
                                        <ListItemText
                                            primary={
                                                cmd.disabled && cmd.disabledReason ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                                        <Typography component="span" sx={{ fontSize: 13, opacity: 0.7 }}>{cmd.label}</Typography>
                                                        <Typography component="span" sx={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{cmd.disabledReason}</Typography>
                                                    </Box>
                                                ) : (
                                                    cmd.label
                                                )
                                            }
                                            secondary={cmd.hint}
                                            primaryTypographyProps={{
                                                fontSize: 13,
                                                color: active ? 'primary.main' : 'text.primary',
                                            }}
                                            secondaryTypographyProps={{ fontSize: 11, color: 'var(--text-faint)' }}
                                        />
                                        {cmd.keys && cmd.keys.length > 0 && (
                                            <Box sx={{ display: 'inline-flex' }}>
                                                {cmd.keys.map((k, ki) => (
                                                    <Kbd key={ki}>{k}</Kbd>
                                                ))}
                                            </Box>
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </Box>

            <Box sx={{
                display: 'flex',
                gap: 1.5,
                px: 2,
                py: 0.75,
                borderTop: '1px solid var(--glass-stroke)',
                fontSize: 10,
                color: 'var(--text-faint)',
                fontFamily: "'JetBrains Mono', monospace",
                alignItems: 'center',
            }}>
                <Box>↑↓ navigate</Box>
                <Box>↵ run</Box>
                <Box>esc close</Box>
                <Box sx={{ flex: 1 }} />
                <Box>{filtered.length} command{filtered.length === 1 ? '' : 's'}</Box>
            </Box>
        </Dialog>
    );
}
