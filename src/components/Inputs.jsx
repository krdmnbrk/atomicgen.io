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
    FilledInput,
    Chip,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    IconButton,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PropTypes from 'prop-types';
import Arguments from './Inputs/Arguments';
import Dependency from './Inputs/Dependency';
import TechniquePicker from './Inputs/TechniquePicker';
import Editor from './Editor';
import InputButtons from './Inputs/InputButtons';
import AiAssistant from './Inputs/AiAssistant';
import useAtomicIndex from '../hooks/useAtomicIndex';
import { inputSx } from './inputStyles';

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
    // AI prompt search query — lifted here so it can count as "dirty" for
    // overwrite confirmations and be cleared when a test is loaded.
    const [aiQuery, setAiQuery] = React.useState('');
    const dirty = changed || aiQuery.trim().length > 0;
    const setInputsAndClearQuery = React.useCallback((next) => {
        setInputs(next);
        setAiQuery('');
    }, [setInputs]);

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

    // ATT&CK technique picker (loads from atomic-red-team CSV index)
    const { data: atIndex } = useAtomicIndex();
    const techniqueOptions = atIndex?.techniques || [];
    const techniqueTests = atIndex?.tests || [];
    const handleTechniqueChange = (_event, value) => {
        if (value && value.id) {
            // From picker (index match or custom TID). When the picker provides
            // a name (index match), use it; for custom TIDs the picker passes
            // name=null and we leave display_name blank so the user enters the
            // canonical MITRE name themselves via the conditional field below.
            setInputs((prev) => ({
                ...prev,
                attack_technique: value.id,
                display_name: value.name || null,
            }));
        } else {
            setInputs((prev) => ({ ...prev, attack_technique: null, display_name: null }));
        }
    };

    // True when the user picked a TID that the atomic-red-team index doesn't
    // know about (either a custom T#### or the index failed to load and we
    // can't validate). In that case we surface a Display name field so the
    // user can supply the canonical MITRE name; otherwise display_name is
    // auto-filled from the index and the field is hidden.
    const isCustomTechnique = Boolean(
        inputs.attack_technique &&
            !techniqueOptions.some((o) => o.id === inputs.attack_technique)
    );

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
                    setInputs={setInputsAndClearQuery}
                    setChanged={setChanged}
                    changed={dirty}
                    darkMode={darkMode}
                    setLoadedSource={setLoadedSource}
                />
            </Box>

            {/* AI prompt hero */}
            <AiAssistant
                base={base}
                setInputs={setInputsAndClearQuery}
                setChanged={setChanged}
                changed={dirty}
                darkMode={darkMode}
                setLoadedSource={setLoadedSource}
                query={aiQuery}
                setQuery={setAiQuery}
            />

            {/* Source provenance badge */}
            {loadedSource && (
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 0.75,
                        mb: 1.5,
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1.5,
                        background: 'var(--glass-strong)',
                        border: '1px solid var(--glass-stroke)',
                        fontSize: 12,
                        color: 'text.secondary',
                        maxWidth: '100%',
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
                        <Box
                            component="span"
                            title="Form has unsaved changes"
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                ml: 0.5,
                                color: 'warning.main',
                                fontSize: 11,
                            }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: 'warning.main',
                                    boxShadow: '0 0 6px #F5B74E',
                                }}
                            />
                            modified
                        </Box>
                    )}
                </Box>
            )}

            {/* ─── IDENTITY ─── */}
            <Paper elevation={0} sx={glassSection}>
                <SectionTitle
                    icon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />}
                    meta={
                        inputs.attack_technique || (inputs.supported_platforms || []).length
                            ? [
                                  inputs.attack_technique,
                                  (inputs.supported_platforms || []).length
                                      ? `${inputs.supported_platforms.length} platform${inputs.supported_platforms.length === 1 ? '' : 's'}`
                                      : null,
                              ]
                                  .filter(Boolean)
                                  .join(' · ')
                            : null
                    }
                >
                    Identity
                </SectionTitle>
                <Box sx={{ mb: 2 }}>
                    <TechniquePicker
                        value={inputs.attack_technique || ''}
                        onChange={(picked) => handleTechniqueChange(null, picked)}
                        options={techniqueOptions}
                        tests={techniqueTests}
                        attackUrl={techniqueAttackUrl}
                        required
                    />
                </Box>
                {/* Custom TID — surface display_name so the user can supply
                    the canonical MITRE name. Hidden when the chosen TID is in
                    the atomic-red-team index (display_name auto-filled). */}
                {isCustomTechnique && (
                    <Box sx={{ mb: 2 }}>
                        <TextField
                            required
                            spellCheck="false"
                            fullWidth
                            variant="filled"
                            size="small"
                            label="Technique display name"
                            placeholder="e.g. Scheduled Task/Job: Scheduled Task"
                            id="display_name"
                            name="display_name"
                            value={inputs.display_name || ''}
                            onChange={handleChangeText}
                            helperText={`Custom TID (${inputs.attack_technique}) — enter the canonical MITRE technique name.`}
                            FormHelperTextProps={{
                                sx: { ml: 0, fontSize: 11, color: 'var(--text-faint)' },
                            }}
                            sx={inputSx}
                        />
                    </Box>
                )}
                <Box sx={{ mb: 2 }}>
                    <TextField
                        required
                        spellCheck="false"
                        fullWidth
                        variant="filled"
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
                        variant="filled"
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
                    <FormControl required size="small" fullWidth variant="filled" sx={inputSx}>
                        <InputLabel id="supported-platforms-label">Supported Platforms</InputLabel>
                        <Select
                            labelId="supported-platforms-label"
                            id="supported-platforms"
                            multiple
                            value={inputs.supported_platforms}
                            onChange={handleChangeSupportedPlatforms}
                            input={<FilledInput id="select-multiple-chip" />}
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
                        gap: 1.25,
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
                            flexShrink: 0,
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
                            minWidth: 0,
                        }}
                    >
                        {inputs.auto_generated_guid || 'auto-generated on first download'}
                    </Typography>
                    <Tooltip title={inputs.auto_generated_guid ? 'Regenerate GUID' : 'Generate GUID now'}>
                        <IconButton size="small" onClick={regenerateGuid} sx={{ color: 'text.secondary', flexShrink: 0 }}>
                            <RefreshRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Paper>

            {/* ─── EXECUTION ─── */}
            <Paper elevation={0} sx={glassSection}>
                <SectionTitle
                    icon={<TerminalRoundedIcon sx={{ fontSize: 16 }} />}
                    meta={[
                        inputs.executor?.name,
                        inputs.input_arguments?.length > 0
                            ? `${inputs.input_arguments.length} arg${inputs.input_arguments.length === 1 ? '' : 's'}`
                            : null,
                    ]
                        .filter(Boolean)
                        .join(' · ') || null}
                >
                    Execution
                </SectionTitle>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <FormControl required size="small" variant="filled" sx={{ ...inputSx, flex: '1 1 220px', minWidth: 200 }}>
                        <InputLabel id="attack_executor">Attack Executor</InputLabel>
                        <Select
                            labelId="attack_executor"
                            id="attack_executor_select"
                            value={inputs.executor.name}
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
                            flexWrap: 'wrap',
                        }}
                    >
                        Input arguments
                        <Typography
                            component="span"
                            sx={{
                                fontSize: 11,
                                color: 'var(--text-faint)',
                                display: { xs: 'none', sm: 'inline' },
                            }}
                        >
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
                        px: { xs: 1.75, sm: 2.5 },
                        py: 1,
                        '& .MuiAccordionSummary-content': {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: { xs: 1, sm: 2 },
                            minWidth: 0,
                        },
                    }}
                >
                    <Box sx={{ ...sectionTitleSx, minWidth: 0, whiteSpace: 'nowrap' }} style={{ marginBottom: 0 }}>
                        <Box sx={{ color: 'primary.main', display: 'flex' }}>
                            <CleaningServicesOutlinedIcon sx={{ fontSize: 16 }} />
                        </Box>
                        Setup &amp; Cleanup
                    </Box>
                    <Typography
                        sx={{
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: 'var(--text-faint)',
                            mr: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: { xs: 'none', sm: 'block' },
                        }}
                    >
                        {(() => {
                            const depCount = (inputs.dependencies || []).length;
                            const hasCleanup = !!(inputs.executor?.cleanup_command || '').trim();
                            const parts = [];
                            if (hasCleanup) parts.push('cleanup');
                            if (depCount) parts.push(`${depCount} dep${depCount === 1 ? '' : 's'}`);
                            return parts.length ? parts.join(' · ') : 'optional';
                        })()}
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
