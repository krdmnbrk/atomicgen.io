import React, { useState, useEffect } from 'react';
import yaml from 'js-yaml';
import Button from '@mui/material/Button';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Alert from '@mui/material/Alert';
import basic from './samples/hostname_discovery_(windows).yaml';
import moderate from './samples/scheduled_task_startup_script.yaml';
import complex from './samples/windows_push_file_using_scp.exe.yaml';
import Tooltip from '@mui/material/Tooltip';
import ButtonGroup from '@mui/material/ButtonGroup';
import Snackbar from '@mui/material/Snackbar';
import BookmarksRoundedIcon from '@mui/icons-material/BookmarksRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { Typography } from '@mui/material';
import UploadButton from './UploadButton';
import RepoLoaderButton from './RepoLoaderButton';
import { mergeTechniqueAndTestIntoForm } from '../../utils/aiResponseValidator';
import { useConfirm } from '../ConfirmDialog';
import useLocalLibrary from '../../hooks/useLocalLibrary';

// Best-known ATT&CK mappings for the bundled sample tests.
const SAMPLE_TECHNIQUE_META = [
    { attack_technique: 'T1082', display_name: 'System Information Discovery' },
    { attack_technique: 'T1547.001', display_name: 'Boot or Logon Autostart Execution: Registry Run Keys / Startup Folder' },
    { attack_technique: 'T1105', display_name: 'Ingress Tool Transfer' },
];



const LIBRARY_FILE_FORMAT = 'atomicgen.library.v1';

function downloadStringAsFile(filename, content, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export default function InputButtons({ inputButtonErrors, setInputButtonErrors, base, darkMode, setInputs, setChanged, changed, setLoadedSource, onOpenLibrary }) {
    const [open, setOpen] = React.useState(false);
    const [samples, setSamples] = useState([]);
    const anchorRef = React.useRef(null);
    const confirm = useConfirm();
    const { items: libraryItems, importItems } = useLocalLibrary();
    const libraryCount = libraryItems.length;

    // Library export/import dropdown
    const libraryMenuRef = React.useRef(null);
    const [libraryMenuOpen, setLibraryMenuOpen] = React.useState(false);
    const fileInputRef = React.useRef(null);
    const [libraryToast, setLibraryToast] = React.useState({ open: false, severity: 'success', message: '' });

    const exportLibrary = () => {
        setLibraryMenuOpen(false);
        if (libraryItems.length === 0) return;
        const payload = {
            format: LIBRARY_FILE_FORMAT,
            exportedAt: new Date().toISOString(),
            items: libraryItems,
        };
        const stamp = new Date().toISOString().slice(0, 10);
        downloadStringAsFile(`atomicgen-library-${stamp}.json`, JSON.stringify(payload, null, 2));
        setLibraryToast({
            open: true,
            severity: 'success',
            message: `Exported ${libraryItems.length} test${libraryItems.length === 1 ? '' : 's'}`,
        });
    };

    const triggerImportPicker = () => {
        setLibraryMenuOpen(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleImportFile = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (err) {
                throw new Error(`Not valid JSON (${err.message || err})`);
            }
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Library file must be a JSON object');
            }
            if (parsed.format && parsed.format !== LIBRARY_FILE_FORMAT) {
                throw new Error(`Unknown library format "${parsed.format}" — expected ${LIBRARY_FILE_FORMAT}`);
            }
            const items = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : null;
            if (!items) {
                throw new Error('Library file is missing an "items" array');
            }
            // If the file would replace the entire library, ask first.
            let mode = 'merge';
            if (libraryItems.length > 0) {
                const replace = await confirm({
                    title: `Import ${items.length} test${items.length === 1 ? '' : 's'}?`,
                    message: `You currently have ${libraryItems.length} saved test${libraryItems.length === 1 ? '' : 's'}.\n\n• "Merge" adds new entries and skips ones with the same id.\n• "Replace" wipes your current library first.`,
                    confirmText: 'Replace',
                    cancelText: 'Merge',
                    severity: 'warning',
                });
                mode = replace ? 'replace' : 'merge';
            }
            const summary = importItems(items, mode);
            setLibraryToast({
                open: true,
                severity: 'success',
                message:
                    mode === 'replace'
                        ? `Replaced library with ${summary.added} test${summary.added === 1 ? '' : 's'}`
                        : `Imported ${summary.added} new test${summary.added === 1 ? '' : 's'}` +
                          (summary.skipped > 0 ? ` · ${summary.skipped} skipped (already in library)` : '') +
                          (summary.invalid > 0 ? ` · ${summary.invalid} invalid` : ''),
            });
        } catch (err) {
            setLibraryToast({
                open: true,
                severity: 'error',
                message: `Import failed: ${err.message || err}`,
            });
        } finally {
            // Allow re-importing the same file in the same session
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const fetchSamples = async () => {
            const tests = [];
            const sources = [basic, moderate, complex];
            for (let i = 0; i < sources.length; i++) {
                let response = await fetch(sources[i]);
                let yamlText = await response.text();
                let parsed = yaml.load(yamlText);
                // Samples are bare arrays — wrap with the best-known technique meta.
                const test = Array.isArray(parsed) ? parsed[0] : parsed;
                const wrapper = SAMPLE_TECHNIQUE_META[i] || {};
                const shape = mergeTechniqueAndTestIntoForm(wrapper, test);
                tests.push({ ...base, ...shape });
            }
            setSamples(tests);
        }
        fetchSamples();
    }, [base]);

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }

        setOpen(false);
    };




    const loadSample = async (level) => {
        if (changed) {
            const ok = await confirm({
                title: 'Replace current test?',
                message: 'Loading this sample will overwrite the test you have in the form.',
                confirmText: 'Load sample',
                cancelText: 'Keep current',
                severity: 'warning',
            });
            if (!ok) return;
        }
        await setInputs({ ...base, ...samples[level] });
        setChanged(false);
        if (setLoadedSource) {
            const labels = ['Basic — Hostname Discovery', 'Moderate — Scheduled Task Startup', 'Complex — Push file using scp'];
            setLoadedSource({ type: 'sample', label: labels[level] || `Sample ${level + 1}` });
        }
        handleToggle(null);
    }

    return (
        <React.Fragment>
            <Box
                aria-label="Load attack test sample"
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 1.25 },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    width: { xs: '100%', sm: 'auto' },
                }}
            >
                <Button
                    ref={anchorRef}
                    variant="outlined"
                    color="primary"
                    aria-controls={open ? 'split-button-menu' : undefined}
                    aria-expanded={open ? 'true' : undefined}
                    aria-label="load sample"
                    aria-haspopup="menu"
                    onClick={handleToggle}
                    endIcon={<ArrowDropDownIcon />}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        borderRadius: 2,
                        borderColor: 'var(--glass-stroke-strong)',
                        '&:hover': {
                            borderColor: 'primary.main',
                            background: 'var(--accent-soft)',
                        },
                    }}
                >
                    Load Sample
                </Button>
                <RepoLoaderButton
                    base={base}
                    setInputs={setInputs}
                    darkMode={darkMode}
                    setInputButtonErrors={setInputButtonErrors}
                    inputButtonErrors={inputButtonErrors}
                    setChanged={setChanged}
                    changed={changed}
                    setLoadedSource={setLoadedSource}
                />
                <UploadButton
                    base={base}
                    setInputs={setInputs}
                    darkMode={darkMode}
                    setInputButtonErrors={setInputButtonErrors}
                    inputButtonErrors={inputButtonErrors}
                    setChanged={setChanged}
                    changed={changed}
                    setLoadedSource={setLoadedSource}
                />
                <ButtonGroup
                    ref={libraryMenuRef}
                    variant="outlined"
                    color="primary"
                    sx={{
                        '& .MuiButton-root': {
                            borderColor: 'var(--glass-stroke-strong)',
                            '&:hover': {
                                borderColor: 'primary.main',
                                background: 'var(--accent-soft)',
                            },
                            '&.Mui-disabled': {
                                borderColor: 'var(--glass-stroke)',
                                color: 'var(--text-faint)',
                            },
                        },
                    }}
                >
                    <Tooltip
                        title={
                            libraryCount === 0
                                ? 'No saved tests yet — save a test from the YAML preview header to start your library'
                                : `Browse ${libraryCount} saved test${libraryCount === 1 ? '' : 's'} in your library`
                        }
                    >
                        <span>
                            <Button
                                disabled={libraryCount === 0}
                                onClick={onOpenLibrary}
                                startIcon={<BookmarksRoundedIcon sx={{ fontSize: 18 }} />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    borderRadius: '8px 0 0 8px',
                                    gap: 0.25,
                                }}
                            >
                                My Library
                                {libraryCount > 0 && (
                                    <Box
                                        component="span"
                                        sx={{
                                            ml: 0.75,
                                            px: 0.85,
                                            py: 0.05,
                                            borderRadius: 10,
                                            background: 'var(--accent)',
                                            color: '#fff',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            lineHeight: 1.4,
                                            minWidth: 18,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {libraryCount}
                                    </Box>
                                )}
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Library options — export · import">
                        <Button
                            onClick={() => setLibraryMenuOpen((v) => !v)}
                            aria-label="Library options"
                            aria-haspopup="menu"
                            aria-expanded={libraryMenuOpen}
                            sx={{
                                textTransform: 'none',
                                borderRadius: '0 8px 8px 0',
                                px: 0.75,
                                minWidth: 0,
                            }}
                        >
                            <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />
                        </Button>
                    </Tooltip>
                </ButtonGroup>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportFile}
                    style={{ display: 'none' }}
                />

                <Popper
                    sx={{ zIndex: 1 }}
                    open={libraryMenuOpen}
                    anchorEl={libraryMenuRef.current}
                    placement="bottom-end"
                    transition
                >
                    {({ TransitionProps }) => (
                        <Grow {...TransitionProps}>
                            <Paper
                                elevation={6}
                                sx={{
                                    background: 'var(--glass-modal)',
                                    backdropFilter: 'blur(28px) saturate(180%)',
                                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                                    border: '1px solid var(--glass-stroke-strong)',
                                    borderRadius: 2,
                                    mt: 0.5,
                                    minWidth: 240,
                                    boxShadow: 'var(--shadow-modal)',
                                }}
                            >
                                <ClickAwayListener onClickAway={() => setLibraryMenuOpen(false)}>
                                    <MenuList autoFocusItem={libraryMenuOpen}>
                                        <MenuItem
                                            onClick={exportLibrary}
                                            disabled={libraryCount === 0}
                                            sx={{ gap: 1.25, py: 1, alignItems: 'center' }}
                                        >
                                            <DownloadRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontSize: 13, lineHeight: 1.3 }}>
                                                    Export library
                                                </Typography>
                                                <Typography sx={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
                                                    {libraryCount === 0
                                                        ? 'nothing to export'
                                                        : `download all ${libraryCount} test${libraryCount === 1 ? '' : 's'} as JSON`}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                        <MenuItem
                                            onClick={triggerImportPicker}
                                            sx={{ gap: 1.25, py: 1, alignItems: 'center' }}
                                        >
                                            <UploadFileRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                            <Box sx={{ flex: 1 }}>
                                                <Typography sx={{ fontSize: 13, lineHeight: 1.3 }}>
                                                    Import library…
                                                </Typography>
                                                <Typography sx={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
                                                    upload a previously exported library JSON
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    </MenuList>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </Box>

            <Snackbar
                open={libraryToast.open}
                autoHideDuration={5000}
                onClose={() => setLibraryToast((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                sx={{ bottom: { xs: 36, sm: 36 } }}
            >
                <Alert
                    severity={libraryToast.severity}
                    variant="outlined"
                    onClose={() => setLibraryToast((s) => ({ ...s, open: false }))}
                    sx={{ borderRadius: 2, backdropFilter: 'blur(20px)', background: 'var(--glass-modal)' }}
                >
                    {libraryToast.message}
                </Alert>
            </Snackbar>
            {inputButtonErrors.length > 0 &&
                <Alert sx={{ mt: 1 }} variant={darkMode ? "outlined" : "filled"} severity='error'>
                        {inputButtonErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                </Alert>
            }
            <Popper
                sx={{ zIndex: 1 }}
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                placement='bottom-start'
                transition
            >
                {({ TransitionProps }) => (
                    <Grow
                        {...TransitionProps}

                    >
                        <Paper
                            elevation={6}
                            sx={{
                                background: 'var(--glass-modal)',
                                backdropFilter: 'blur(28px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                                border: '1px solid var(--glass-stroke-strong)',
                                borderRadius: 2,
                                mt: 0.5,
                                boxShadow: 'var(--shadow-modal)',
                            }}
                        >
                            <ClickAwayListener onClickAway={handleClose}>
                                <MenuList id="split-button-menu" autoFocusItem>
                                    {
                                        samples.map((sample, index) => (
                                            <MenuItem key={index} onClick={() => loadSample(index)}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip
                                                        sx={{ width: 80 }}
                                                        label={index === 0 ? "Basic" : index === 1 ? "Moderate" : "Complex"}
                                                        variant={darkMode ? "outlined" : "filled"}
                                                        color='warning'
                                                        size="small"
                                                    />
                                                    <Typography fontSize={15}>{sample.name}</Typography>
                                                </Box>
                                            </MenuItem>
                                        ))
                                    }
                                </MenuList>

                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </React.Fragment>
    );
}
