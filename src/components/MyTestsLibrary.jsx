import React from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputBase from '@mui/material/InputBase';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import BookmarksRoundedIcon from '@mui/icons-material/BookmarksRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import useLocalLibrary from '../hooks/useLocalLibrary';
import { useConfirm } from './ConfirmDialog';

function fmtDateAbsolute(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function fmtDateRelative(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        const diff = (Date.now() - d) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return d.toLocaleDateString();
    } catch {
        return iso;
    }
}

const SORT_OPTIONS = [
    { value: 'recent', label: 'Most recent', sort: (a, b) => (b.savedAt || '').localeCompare(a.savedAt || '') },
    { value: 'oldest', label: 'Oldest first', sort: (a, b) => (a.savedAt || '').localeCompare(b.savedAt || '') },
    { value: 'name',   label: 'Name (A → Z)', sort: (a, b) => (a.name || '').localeCompare(b.name || '') },
    { value: 'tid',    label: 'TID',         sort: (a, b) => (a.inputs?.attack_technique || '').localeCompare(b.inputs?.attack_technique || '') },
];

export default function MyTestsLibrary({ open, onClose, currentInputs, onLoad, formIsModified }) {
    const { items, save, remove, rename } = useLocalLibrary();
    const confirm = useConfirm();
    const [newName, setNewName] = React.useState('');
    const [editingId, setEditingId] = React.useState(null);
    const [editName, setEditName] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');
    const [sortValue, setSortValue] = React.useState('recent');
    const [sortAnchor, setSortAnchor] = React.useState(null);
    const [undo, setUndo] = React.useState({ open: false, item: null });
    const undoTimerRef = React.useRef(null);
    const searchInputRef = React.useRef(null);

    // Reset transient state on open + autofocus search
    React.useEffect(() => {
        if (open) {
            setNewName(currentInputs?.name || '');
            setSearch('');
            setActiveFilter('all');
            setEditingId(null);
            setTimeout(() => {
                if (searchInputRef.current) searchInputRef.current.focus();
            }, 80);
        }
    }, [open, currentInputs]);

    React.useEffect(() => () => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }, []);

    // Per-platform counts for filter chips
    const platformCounts = React.useMemo(() => {
        const counts = { windows: 0, linux: 0, macos: 0 };
        items.forEach((item) => {
            (item.inputs?.supported_platforms || []).forEach((p) => {
                if (counts[p] !== undefined) counts[p] += 1;
            });
        });
        return counts;
    }, [items]);

    const visibleItems = React.useMemo(() => {
        const q = search.toLowerCase().trim();
        const sortFn = SORT_OPTIONS.find((s) => s.value === sortValue)?.sort;
        const filtered = items.filter((item) => {
            if (activeFilter !== 'all') {
                const platforms = item.inputs?.supported_platforms || [];
                if (!platforms.includes(activeFilter)) return false;
            }
            if (!q) return true;
            const hay = [
                item.name || '',
                item.inputs?.attack_technique || '',
                item.inputs?.executor?.name || '',
                item.inputs?.executor?.command || '',
                item.inputs?.description || '',
            ]
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
        return sortFn ? filtered.slice().sort(sortFn) : filtered;
    }, [items, search, activeFilter, sortValue]);

    const handleSave = () => {
        if (!currentInputs) return;
        save(newName, currentInputs);
        setNewName('');
    };

    const handleLoad = async (item) => {
        if (formIsModified) {
            const ok = await confirm({
                title: 'Replace current test?',
                message: `Loading "${item.name}" will overwrite the test you have in the form.`,
                confirmText: 'Load',
                cancelText: 'Keep current',
                severity: 'warning',
            });
            if (!ok) return;
        }
        onLoad(item.inputs);
        onClose();
    };

    const handleDelete = (item, e) => {
        if (e) e.stopPropagation();
        remove(item.id);
        setUndo({ open: true, item });
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setUndo({ open: false, item: null }), 8000);
    };

    const undoDelete = () => {
        if (undo.item) save(undo.item.name, undo.item.inputs);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndo({ open: false, item: null });
    };

    const startRename = (item, e) => {
        if (e) e.stopPropagation();
        setEditingId(item.id);
        setEditName(item.name);
    };

    const commitRename = (item) => {
        rename(item.id, editName);
        setEditingId(null);
    };

    const currentSort = SORT_OPTIONS.find((s) => s.value === sortValue) || SORT_OPTIONS[0];

    const platformChips = [
        { value: 'all', label: 'All', count: items.length },
        { value: 'windows', label: 'windows', count: platformCounts.windows },
        { value: 'linux', label: 'linux', count: platformCounts.linux },
        { value: 'macos', label: 'macos', count: platformCounts.macos },
    ].filter((c) => c.value === 'all' || c.count > 0);

    const isCurrentEmpty =
        !currentInputs || JSON.stringify(currentInputs) === JSON.stringify({});

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: 780,
                    maxWidth: 'calc(100% - 32px)',
                    borderRadius: 3,
                    background: 'var(--glass-modal)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid var(--glass-stroke)',
                    backgroundImage: 'none',
                    overflow: 'hidden',
                },
            }}
        >
            {/* ── Header ── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2.5,
                    py: 1.75,
                    borderBottom: '1px solid var(--glass-stroke)',
                }}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        background: 'var(--accent-soft)',
                        color: 'primary.main',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    <BookmarksRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>My Tests</Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                        {items.length} saved · stored in your browser, never uploaded
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} aria-label="Close library">
                    <CloseRoundedIcon />
                </IconButton>
            </Box>

            {/* ── Toolbar ── */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    px: 2.5,
                    py: 1.5,
                    borderBottom: '1px solid var(--glass-stroke)',
                }}
            >
                {/* Search + sort */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            px: 1.5,
                            py: 0.75,
                            background: 'var(--glass-strong)',
                            border: '1px solid var(--glass-stroke)',
                            borderRadius: 1.5,
                            transition: 'border-color .12s',
                            '&:focus-within': { borderColor: 'rgba(255,92,57,0.45)' },
                        }}
                    >
                        <SearchRoundedIcon sx={{ fontSize: 16, color: 'var(--text-faint)' }} />
                        <InputBase
                            inputRef={searchInputRef}
                            fullWidth
                            placeholder="Search by name, TID, command…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{ fontSize: 13, color: 'text.primary' }}
                        />
                        {search && (
                            <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.25 }}>
                                <CancelRoundedIcon sx={{ fontSize: 14, color: 'var(--text-faint)' }} />
                            </IconButton>
                        )}
                    </Box>
                    <Button
                        size="small"
                        variant="outlined"
                        endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} />}
                        onClick={(e) => setSortAnchor(e.currentTarget)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: 12,
                            borderRadius: 1.5,
                            color: 'text.secondary',
                            borderColor: 'var(--glass-stroke)',
                            whiteSpace: 'nowrap',
                            '&:hover': {
                                borderColor: 'primary.main',
                                color: 'text.primary',
                                background: 'var(--glass-strong)',
                            },
                        }}
                    >
                        {currentSort.label}
                    </Button>
                    <Menu
                        anchorEl={sortAnchor}
                        open={Boolean(sortAnchor)}
                        onClose={() => setSortAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <MenuItem
                                key={opt.value}
                                selected={opt.value === sortValue}
                                onClick={() => {
                                    setSortValue(opt.value);
                                    setSortAnchor(null);
                                }}
                                sx={{ fontSize: 13 }}
                            >
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>

                {/* Filter chips */}
                {items.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {platformChips.map((c) => {
                            const active = c.value === activeFilter;
                            return (
                                <Box
                                    key={c.value}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setActiveFilter(c.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setActiveFilter(c.value);
                                        }
                                    }}
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: 1.1,
                                        py: 0.35,
                                        fontSize: 11,
                                        borderRadius: 12,
                                        cursor: 'pointer',
                                        background: active ? 'var(--accent-soft)' : 'var(--glass-strong)',
                                        color: active ? 'primary.main' : 'text.secondary',
                                        border: '1px solid',
                                        borderColor: active ? 'rgba(255,92,57,0.40)' : 'var(--glass-stroke)',
                                        fontWeight: active ? 500 : 400,
                                        transition: 'all 0.12s',
                                        '&:hover': { borderColor: 'rgba(255,92,57,0.40)', color: 'text.primary' },
                                        '&:focus-visible': { outline: 'none', boxShadow: '0 0 0 2px var(--accent)' },
                                    }}
                                >
                                    {c.label}
                                    <Box
                                        component="span"
                                        sx={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 10,
                                            color: active ? 'primary.main' : 'var(--text-faint)',
                                            ml: 0.5,
                                        }}
                                    >
                                        {c.count}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {/* Save current row */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1.25,
                        py: 0.6,
                        background: 'rgba(255,92,57,0.06)',
                        border: '1px dashed rgba(255,92,57,0.30)',
                        borderRadius: 1.5,
                    }}
                >
                    <AddRoundedIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
                    <InputBase
                        fullWidth
                        placeholder="Save current form as…"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSave();
                            }
                        }}
                        sx={{ fontSize: 13, color: 'text.primary' }}
                    />
                    <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<SaveRoundedIcon sx={{ fontSize: 14 }} />}
                        onClick={handleSave}
                        disabled={isCurrentEmpty}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 1.25,
                            py: 0.4,
                            px: 1.5,
                            fontWeight: 600,
                            fontSize: 12,
                        }}
                    >
                        Save
                    </Button>
                </Box>
            </Box>

            {/* ── Card grid body ── */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 1.25,
                    px: 2.5,
                    py: 1.75,
                    minHeight: 200,
                    maxHeight: 380,
                    overflowY: 'auto',
                }}
            >
                {items.length === 0 ? (
                    <Box
                        sx={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            py: 6,
                            color: 'var(--text-faint)',
                        }}
                    >
                        <BookmarksRoundedIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
                        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                            No saved tests yet. Save the current form above to start your library.
                        </Typography>
                    </Box>
                ) : visibleItems.length === 0 ? (
                    <Box
                        sx={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            py: 4,
                            color: 'var(--text-faint)',
                        }}
                    >
                        <Typography sx={{ fontSize: 13 }}>
                            No matches. Clear filters or change your search.
                        </Typography>
                    </Box>
                ) : (
                    visibleItems.map((item) => {
                        const isEditing = editingId === item.id;
                        const tid = item.inputs?.attack_technique;
                        const exec = item.inputs?.executor?.name;
                        const platforms = item.inputs?.supported_platforms || [];
                        return (
                            <Box
                                key={item.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => !isEditing && handleLoad(item)}
                                onKeyDown={(e) => {
                                    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        handleLoad(item);
                                    }
                                }}
                                sx={{
                                    position: 'relative',
                                    p: 1.5,
                                    background: 'var(--glass-strong)',
                                    border: '1px solid var(--glass-stroke)',
                                    borderRadius: 2,
                                    cursor: isEditing ? 'default' : 'pointer',
                                    transition: 'all 0.12s',
                                    '&:hover': isEditing
                                        ? {}
                                        : {
                                              borderColor: 'rgba(255,92,57,0.45)',
                                              background: 'rgba(255,92,57,0.05)',
                                              transform: 'translateY(-1px)',
                                          },
                                    '&:focus-visible': {
                                        outline: 'none',
                                        borderColor: 'primary.main',
                                        boxShadow: '0 0 0 3px var(--accent-soft)',
                                    },
                                    '&:hover .card-actions, &:focus-within .card-actions': {
                                        display: 'flex',
                                    },
                                }}
                            >
                                {!isEditing && (
                                    <Box
                                        className="card-actions"
                                        sx={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 6,
                                            display: 'none',
                                            gap: 0.25,
                                            background: 'var(--glass-modal)',
                                            backdropFilter: 'blur(8px)',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Tooltip title="Rename">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => startRename(item, e)}
                                                sx={{ width: 26, height: 26 }}
                                            >
                                                <EditRoundedIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleDelete(item, e)}
                                                sx={{
                                                    width: 26,
                                                    height: 26,
                                                    '&:hover': {
                                                        color: 'error.main',
                                                        background: 'rgba(229,72,77,0.10)',
                                                    },
                                                }}
                                            >
                                                <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                )}

                                {/* Tags row */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.85,
                                        mb: 0.6,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {tid && (
                                        <Box
                                            component="span"
                                            sx={{
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10.5,
                                                fontWeight: 500,
                                                color: 'primary.main',
                                                background: 'var(--accent-soft)',
                                                border: '1px solid rgba(255,92,57,0.30)',
                                                px: 0.85,
                                                py: 0.05,
                                                borderRadius: 0.75,
                                            }}
                                        >
                                            {tid}
                                        </Box>
                                    )}
                                    {exec && (
                                        <Box
                                            component="span"
                                            sx={{
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10,
                                                color: 'text.secondary',
                                            }}
                                        >
                                            {exec}
                                        </Box>
                                    )}
                                    {platforms.length > 0 && (
                                        <Box
                                            component="span"
                                            sx={{
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10,
                                                color: 'var(--text-faint)',
                                            }}
                                        >
                                            · {platforms.join(', ')}
                                        </Box>
                                    )}
                                </Box>

                                {/* Name (or rename input) */}
                                {isEditing ? (
                                    <TextField
                                        fullWidth
                                        size="small"
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === 'Enter') commitRename(item);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        onBlur={() => commitRename(item)}
                                        sx={{ '& .MuiInputBase-input': { fontSize: 13.5, py: 0.5 } }}
                                    />
                                ) : (
                                    <Typography
                                        sx={{
                                            fontSize: 13.5,
                                            fontWeight: 500,
                                            color: 'text.primary',
                                            pr: 5,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            wordBreak: 'break-word',
                                            lineHeight: 1.35,
                                        }}
                                        title={item.name}
                                    >
                                        {item.name}
                                    </Typography>
                                )}

                                {/* Saved-at */}
                                <Tooltip title={fmtDateAbsolute(item.savedAt)}>
                                    <Typography
                                        sx={{
                                            fontSize: 10,
                                            color: 'var(--text-faint)',
                                            mt: 0.6,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            display: 'inline-block',
                                        }}
                                    >
                                        saved {fmtDateRelative(item.savedAt)}
                                    </Typography>
                                </Tooltip>
                            </Box>
                        );
                    })
                )}
            </Box>

            {/* ── Footer hint ── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2.5,
                    py: 0.85,
                    borderTop: '1px solid var(--glass-stroke)',
                    fontSize: 10.5,
                    color: 'var(--text-faint)',
                    fontFamily: "'JetBrains Mono', monospace",
                }}
            >
                <span>{visibleItems.length} of {items.length} shown</span>
                <Box sx={{ flex: 1 }} />
                <span>↵ load · ⌫ delete · esc close</span>
            </Box>

            {/* Undo snackbar */}
            <Snackbar
                open={undo.open}
                autoHideDuration={8000}
                onClose={() => setUndo({ open: false, item: null })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                sx={{ bottom: { xs: 36, sm: 36 } }}
            >
                <Alert
                    severity="success"
                    variant="outlined"
                    sx={{
                        borderRadius: 2,
                        backdropFilter: 'blur(20px)',
                        background: 'var(--glass-modal)',
                    }}
                    action={
                        <Button color="primary" size="small" onClick={undoDelete}>
                            Undo
                        </Button>
                    }
                >
                    Removed "{undo.item ? undo.item.name : ''}"
                </Alert>
            </Snackbar>
        </Dialog>
    );
}
