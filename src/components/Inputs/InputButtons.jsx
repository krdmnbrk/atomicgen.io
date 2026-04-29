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
import { Typography } from '@mui/material';
import UploadButton from './UploadButton';
import RepoLoaderButton from './RepoLoaderButton';
import { mergeTechniqueAndTestIntoForm } from '../../utils/aiResponseValidator';
import { useConfirm } from '../ConfirmDialog';

// Best-known ATT&CK mappings for the bundled sample tests.
const SAMPLE_TECHNIQUE_META = [
    { attack_technique: 'T1082', display_name: 'System Information Discovery' },
    { attack_technique: 'T1547.001', display_name: 'Boot or Logon Autostart Execution: Registry Run Keys / Startup Folder' },
    { attack_technique: 'T1105', display_name: 'Ingress Tool Transfer' },
];



export default function InputButtons({ inputButtonErrors, setInputButtonErrors, base, darkMode, setInputs, setChanged, changed, setLoadedSource }) {
    const [open, setOpen] = React.useState(false);
    const [samples, setSamples] = useState([]);
    const anchorRef = React.useRef(null);
    const confirm = useConfirm();

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
                ref={anchorRef}
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
                    variant="contained"
                    color="primary"
                    aria-controls={open ? 'split-button-menu' : undefined}
                    aria-expanded={open ? 'true' : undefined}
                    aria-label="load sample"
                    aria-haspopup="menu"
                    onClick={handleToggle}
                    endIcon={<ArrowDropDownIcon />}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 2,
                        boxShadow: '0 8px 22px -8px var(--accent), inset 0 1px 0 rgba(255,255,255,0.25)',
                        '&:hover': {
                            boxShadow: '0 12px 28px -10px var(--accent), inset 0 1px 0 rgba(255,255,255,0.25)',
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
            </Box>
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
                placement='bottom-end'
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
