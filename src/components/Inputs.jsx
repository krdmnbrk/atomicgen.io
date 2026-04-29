import React from 'react';
import {
    TextField,
    FormControl,
    FormControlLabel,
    Switch,
    Typography,
    Box,
    MenuItem,
    InputLabel,
    Select,
    Checkbox,
    OutlinedInput,
    Chip,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    IconButton,
    Autocomplete,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PropTypes from 'prop-types';
import Arguments from './Inputs/Arguments';
import Dependency from './Inputs/Dependency';
import Editor from './Editor';
import InputButtons from './Inputs/InputButtons';
import AiAssistant from './Inputs/AiAssistant';
import useAtomicIndex from '../hooks/useAtomicIndex';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
        sx: {
            background: 'var(--glass-strong)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--glass-stroke)',
        },
    },
};

const glassSection = {
    background: 'var(--glass)',
    backdropFilter: 'blur(28px) saturate(180%)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
    border: '1px solid var(--glass-stroke)',
    borderRadius: 3,
    p: 2.5,
    mb: 2,
    boxShadow: 'var(--shadow-glow)',
};

const sectionTitleSx = {
    fontSize: 11,
    fontWeight: 600,
    color: 'text.secondary',
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 2,
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        background: 'var(--glass-inset)',
        backdropFilter: 'blur(10px)',
        borderRadius: 2,
        '& fieldset': { borderColor: 'var(--glass-stroke)' },
        '&:hover fieldset': { borderColor: 'var(--glass-stroke-strong)' },
        '&.Mui-focused fieldset': {
            borderColor: 'primary.main',
            borderWidth: 1,
            boxShadow: '0 0 0 4px var(--accent-soft)',
        },
    },
};

function SectionTitle({ icon, children, meta }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={sectionTitleSx}>
                <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
                {children}
            </Box>
            {meta && (
                <Typography sx={{ fontSize: 11, color: 'var(--text-faint)' }}>{meta}</Typography>
            )}
        </Box>
    );
}

function Inputs({
    inputButtonErrors,
    setInputButtonErrors,
    base,
    darkMode,
    changed,
    setChanged,
    errors,
    setErrors,
    inputs,
    setInputs,
    executor_names,
    supported_platforms,
    loadedSource,
    setLoadedSource,
}) {
    const handleChangeText = (e) => {
        const { name, value } = e.target;
        setInputs((prev) => ({
            ...prev,
            [name]: value.trim() === '' ? null : value,
        }));
    };

    const handleChangeSupportedPlatforms = (event) => {
        const { target: { value } } = event;
        setInputs((prev) => ({
            ...prev,
            supported_platforms: typeof value === 'string' ? value.split(',') : value,
        }));
    };

    const handleChangeElevationRequired = (e) => {
        const { checked } = e.target;
        setInputs((prev) => ({
            ...prev,
            executor: { ...prev.executor, elevation_required: checked },
        }));
    };

    const handleChangeExecutorType = (e) => {
        const name = e.target.value;
        setInputs((prev) => ({
            ...prev,
            executor: { ...prev.executor, name },
        }));
    };

    const handleAttackCommandChange = (newValue) => {
        setInputs((prev) => ({
            ...prev,
            executor: {
                ...prev.executor,
                command: newValue.split(/\r?\n/).join('\n'),
            },
        }));
    };

    const handleCleanupCommandChange = (newValue) => {
        setInputs((prev) => ({
            ...prev,
            executor: {
                ...prev.executor,
                cleanup_command: newValue.split(/\r?\n/).join('\n'),
            },
        }));
    };

    const handleStepsChange = (newValue) => {
        setInputs((prev) => ({
            ...prev,
            executor: {
                ...prev.executor,
                steps: newValue.split(/\r?\n/).join('\n'),
            },
        }));
    };

    // RFC 4122 v4 UUID
    const newUuidV4 = () => {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        // Fallback
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };

    const regenerateGuid = () => {
        setInputs((prev) => ({ ...prev, auto_generated_guid: newUuidV4() }));
    };

    const isManualExecutor = inputs.executor?.name === 'manual';
    const techniqueAttackUrl = (() => {
        const t = (inputs.attack_technique || '').trim();
        if (!/^T\d{4}(\.\d{3})?$/i.test(t)) return null;
        const [base, sub] = t.toUpperCase().split('.');
        return sub
            ? `https://attack.mitre.org/techniques/${base}/${sub}/`
            : `https://attack.mitre.org/techniques/${base}/`;
    })();

    // ATT&CK technique autocomplete (loads from atomic-red-team CSV index)
    const { data: atIndex } = useAtomicIndex();
    const techniqueOptions = atIndex?.techniques || [];
    const handleTechniqueChange = (_event, value) => {
        if (typeof value === 'string') {
            // Free-text — accept as TID, leave display name alone
            setInputs((prev) => ({ ...prev, attack_technique: value || null }));
        } else if (value && value.id) {
            // Picked from list — set both TID and display name
            setInputs((prev) => ({
                ...prev,
                attack_technique: value.id,
                display_name: value.name || prev.display_name,
            }));
        } else {
            setInputs((prev) => ({ ...prev, attack_technique: null }));
        }
    };

    const lifecycleHasContent =
        Boolean(inputs.executor?.cleanup_command) ||
        (Array.isArray(inputs.dependencies) && inputs.dependencies.length > 0);

    // Controlled accordion: auto-sync with content presence; allow manual toggle.
    const [lifecycleExpanded, setLifecycleExpanded] = React.useState(lifecycleHasContent);
    const prevLifecycleHasContent = React.useRef(lifecycleHasContent);
    React.useEffect(() => {
        if (lifecycleHasContent !== prevLifecycleHasContent.current) {
            setLifecycleExpanded(lifecycleHasContent);
            prevLifecycleHasContent.current = lifecycleHasContent;
        }
    }, [lifecycleHasContent]);

    return (
        <Box>
            {/* Top buttons (Load Sample / Upload YAML / Load from Repo) */}
            <Box sx={{ mb: 2 }}>
                <InputButtons
                    inputButtonErrors={inputButtonErrors}
                    setInputButtonErrors={setInputButtonErrors}
                    base={base}
                    setInputs={setInputs}
                    setChanged={setChanged}
                    changed={changed}
                    darkMode={darkMode}
                    setLoadedSource={setLoadedSource}
                />
            </Box>

            {/* AI prompt hero */}
            <AiAssistant
                base={base}
                setInputs={setInputs}
                setChanged={setChanged}
                changed={changed}
                darkMode={darkMode}
                setLoadedSource={setLoadedSource}
            />

            {/* Source provenance badge */}
            {loadedSource && (
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        mb: 1.5,
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1.5,
                        background: 'var(--accent-soft)',
                        border: '1px solid rgba(255, 92, 57, 0.25)',
                        fontSize: 11,
                        color: 'primary.main',
                        fontFamily: "'JetBrains Mono', monospace",
                    }}
                >
                    {loadedSource.type === 'repo' && (
                        <>
                            <Box component="span" sx={{ opacity: 0.7 }}>📦</Box>
                            Loaded from atomic-red-team{loadedSource.tid ? ` · ${loadedSource.tid}` : ''}
                        </>
                    )}
                    {loadedSource.type === 'sample' && (
                        <>
                            <Box component="span" sx={{ opacity: 0.7 }}>⚡</Box>
                            Sample: {loadedSource.label}
                        </>
                    )}
                    {loadedSource.type === 'ai' && (
                        <>
                            <Box component="span" sx={{ opacity: 0.7 }}>✦</Box>
                            Generated with AI
                        </>
                    )}
                    {loadedSource.type === 'upload' && (
                        <>
                            <Box component="span" sx={{ opacity: 0.7 }}>📁</Box>
                            Uploaded: {loadedSource.filename || 'YAML file'}
                        </>
                    )}
                    {loadedSource.type === 'draft' && (
                        <>
                            <Box component="span" sx={{ opacity: 0.7 }}>💾</Box>
                            Restored from autosave
                        </>
                    )}
                    {changed && (
                        <Box component="span" sx={{ opacity: 0.6, fontStyle: 'italic', ml: 0.5 }}>
                            · modified
                        </Box>
                    )}
                </Box>
            )}

            {/* ─── IDENTITY ─── */}
            <Paper elevation={0} sx={glassSection}>
                <SectionTitle icon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />}>Identity</SectionTitle>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                    <Autocomplete
                        freeSolo
                        autoSelect
                        size="small"
                        options={techniqueOptions}
                        value={inputs.attack_technique || ''}
                        onChange={handleTechniqueChange}
                        getOptionLabel={(o) => (typeof o === 'string' ? o : o.id || '')}
                        filterOptions={(opts, state) => {
                            const q = state.inputValue.trim().toLowerCase();
                            if (!q) return opts.slice(0, 50);
                            const matches = opts.filter(
                                (o) =>
                                    o.id.toLowerCase().includes(q) ||
                                    (o.name || '').toLowerCase().includes(q)
                            );
                            return matches.slice(0, 50);
                        }}
                        renderOption={(props, option) => {
                            const { key, ...rest } = props;
                            return (
                                <li key={key} {...rest} style={{ ...rest.style, padding: '6px 10px' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                        <Box
                                            sx={{
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 11,
                                                color: 'primary.main',
                                                minWidth: 80,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {option.id}
                                        </Box>
                                        <Box
                                            sx={{
                                                fontSize: 13,
                                                color: 'text.primary',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                flex: 1,
                                            }}
                                        >
                                            {option.name}
                                        </Box>
                                    </Box>
                                </li>
                            );
                        }}
                        sx={{ ...inputSx, flex: '0 0 240px' }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                required
                                label="ATT&CK technique"
                                placeholder="T1053.005 or 'scheduled task'"
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {techniqueAttackUrl && (
                                                <Tooltip title="Open on attack.mitre.org">
                                                    <IconButton
                                                        component="a"
                                                        href={techniqueAttackUrl}
                                                        target="_blank"
                                                        rel="noopener"
                                                        size="small"
                                                        sx={{ color: 'primary.main', mr: -0.5 }}
                                                    >
                                                        <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />
                    <TextField
                        required
                        spellCheck="false"
                        label="Technique display name"
                        placeholder="Scheduled Task/Job: Scheduled Task"
                        id="display_name"
                        size="small"
                        name="display_name"
                        value={inputs.display_name || ''}
                        onChange={handleChangeText}
                        sx={{ ...inputSx, flex: '1 1 280px' }}
                    />
                </Box>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        required
                        spellCheck="false"
                        fullWidth
                        label="Test name"
                        id="name"
                        size="small"
                        name="name"
                        value={inputs.name || ''}
                        onChange={handleChangeText}
                        sx={inputSx}
                    />
                </Box>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        required
                        spellCheck="false"
                        fullWidth
                        multiline
                        minRows={3}
                        label="Test description"
                        placeholder="What does this test do? What artifact is left behind? How can a defender verify it ran?"
                        id="description"
                        name="description"
                        value={inputs.description || ''}
                        onChange={handleChangeText}
                        sx={inputSx}
                    />
                    {/* Lint-style writing hints */}
                    {(() => {
                        const desc = (inputs.description || '').trim();
                        if (!desc) return null;
                        const hints = [];
                        if (desc.length < 30) hints.push('Add more detail about adversary intent and the expected artifact.');
                        if (!/\b(verify|verif|check|expected|upon execution|after execution)/i.test(desc)) {
                            hints.push('Consider adding a verification cue (e.g., "Verify with: …", "Upon execution …").');
                        }
                        if (inputs.executor?.command && /#\{[^}]+\}/.test(inputs.executor.command) && !desc.includes('#{')) {
                            // not a strong rule — skip
                        }
                        if (hints.length === 0) return null;
                        return (
                            <Box
                                sx={{
                                    mt: 0.75,
                                    fontSize: 11,
                                    color: 'var(--text-faint)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.25,
                                }}
                            >
                                {hints.map((h, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                                        <Box component="span" sx={{ color: 'warning.main' }}>ⓘ</Box>
                                        <span>{h}</span>
                                    </Box>
                                ))}
                            </Box>
                        );
                    })()}
                </Box>
                <Box>
                    <FormControl required size="small" fullWidth sx={inputSx}>
                        <InputLabel id="supported-platforms-label">Supported Platforms</InputLabel>
                        <Select
                            labelId="supported-platforms-label"
                            id="supported-platforms"
                            multiple
                            value={inputs.supported_platforms}
                            onChange={handleChangeSupportedPlatforms}
                            input={<OutlinedInput id="select-multiple-chip" label="Supported Platforms" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip
                                            key={value}
                                            label={value}
                                            size="small"
                                            sx={{
                                                background: 'var(--accent-soft)',
                                                color: 'primary.main',
                                                border: '1px solid',
                                                borderColor: 'primary.main',
                                                fontWeight: 500,
                                                fontSize: 11,
                                                letterSpacing: '0.02em',
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}
                            MenuProps={MenuProps}
                        >
                            {supported_platforms.map((name) => (
                                <MenuItem key={name} value={name} sx={{ height: '2.5rem' }}>
                                    <Checkbox color="primary" checked={inputs.supported_platforms.includes(name)} />
                                    {name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mt: 2,
                        pt: 1.5,
                        borderTop: '1px solid var(--glass-stroke)',
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--text-faint)',
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                        }}
                    >
                        GUID
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: inputs.auto_generated_guid ? 'text.secondary' : 'var(--text-faint)',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {inputs.auto_generated_guid || 'not set — will be generated on first download'}
                    </Typography>
                    <Tooltip title={inputs.auto_generated_guid ? 'Regenerate GUID' : 'Generate GUID now'}>
                        <IconButton size="small" onClick={regenerateGuid} sx={{ color: 'text.secondary' }}>
                            <RefreshRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Paper>

            {/* ─── EXECUTION ─── */}
            <Paper elevation={0} sx={glassSection}>
                <SectionTitle
                    icon={<TerminalRoundedIcon sx={{ fontSize: 16 }} />}
                    meta={inputs.input_arguments?.length > 0 ? `${inputs.input_arguments.length} input argument${inputs.input_arguments.length === 1 ? '' : 's'}` : null}
                >
                    Execution
                </SectionTitle>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <FormControl required size="small" sx={{ ...inputSx, flex: '1 1 220px', minWidth: 200 }}>
                        <InputLabel id="attack_executor">Attack Executor</InputLabel>
                        <Select
                            labelId="attack_executor"
                            id="attack_executor_select"
                            value={inputs.executor.name}
                            label="Attack Executor"
                            onChange={handleChangeExecutorType}
                            MenuProps={MenuProps}
                        >
                            <MenuItem value="">None</MenuItem>
                            {executor_names.map((executor) => (
                                <MenuItem key={executor} value={executor}>
                                    {executor}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl component="fieldset">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={inputs.executor.elevation_required}
                                    onChange={handleChangeElevationRequired}
                                    name="Attack Elevation Required"
                                    color="primary"
                                />
                            }
                            sx={{ padding: 0, margin: 0 }}
                            label={
                                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                                    Elevation required
                                </Typography>
                            }
                            labelPlacement="end"
                        />
                    </FormControl>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography
                        sx={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'text.secondary',
                            mb: 0.75,
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 1,
                        }}
                    >
                        Input arguments
                        <Typography component="span" sx={{ fontSize: 11, color: 'var(--text-faint)' }}>
                            — referenced as{' '}
                            <Box
                                component="code"
                                sx={{
                                    background: 'var(--glass-strong)',
                                    px: 0.6,
                                    py: 0.1,
                                    borderRadius: 0.5,
                                    fontSize: 11,
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            >
                                #{`{name}`}
                            </Box>{' '}
                            inside command
                        </Typography>
                    </Typography>
                    <Arguments
                        darkMode={darkMode}
                        errors={errors}
                        setErrors={setErrors}
                        inputs={inputs}
                        setInputs={setInputs}
                    />
                </Box>

                {isManualExecutor ? (
                    <Box>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'text.secondary',
                                mb: 0.75,
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: 1,
                            }}
                        >
                            Manual steps <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
                            <Typography component="span" sx={{ fontSize: 11, color: 'var(--text-faint)' }}>
                                — markdown-style numbered or bulleted steps for the operator
                            </Typography>
                        </Typography>
                        <Editor
                            darkMode={darkMode}
                            mode="markdown"
                            name="manual-steps-editor"
                            value={inputs.executor.steps || ''}
                            height="200px"
                            onChange={handleStepsChange}
                            placeholder={
                                '1. Open Settings → Privacy → ...\n2. Toggle X off\n3. Verify Y'
                            }
                        />
                    </Box>
                ) : (
                    <Box>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'text.secondary',
                                mb: 0.75,
                            }}
                        >
                            Attack command <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
                        </Typography>
                        <Editor
                            darkMode={darkMode}
                            mode={inputs.executor.name === 'powershell' ? 'powershell' : 'sh'}
                            name="attack-command-editor"
                            value={inputs.executor.command || ''}
                            height="160px"
                            onChange={handleAttackCommandChange}
                            placeholder={'Write an attack command / script'}
                        />
                    </Box>
                )}
            </Paper>

            {/* ─── SETUP & CLEANUP (collapsible) ─── */}
            <Accordion
                expanded={lifecycleExpanded}
                onChange={(_, isExpanded) => setLifecycleExpanded(isExpanded)}
                disableGutters
                square={false}
                elevation={0}
                sx={{
                    background: 'var(--glass)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid var(--glass-stroke)',
                    borderRadius: '24px !important',
                    boxShadow: 'var(--shadow-glow)',
                    overflow: 'hidden',
                    mb: 2,
                    '&:before': { display: 'none' },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreRoundedIcon sx={{ color: 'text.secondary' }} />}
                    sx={{
                        px: 2.5,
                        py: 1,
                        '& .MuiAccordionSummary-content': {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                        },
                    }}
                >
                    <Box sx={sectionTitleSx} style={{ marginBottom: 0 }}>
                        <Box sx={{ color: 'primary.main', display: 'flex' }}>
                            <CleaningServicesOutlinedIcon sx={{ fontSize: 16 }} />
                        </Box>
                        Setup &amp; Cleanup
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', mr: 1 }}>
                        dependencies &amp; cleanup · optional
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5, borderTop: '1px solid var(--glass-stroke)' }}>
                    <Box sx={{ pt: 2, mb: 2 }}>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'text.secondary',
                                mb: 0.75,
                            }}
                        >
                            Cleanup command
                        </Typography>
                        <Editor
                            darkMode={darkMode}
                            mode={inputs.executor.name === 'powershell' ? 'powershell' : 'sh'}
                            name="cleanup-command-editor"
                            value={inputs.executor.cleanup_command || ''}
                            height="120px"
                            onChange={handleCleanupCommandChange}
                            placeholder={'Write a cleanup command / script'}
                        />
                    </Box>
                    <Box>
                        <Dependency
                            darkMode={darkMode}
                            executor_names={executor_names}
                            errors={errors}
                            setErrors={setErrors}
                            inputs={inputs}
                            setInputs={setInputs}
                        />
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
}

Inputs.propTypes = {
    inputs: PropTypes.object.isRequired,
    setInputs: PropTypes.func.isRequired,
};

export default Inputs;
