import React from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import useLocalLibrary from '../hooks/useLocalLibrary';
import { useConfirm } from './ConfirmDialog';

function fmtDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function summary(item) {
    const parts = [];
    if (item.inputs?.attack_technique) parts.push(item.inputs.attack_technique);
    if (item.inputs?.executor?.name) parts.push(item.inputs.executor.name);
    const platforms = item.inputs?.supported_platforms || [];
    if (platforms.length) parts.push(platforms.join(','));
    return parts.join(' · ');
}

export default function MyTestsLibrary({ open, onClose, currentInputs, onLoad, formIsModified }) {
    const { items, save, remove, rename } = useLocalLibrary();
    const confirm = useConfirm();
    const [newName, setNewName] = React.useState('');
    const [editingId, setEditingId] = React.useState(null);
    const [editName, setEditName] = React.useState('');

    React.useEffect(() => {
        if (open) setNewName(currentInputs?.name || '');
    }, [open, currentInputs]);

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

    const handleDelete = async (item) => {
        const ok = await confirm({
            title: 'Delete saved test?',
            message: `This permanently removes "${item.name}" from your local library.`,
            confirmText: 'Delete',
            cancelText: 'Keep',
            severity: 'warning',
        });
        if (!ok) return;
        remove(item.id);
    };

    const startRename = (item) => {
        setEditingId(item.id);
        setEditName(item.name);
    };

    const commitRename = (item) => {
        rename(item.id, editName);
        setEditingId(null);
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 400 },
                    background: 'var(--glass-modal)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    borderLeft: '1px solid var(--glass-stroke)',
                    backgroundImage: 'none',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid var(--glass-stroke)',
                }}
            >
                <LibraryBooksRoundedIcon sx={{ color: 'primary.main' }} />
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>My tests</Typography>
                    <Typography sx={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {items.length} saved · stored in your browser, never uploaded
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} aria-label="Close library">
                    <CloseRoundedIcon />
                </IconButton>
            </Box>

            <Box sx={{ p: 2, borderBottom: '1px solid var(--glass-stroke)' }}>
                <TextField
                    fullWidth
                    size="small"
                    variant="filled"
                    hiddenLabel
                    placeholder="Save current form as..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSave();
                        }
                    }}
                />
                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    startIcon={<SaveRoundedIcon />}
                    disabled={!currentInputs || JSON.stringify(currentInputs) === JSON.stringify({})}
                    sx={{ mt: 1, textTransform: 'none', borderRadius: 2 }}
                >
                    Save current
                </Button>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
                {items.length === 0 ? (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', p: 2, textAlign: 'center' }}>
                        No saved tests yet. Save the current form to start a library.
                    </Typography>
                ) : (
                    <List dense disablePadding>
                        {items.map((item) => (
                            <ListItem
                                key={item.id}
                                disablePadding
                                sx={{
                                    border: '1px solid var(--glass-stroke)',
                                    borderRadius: 2,
                                    mb: 0.75,
                                    overflow: 'hidden',
                                    background: 'var(--glass-strong)',
                                }}
                                secondaryAction={
                                    editingId === item.id ? null : (
                                        <Box sx={{ display: 'flex' }}>
                                            <Tooltip title="Rename">
                                                <IconButton size="small" onClick={() => startRename(item)}>
                                                    <EditRoundedIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => handleDelete(item)}>
                                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )
                                }
                            >
                                <ListItemButton
                                    onClick={() => handleLoad(item)}
                                    sx={{ pr: editingId === item.id ? 1 : 7, py: 1 }}
                                >
                                    {editingId === item.id ? (
                                        <TextField
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitRename(item);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            onBlur={() => commitRename(item)}
                                            onClick={(e) => e.stopPropagation()}
                                            size="small"
                                            autoFocus
                                            fullWidth
                                        />
                                    ) : (
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: 13,
                                                    fontWeight: 500,
                                                    color: 'text.primary',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                                title={item.name}
                                            >
                                                {item.name}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: 10.5,
                                                    color: 'var(--text-faint)',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    mt: 0.25,
                                                }}
                                            >
                                                {summary(item)}
                                            </Typography>
                                            <Typography
                                                sx={{ fontSize: 10, color: 'var(--text-faint)', mt: 0.25 }}
                                            >
                                                {fmtDate(item.savedAt)}
                                            </Typography>
                                        </Box>
                                    )}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Drawer>
    );
}
