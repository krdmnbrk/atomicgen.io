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
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import PropTypes from 'prop-types';
import Arguments from './Inputs/Arguments';
import Dependency from './Inputs/Dependency';
import Editor from './Editor';
import InputButtons from './Inputs/InputButtons';
import AiAssistant from './Inputs/AiAssistant';

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

    const lifecycleHasContent =
        Boolean(inputs.executor?.cleanup_command) ||
        (Array.isArray(inputs.dependencies) && inputs.dependencies.length > 0);

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
                />
            </Box>

            {/* AI prompt hero */}
            <AiAssistant
                base={base}
                setInputs={setInputs}
                setChanged={setChanged}
                changed={changed}
                darkMode={darkMode}
            />

            {/* ─── IDENTITY ─── */}
            <Paper elevation={0} sx={glassSection}>
                <SectionTitle icon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />}>Identity</SectionTitle>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        required
                        spellCheck="false"
                        fullWidth
                        label="Atomic Name"
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
                        minRows={2}
                        label="Atomic Description"
                        id="description"
                        name="description"
                        value={inputs.description || ''}
                        onChange={handleChangeText}
                        sx={inputSx}
                    />
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
            </Paper>

            {/* ─── LIFECYCLE (collapsible) ─── */}
            <Accordion
                defaultExpanded={lifecycleHasContent}
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
                        Lifecycle
                    </Box>
                    <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', mr: 1 }}>
                        cleanup · dependencies · optional
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
