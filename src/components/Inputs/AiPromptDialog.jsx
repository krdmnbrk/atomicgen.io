import React from 'react';
import yaml from 'js-yaml';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { SYSTEM_PROMPT, buildTechniqueIndexBlock } from '../../utils/atContext';
import { validateGeneratedTest, toAppFormShape } from '../../utils/aiResponseValidator';
import { useConfirm } from '../ConfirmDialog';

const MAX_PROMPT_LEN = 2000;
const MAX_REFINE_LEN = 500;

// ─── Minimal YAML colorizer ────────────────────────────────────────────────
const yamlColors = {
    key: '#6FA9FF',
    str: '#4DDD96',
    num: '#F5B74E',
    ph: 'var(--accent)',
    faint: '#6B7480',
};

function withPlaceholders(text, baseKey = 'p') {
    if (typeof text !== 'string' || !text.includes('#{')) return text;
    const parts = text.split(/(#\{[^}]+\})/g);
    return parts.map((p, i) =>
        /^#\{[^}]+\}$/.test(p) ? (
            <span key={`${baseKey}-${i}`} style={{ color: yamlColors.ph, fontWeight: 500 }}>
                {p}
            </span>
        ) : (
            p
        )
    );
}

function colorYamlValue(value) {
    if (!value) return value;
    const trimmed = value.trim();
    // Block scalar markers (|, |-, >, >+, etc.)
    if (/^([|>][+-]?)\s*$/.test(value)) {
        return <span style={{ color: yamlColors.faint }}>{value}</span>;
    }
    // Quoted string
    const sq = value.match(/^(['"])(.*)\1\s*$/);
    if (sq) {
        return (
            <span style={{ color: yamlColors.str }}>
                {sq[1]}
                {withPlaceholders(sq[2], 'sq')}
                {sq[1]}
            </span>
        );
    }
    // Number / bool / null
    if (/^-?\d+(\.\d+)?$/.test(trimmed) || /^(true|false|null)$/.test(trimmed)) {
        return <span style={{ color: yamlColors.num }}>{value}</span>;
    }
    // Plain unquoted string
    return <span style={{ color: yamlColors.str }}>{withPlaceholders(value, 'pl')}</span>;
}

function colorYamlLine(line, key) {
    if (!line) return <React.Fragment key={key}>{''}</React.Fragment>;
    // Comment line
    const cm = line.match(/^(\s*)(#.*)$/);
    if (cm) {
        return (
            <React.Fragment key={key}>
                {cm[1]}
                <span style={{ color: yamlColors.faint, fontStyle: 'italic' }}>{cm[2]}</span>
            </React.Fragment>
        );
    }
    // List item with key (e.g. "  - name: foo") OR plain "key: value"
    const m = line.match(/^(\s*(?:-\s+)?)([a-zA-Z_][\w-]*)(\s*:)(\s*)(.*)$/);
    if (m) {
        return (
            <React.Fragment key={key}>
                {m[1]}
                <span style={{ color: yamlColors.key }}>{m[2]}</span>
                {m[3]}
                {m[4]}
                {colorYamlValue(m[5])}
            </React.Fragment>
        );
    }
    // List item without key (e.g. "  - windows")
    const dashed = line.match(/^(\s*-\s+)(.*)$/);
    if (dashed) {
        return (
            <React.Fragment key={key}>
                {dashed[1]}
                {colorYamlValue(dashed[2])}
            </React.Fragment>
        );
    }
    // Block scalar continuation — color as plain string
    return <React.Fragment key={key}>{colorYamlValue(line)}</React.Fragment>;
}

function ColorizedYaml({ text, previousLineSet }) {
    if (!text) return null;
    const lines = text.split('\n');
    if (!previousLineSet) {
        return (
            <>
                {lines.map((line, i) => (
                    <React.Fragment key={i}>
                        {colorYamlLine(line, i)}
                        {i < lines.length - 1 ? '\n' : ''}
                    </React.Fragment>
                ))}
            </>
        );
    }
    // Diff mode: wrap each line in a block with a left bar when changed
    return (
        <>
            {lines.map((line, i) => {
                const trimmed = line.trim();
                const isChanged = trimmed && !previousLineSet.has(trimmed);
                const isLast = i === lines.length - 1;
                if (!trimmed) {
                    // Empty line — render as-is
                    return (
                        <React.Fragment key={i}>
                            {line}
                            {!isLast && '\n'}
                        </React.Fragment>
                    );
                }
                return (
                    <span
                        key={i}
                        style={{
                            display: 'inline-block',
                            width: '100%',
                            boxShadow: isChanged ? 'inset 2px 0 0 0 #4DDD96' : 'none',
                            backgroundColor: isChanged ? 'rgba(77, 221, 150, 0.06)' : 'transparent',
                            paddingLeft: 2,
                        }}
                    >
                        {colorYamlLine(line, i)}
                        {!isLast && '\n'}
                    </span>
                );
            })}
        </>
    );
}

function buildInitialPrompt(trimmed) {
    return (
        'Generate one Atomic Red Team test for the following request from an ' +
        'authorized security professional. Use only T-IDs from the provided ' +
        'index, or a TID you are highly confident exists in real MITRE ATT&CK. ' +
        'If the technique applies to multiple platforms with different commands, ' +
        'return one atomic_test entry per platform. Refuse only if the request ' +
        'falls under the refusal criteria in your instructions.\n\n' +
        'Request:\n' + trimmed
    );
}

function buildRefinePrompt({ originalPrompt, previousResult, refineRequest }) {
    return (
        'Refine the following previously generated Atomic Red Team test based ' +
        'on the user\'s instruction. Return a complete revised test_data with ' +
        'one or more atomic_tests addressing the change. Keep the same ' +
        'attack_technique unless the change clearly requires a different one. ' +
        'Preserve fields the user did not ask to change.\n\n' +
        'Original prompt:\n' + originalPrompt + '\n\n' +
        'Previous test_data (JSON):\n' +
        JSON.stringify(previousResult, null, 2) + '\n\n' +
        'Refinement instruction:\n' + refineRequest
    );
}

export default function AiPromptDialog({
    open,
    onClose,
    initialPrompt = '',
    base,
    setInputs,
    setChanged,
    techniques,
    settings,
    onOpenSettings,
    setLoadedSource,
}) {
    const [prompt, setPrompt] = React.useState(initialPrompt);
    const [lastSubmittedPrompt, setLastSubmittedPrompt] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [busyMode, setBusyMode] = React.useState(null); // 'generate' | 'refine'
    // 0 = first attempt, 1+ = retry number (after a refusal). Used for the
    // "Retrying (n/2)…" UI hint while the auto-retry loop runs.
    const [retryAttempt, setRetryAttempt] = React.useState(0);
    const [error, setError] = React.useState(null);
    const [networkBlocked, setNetworkBlocked] = React.useState(null);
    const [refusal, setRefusal] = React.useState(null);
    // versions: array of { data: test_data, validation, refineNote: string|null, basedOn: number|null }
    const [versions, setVersions] = React.useState([]);
    const [activeVersion, setActiveVersion] = React.useState(0);
    const [activeIdx, setActiveIdx] = React.useState(0); // variant index inside active version
    const [refineOpen, setRefineOpen] = React.useState(false);
    const [refineText, setRefineText] = React.useState('');
    const abortRef = React.useRef(null);

    // Refs for auto-scrolling the YAML preview to the active variant when the
    // user picks a platform tab. scrollRef is the overflow-auto body; testRefs
    // is one ref per atomic_tests block.
    const scrollRef = React.useRef(null);
    const testRefs = React.useRef([]);
    const isMobile = useMediaQuery('(max-width: 600px)');
    const confirm = useConfirm();

    const currentVersion = versions[activeVersion] || null;
    const result = currentVersion?.data || null;
    const validation = currentVersion?.validation || null;

    React.useEffect(() => {
        if (open) {
            setPrompt(initialPrompt);
            setLastSubmittedPrompt('');
            setError(null);
            setNetworkBlocked(null);
            setRefusal(null);
            setVersions([]);
            setActiveVersion(0);
            setActiveIdx(0);
            setRefineOpen(false);
            setRefineText('');
        }
    }, [open, initialPrompt]);

    const knownTids = React.useMemo(
        () => new Set((techniques || []).map((t) => t.id)),
        [techniques]
    );

    const callProvider = async ({ wrappedPrompt, mode, refineNote = null, basedOn = null }) => {
        setError(null);
        setNetworkBlocked(null);
        setRefusal(null);

        if (!settings.apiKey) {
            setError(`Add your ${settings.provider.name} API key in settings first.`);
            return;
        }

        setBusy(true);
        setBusyMode(mode);
        setRetryAttempt(0);
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
            const indexBlock = buildTechniqueIndexBlock(techniques);

            // Auto-retry on refusal: model behavior is stochastic, and OpenAI
            // in particular sometimes refuses broad/colloquial requests that
            // Anthropic happily maps to a technique. Try up to 3 attempts in
            // total (1 + 2 retries); on each retry append a nudge that quotes
            // the prior refusal reason and reminds the model that broadness
            // is not a valid refusal cause.
            const MAX_ATTEMPTS = 3;
            let payload = null;
            let lastRefusal = null;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                setRetryAttempt(attempt - 1);
                const promptForAttempt = attempt === 1
                    ? wrappedPrompt
                    : `${wrappedPrompt}\n\n[Auto-retry ${attempt - 1}/${MAX_ATTEMPTS - 1}: a previous attempt was refused with reason: "${lastRefusal}". Per system instructions, broadness/colloquial phrasing is NOT a valid refusal reason. Map the request to the closest ATT&CK technique and accept.]`;
                const candidate = await settings.provider.generate({
                    apiKey: settings.apiKey,
                    model: settings.model,
                    systemPrompt: SYSTEM_PROMPT,
                    indexBlock,
                    userPrompt: promptForAttempt,
                    signal: ctrl.signal,
                });
                if (candidate?.action === 'refuse') {
                    lastRefusal = candidate.reason || 'Request was declined.';
                    if (attempt === MAX_ATTEMPTS) {
                        setRefusal(`Model refused after ${MAX_ATTEMPTS} attempts. Last reason: ${lastRefusal}`);
                        return;
                    }
                    continue;
                }
                payload = candidate;
                break;
            }

            if (payload?.action !== 'generate' || !payload.test_data) {
                setError('Unexpected response. Try rephrasing your request.');
                return;
            }
            const v = validateGeneratedTest(payload.test_data, knownTids);
            const newVersion = {
                data: payload.test_data,
                validation: v,
                refineNote,
                basedOn,
            };
            if (mode === 'refine') {
                setVersions((prev) => {
                    const next = [...prev, newVersion];
                    setActiveVersion(next.length - 1);
                    return next;
                });
            } else {
                setVersions([newVersion]);
                setActiveVersion(0);
            }
            setActiveIdx(0);
            return true;
        } catch (e) {
            if (e.name === 'AbortError') {
                /* user cancelled */
            } else if (e?.code === 'NETWORK_BLOCKED') {
                setNetworkBlocked({
                    providerName: e.providerName || settings.provider.name,
                    endpointHost: e.endpointHost || settings.provider.endpointHost,
                });
            } else {
                setError(e.message || 'Generation failed.');
            }
        } finally {
            setBusy(false);
            setBusyMode(null);
            setRetryAttempt(0);
            abortRef.current = null;
        }
    };

    const generate = async () => {
        const trimmed = prompt.trim();
        if (!trimmed) {
            setError('Describe the test you want to generate.');
            return;
        }
        if (trimmed.length > MAX_PROMPT_LEN) {
            setError(`Prompt is too long (max ${MAX_PROMPT_LEN} characters).`);
            return;
        }
        setLastSubmittedPrompt(trimmed);
        setRefineOpen(false);
        setRefineText('');
        await callProvider({ wrappedPrompt: buildInitialPrompt(trimmed), mode: 'generate' });
    };

    const submitRefine = async () => {
        const trimmed = refineText.trim();
        if (!trimmed) {
            setError('Describe what should change.');
            return;
        }
        if (trimmed.length > MAX_REFINE_LEN) {
            setError(`Refinement is too long (max ${MAX_REFINE_LEN} characters).`);
            return;
        }
        if (!result) return;
        const ok = await callProvider({
            wrappedPrompt: buildRefinePrompt({
                originalPrompt: lastSubmittedPrompt || prompt.trim(),
                previousResult: result,
                refineRequest: trimmed,
            }),
            mode: 'refine',
            refineNote: trimmed,
            basedOn: activeVersion,
        });
        if (ok) {
            setRefineText('');
            setRefineOpen(false);
        }
    };

    const cancel = () => {
        if (abortRef.current) abortRef.current.abort();
    };

    const tests = Array.isArray(result?.atomic_tests) ? result.atomic_tests : [];
    const activeTest = tests[activeIdx];

    // Auto-scroll the YAML preview to the active variant when the user picks
    // a platform tab. Skipped for single-variant results (nothing to navigate)
    // and during refine since the preview is dimmed.
    React.useEffect(() => {
        if (!result || tests.length <= 1) return;
        if (busy && busyMode === 'refine') return;
        const container = scrollRef.current;
        const target = testRefs.current[activeIdx];
        if (!container || !target) return;
        // Defer until after layout so refs/positions are settled (refine swaps
        // the YAML in-place which can briefly invalidate offsets).
        const id = requestAnimationFrame(() => {
            const cRect = container.getBoundingClientRect();
            const tRect = target.getBoundingClientRect();
            const next = container.scrollTop + (tRect.top - cRect.top) - 16;
            container.scrollTo({ top: Math.max(0, next), behavior: 'smooth' });
        });
        return () => cancelAnimationFrame(id);
    }, [activeIdx, tests.length, result, busy, busyMode]);
    const activeTestValidation = validation?.perTest?.[activeIdx];
    const topLevelErrors = validation?.errors || [];
    const topLevelWarnings = validation?.warnings || [];
    const errorCount =
        topLevelErrors.length + (activeTestValidation ? activeTestValidation.errors.length : 0);

    const apply = () => {
        if (!result) return;
        const shape = toAppFormShape(result, activeIdx);
        if (!shape) {
            setError('Could not map the generated test to the form.');
            return;
        }
        setInputs({ ...base, ...shape });
        setChanged(false);
        if (setLoadedSource) setLoadedSource({ type: 'ai' });
        onClose();
    };

    const yamlBlocks = React.useMemo(() => {
        if (!result || !Array.isArray(result.atomic_tests)) return null;
        try {
            const headerYaml =
                yaml.dump(
                    {
                        attack_technique: result.attack_technique,
                        display_name: result.display_name,
                    },
                    { lineWidth: -1, noRefs: true }
                ) + 'atomic_tests:\n';
            const testYamls = result.atomic_tests.map((t) => {
                const dumped = yaml.dump([t], { lineWidth: -1, noRefs: true });
                return dumped
                    .split('\n')
                    .map((line) => (line.length ? '  ' + line : line))
                    .join('\n');
            });
            return { headerYaml, testYamls };
        } catch {
            return null;
        }
    }, [result]);

    // Build a Set of trimmed lines from the version this one was based on,
    // so we can highlight what changed during refine.
    const previousVersionLineSet = React.useMemo(() => {
        if (!currentVersion || currentVersion.basedOn == null) return null;
        const prev = versions[currentVersion.basedOn];
        if (!prev?.data) return null;
        try {
            const headerYaml =
                yaml.dump(
                    { attack_technique: prev.data.attack_technique, display_name: prev.data.display_name },
                    { lineWidth: -1, noRefs: true }
                ) + 'atomic_tests:\n';
            const testYamls = (prev.data.atomic_tests || []).map((t) => {
                const dumped = yaml.dump([t], { lineWidth: -1, noRefs: true });
                return dumped
                    .split('\n')
                    .map((line) => (line.length ? '  ' + line : line))
                    .join('\n');
            });
            const all = [headerYaml, ...testYamls].join('\n');
            const set = new Set(all.split('\n').map((l) => l.trim()).filter(Boolean));
            return set;
        } catch {
            return null;
        }
    }, [currentVersion, versions]);

    const fallbackYaml = React.useMemo(() => {
        if (!result || yamlBlocks) return '';
        try {
            return yaml.dump(result, { lineWidth: -1, noRefs: true });
        } catch {
            return JSON.stringify(result, null, 2);
        }
    }, [result, yamlBlocks]);

    const canApply =
        Boolean(activeTest) &&
        topLevelErrors.length === 0 &&
        (activeTestValidation ? activeTestValidation.errors.length === 0 : true);

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            fullWidth
            maxWidth="md"
            fullScreen={isMobile}
            sx={!isMobile ? { '& .MuiDialog-container': { alignItems: 'flex-start' } } : undefined}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 3,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    ...(isMobile ? {} : { mt: '20vh', maxHeight: '70vh' }),
                },
            }}
        >
            {/* ─── Top command bar ─── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--glass-stroke)',
                }}
            >
                <Box sx={{ pl: 2, pr: 1.25, color: 'primary.main', display: 'flex', flexShrink: 0 }}>
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box
                    component="input"
                    type="text"
                    autoFocus
                    aria-label="AI test prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe a test to generate…"
                    disabled={busy}
                    maxLength={MAX_PROMPT_LEN}
                    sx={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'text.primary',
                        font: 'inherit',
                        fontSize: 16,
                        fontFamily: 'inherit',
                        py: 2,
                        '&::placeholder': { color: 'var(--text-faint)' },
                        '&:disabled': { opacity: 0.6 },
                        '&:focus-visible': { outline: 'none' },
                    }}
                />
                <Tooltip title={`Provider: ${settings.provider.name} · click to change`} placement="bottom">
                    <Box
                        component="button"
                        onClick={onOpenSettings}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.6,
                            mr: 1,
                            px: 1,
                            py: 0.4,
                            background: 'transparent',
                            border: '1px solid var(--glass-stroke)',
                            borderRadius: 1.25,
                            color: 'text.secondary',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10.5,
                            fontWeight: 500,
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.12s',
                            '&:hover': {
                                color: 'primary.main',
                                borderColor: 'rgba(255, 92, 57, 0.4)',
                                background: 'var(--accent-soft)',
                            },
                        }}
                    >
                        <Box
                            component="span"
                            sx={{ width: 6, height: 6, borderRadius: '50%', background: settings.apiKey ? 'success.main' : 'var(--text-faint)', boxShadow: settings.apiKey ? '0 0 6px var(--mui-palette-success-main, #4DDD96)' : 'none', flexShrink: 0 }}
                        />
                        {settings.provider.id}/{settings.model}
                    </Box>
                </Tooltip>
                <Typography
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: 'var(--text-faint)',
                        pr: 1.5,
                        flexShrink: 0,
                    }}
                >
                    {prompt.length}/{MAX_PROMPT_LEN}
                </Typography>
                <Tooltip title="Close">
                    <IconButton
                        size="small"
                        onClick={busy ? undefined : onClose}
                        disabled={busy}
                        sx={{ mr: 1, color: 'text.secondary' }}
                    >
                        <CloseRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Indeterminate progress strip while a request is in flight */}
            {busy && (
                <LinearProgress
                    sx={{
                        height: 2,
                        backgroundColor: 'transparent',
                        '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent))',
                        },
                    }}
                />
            )}

            {/* ─── Status caption (compact, above YAML, only when result exists) ─── */}
            {result && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 0.75,
                        borderBottom: '1px solid var(--glass-stroke)',
                        background: 'rgba(0, 0, 0, 0.10)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: 'text.secondary',
                        flexWrap: 'wrap',
                    }}
                >
                    <Box sx={{ color: 'primary.main', fontWeight: 500, flexShrink: 0 }}>
                        {result.attack_technique}
                    </Box>
                    <Box sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }} title={result.display_name}>
                        {result.display_name}
                    </Box>
                    <Box sx={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 0.75, color: errorCount > 0 ? 'error.main' : 'success.main' }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: errorCount > 0 ? 'error.main' : 'success.main', boxShadow: `0 0 6px ${errorCount > 0 ? '#E5484D' : '#4DDD96'}` }} />
                        {errorCount > 0 ? `${errorCount} error${errorCount === 1 ? '' : 's'}` : '0 errors'}
                    </Box>
                </Box>
            )}

            {/* ─── Versions row (only when 2+ versions exist) ─── */}
            {versions.length >= 2 && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 2,
                        py: 1,
                        borderBottom: '1px solid var(--glass-stroke)',
                        background: 'rgba(0, 0, 0, 0.10)',
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
                        Versions
                    </Typography>
                    <Box
                        role="tablist"
                        aria-label="Generation versions"
                        sx={{
                            display: 'inline-flex',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--glass-stroke)',
                            borderRadius: 2,
                            padding: 0.4,
                            gap: 0.25,
                            overflowX: 'auto',
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        {versions.map((v, i) => {
                            const active = i === activeVersion;
                            const tip = v.refineNote
                                ? `v${i + 1} · refined from v${(v.basedOn ?? i - 1) + 1}: "${v.refineNote}"`
                                : `v${i + 1} · initial generation`;
                            return (
                                <Tooltip key={i} title={tip} placement="top">
                                    <Box
                                        component="button"
                                        role="tab"
                                        aria-selected={active}
                                        aria-label={tip}
                                        onClick={() => {
                                            setActiveVersion(i);
                                            setActiveIdx(0);
                                        }}
                                        sx={{
                                            background: active ? 'var(--accent-soft)' : 'transparent',
                                            color: active ? 'primary.main' : 'text.secondary',
                                            border: 'none',
                                            boxShadow: active
                                                ? `inset 0 0 0 1px rgba(255, 92, 57, 0.4)`
                                                : 'none',
                                            borderRadius: 1.25,
                                            px: 1.25,
                                            py: 0.5,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 11.5,
                                            fontWeight: active ? 600 : 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.12s',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            flexShrink: 0,
                                            '&:hover': {
                                                color: active ? 'primary.main' : 'text.primary',
                                                background: active ? 'var(--accent-soft)' : 'rgba(255,255,255,0.04)',
                                            },
                                            '&:focus-visible': {
                                                outline: '2px solid var(--accent)',
                                                outlineOffset: 1,
                                            },
                                        }}
                                    >
                                        v{i + 1}
                                        {v.refineNote && (
                                            <AutoFixHighRoundedIcon sx={{ fontSize: 11, opacity: 0.7 }} />
                                        )}
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </Box>
                    {currentVersion?.refineNote && (
                        <Typography
                            sx={{
                                fontSize: 11,
                                color: 'var(--text-faint)',
                                fontStyle: 'italic',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 320,
                                flexShrink: 1,
                            }}
                            title={currentVersion.refineNote}
                        >
                            “{currentVersion.refineNote}”
                        </Typography>
                    )}
                </Box>
            )}

            {/* ─── Variant segmented control + Refine button (multi-variant only) ─── */}
            {result && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        px: 2,
                        py: 1.25,
                        borderBottom: '1px solid var(--glass-stroke)',
                    }}
                >
                    {tests.length > 1 ? (
                        <Box
                            role="tablist"
                            aria-label="Platform variants"
                            sx={{
                                display: 'inline-flex',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid var(--glass-stroke)',
                                borderRadius: 2,
                                padding: 0.5,
                            }}
                        >
                            {tests.map((t, i) => {
                                const platform = Array.isArray(t.supported_platforms) && t.supported_platforms[0]
                                    ? t.supported_platforms[0]
                                    : `var-${i + 1}`;
                                const active = i === activeIdx;
                                return (
                                    <Box
                                        key={i}
                                        component="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setActiveIdx(i)}
                                        sx={{
                                            background: active ? 'var(--accent-soft)' : 'transparent',
                                            color: active ? 'primary.main' : 'text.secondary',
                                            border: 'none',
                                            boxShadow: active
                                                ? `inset 0 0 0 1px rgba(255, 92, 57, 0.4)`
                                                : 'none',
                                            borderRadius: 1.25,
                                            px: 1.5,
                                            py: 0.75,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 12,
                                            fontWeight: active ? 600 : 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.12s',
                                            '&:hover': {
                                                color: active ? 'primary.main' : 'text.primary',
                                            },
                                            '&:focus-visible': {
                                                outline: '2px solid var(--accent)',
                                                outlineOffset: 1,
                                            },
                                        }}
                                    >
                                        {platform}
                                    </Box>
                                );
                            })}
                        </Box>
                    ) : (
                        <Box />
                    )}
                    {tests.length > 1 && (
                        <Typography
                            sx={{
                                fontSize: 11,
                                color: 'var(--text-faint)',
                                ml: 1,
                                display: { xs: 'none', sm: 'inline' },
                            }}
                        >
                            Cross-platform technique — pick your target.
                        </Typography>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Button
                        variant={refineOpen ? 'contained' : 'outlined'}
                        size="small"
                        startIcon={
                            busy && busyMode === 'refine'
                                ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                                : <AutoFixHighRoundedIcon sx={{ fontSize: 16 }} />
                        }
                        onClick={() => setRefineOpen((v) => !v)}
                        disabled={busy}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 1.5,
                            fontWeight: 500,
                            fontSize: 13,
                        }}
                    >
                        {busy && busyMode === 'refine' ? 'Refining…' : 'Refine'}
                    </Button>
                </Box>
            )}

            {/* ─── Refine inline bar ─── */}
            {result && refineOpen && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1.25,
                        borderBottom: '1px solid var(--glass-stroke)',
                        background: 'var(--accent-soft)',
                    }}
                >
                    <AutoFixHighRoundedIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
                    <Box
                        component="input"
                        type="text"
                        autoFocus
                        value={refineText}
                        onChange={(e) => setRefineText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && refineText.trim() && !busy) submitRefine();
                            if (e.key === 'Escape') {
                                setRefineOpen(false);
                                setRefineText('');
                            }
                        }}
                        placeholder='What should change? e.g. "use powershell instead", "make cleanup idempotent", "add a timeout argument"…'
                        disabled={busy}
                        maxLength={MAX_REFINE_LEN}
                        sx={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'text.primary',
                            font: 'inherit',
                            fontSize: 14,
                            fontFamily: 'inherit',
                            py: 1,
                            '&::placeholder': { color: 'var(--text-faint)' },
                        }}
                    />
                    <Typography
                        sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: 'var(--text-faint)',
                            flexShrink: 0,
                        }}
                    >
                        {refineText.length}/{MAX_REFINE_LEN}
                    </Typography>
                    <Button
                        size="small"
                        onClick={() => {
                            setRefineOpen(false);
                            setRefineText('');
                        }}
                        disabled={busy}
                        sx={{ textTransform: 'none', color: 'text.secondary', minWidth: 0, px: 1.25 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={submitRefine}
                        disabled={busy || !refineText.trim()}
                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 600, minWidth: 0, px: 1.75 }}
                    >
                        Refine →
                    </Button>
                </Box>
            )}

            {/* ─── Inline first-run API key prompt ─── */}
            {!settings.apiKey && (
                <Box sx={{ p: 2, borderBottom: '1px solid var(--glass-stroke)', background: 'var(--accent-soft)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                                color: 'white',
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                                fontSize: 14,
                            }}
                        >
                            🔒
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
                                Add your {settings.provider.name} API key to start generating
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25 }}>
                                Your key stays in this browser (localStorage) and goes directly to {settings.provider.endpointHost}. No backend, no logging. <Box component="a" href={settings.provider.apiKeyHelpUrl} target="_blank" rel="noopener" sx={{ color: 'primary.main' }}>Get a key →</Box>
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Box
                                    component="input"
                                    type="password"
                                    placeholder={settings.provider.apiKeyHint}
                                    autoComplete="off"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            settings.setApiKey(e.target.value.trim());
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const v = e.target.value.trim();
                                        if (v) settings.setApiKey(v);
                                    }}
                                    sx={{
                                        flex: '1 1 240px',
                                        minWidth: 200,
                                        background: 'var(--glass-modal)',
                                        border: '1px solid var(--glass-stroke-strong)',
                                        borderRadius: 1.5,
                                        color: 'text.primary',
                                        font: 'inherit',
                                        fontSize: 13,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        px: 1.5,
                                        py: 1,
                                        outline: 'none',
                                        '&:focus': { borderColor: 'primary.main' },
                                    }}
                                />
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={onOpenSettings}
                                    sx={{ textTransform: 'none', borderRadius: 1.5 }}
                                >
                                    More options
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}

            {/* ─── Body (alerts, busy, YAML) ─── */}
            <Box ref={scrollRef} sx={{ flex: 1, overflow: 'auto', background: result ? 'rgba(0, 0, 0, 0.18)' : 'transparent' }}>
                {/* Alerts */}
                {(error || networkBlocked || refusal || (validation && (topLevelErrors.length > 0 || topLevelWarnings.length > 0)) || (busy && !result)) && (
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                        {networkBlocked && (
                            <Alert
                                severity="warning"
                                icon={<CloudOffOutlinedIcon />}
                                sx={{
                                    borderRadius: 2,
                                    alignItems: 'flex-start',
                                    '& .MuiAlert-icon': { fontSize: 28, mt: 0.5 },
                                }}
                            >
                                <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>
                                    Couldn't reach {networkBlocked.providerName}
                                </AlertTitle>
                                <Typography variant="body2" sx={{ mb: 1.25 }}>
                                    The{' '}
                                    <Box
                                        component="code"
                                        sx={{
                                            background: 'var(--glass-strong)',
                                            px: 0.6,
                                            py: 0.1,
                                            borderRadius: 0.5,
                                            fontSize: 12,
                                            fontFamily: "'JetBrains Mono', monospace",
                                        }}
                                    >
                                        {networkBlocked.endpointHost}
                                    </Box>{' '}
                                    endpoint is unreachable from this network. This often happens when corporate firewalls or DNS policies block LLM provider domains.
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                    You can still:
                                </Typography>
                                <Box component="ul" sx={{ m: 0, mb: 1.25, pl: 2.5, '& li': { fontSize: 13, lineHeight: 1.6 } }}>
                                    <li>Browse and load any test from the atomic-red-team repo</li>
                                    <li>Load a sample test and edit it manually</li>
                                    <li>Upload an existing YAML file</li>
                                </Box>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                    To enable AI generation, try a network without LLM restrictions, or ask your IT team to allow{' '}
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
                                        {networkBlocked.endpointHost}
                                    </Box>.
                                </Typography>
                            </Alert>
                        )}
                        {refusal && (
                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                                The model declined to generate this test: {refusal}
                            </Alert>
                        )}
                        {topLevelErrors.length > 0 && (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                <Typography variant="subtitle2">Validation errors</Typography>
                                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                                    {topLevelErrors.map((m, i) => <li key={i}>{m}</li>)}
                                </Box>
                            </Alert>
                        )}
                        {topLevelWarnings.length > 0 && (
                            <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                                    {topLevelWarnings.map((m, i) => <li key={i}>{m}</li>)}
                                </Box>
                            </Alert>
                        )}
                        {activeTestValidation && activeTestValidation.errors.length > 0 && (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                <Typography variant="subtitle2">Errors in this variant</Typography>
                                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                                    {activeTestValidation.errors.map((m, i) => <li key={i}>{m}</li>)}
                                </Box>
                            </Alert>
                        )}
                        {activeTestValidation && activeTestValidation.warnings.length > 0 && (
                            <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                                    {activeTestValidation.warnings.map((m, i) => <li key={i}>{m}</li>)}
                                </Box>
                            </Alert>
                        )}
                        {busy && !result && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                                <CircularProgress size={18} />
                                <Typography variant="body2" color="text.secondary">
                                    {retryAttempt > 0
                                        ? `Retrying (${retryAttempt}/2) — model refused, nudging…`
                                        : 'Generating…'}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* YAML preview */}
                {result && (
                    <Box
                        component="pre"
                        sx={{
                            m: 0,
                            p: 0,
                            fontSize: 12.5,
                            fontFamily: "'JetBrains Mono', monospace",
                            lineHeight: 1.7,
                            color: 'text.primary',
                            whiteSpace: 'pre',
                            position: 'relative',
                            opacity: busy && busyMode === 'refine' ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {yamlBlocks ? (
                            <>
                                <Box component="span" sx={{ display: 'block', px: 2.5, pt: 2 }}>
                                    <ColorizedYaml text={yamlBlocks.headerYaml} previousLineSet={previousVersionLineSet} />
                                </Box>
                                {yamlBlocks.testYamls.map((y, i) => {
                                    const active = i === activeIdx && yamlBlocks.testYamls.length > 1;
                                    const dim = i !== activeIdx && yamlBlocks.testYamls.length > 1;
                                    return (
                                        <Box
                                            key={i}
                                            ref={(el) => { testRefs.current[i] = el; }}
                                            component="span"
                                            sx={(theme) => ({
                                                display: 'block',
                                                px: 2.5,
                                                py: 0.25,
                                                opacity: dim ? 0.42 : 1,
                                                backgroundColor: active
                                                    ? theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 167, 38, 0.14)'
                                                        : 'rgba(255, 167, 38, 0.18)'
                                                    : 'transparent',
                                                boxShadow: active
                                                    ? `inset 3px 0 0 0 ${theme.palette.warning.main}`
                                                    : 'none',
                                                transition: 'opacity 150ms, background-color 150ms',
                                            })}
                                        >
                                            <ColorizedYaml text={y} previousLineSet={previousVersionLineSet} />
                                        </Box>
                                    );
                                })}
                                <Box component="span" sx={{ display: 'block', pb: 2 }} />
                            </>
                        ) : (
                            <Box component="span" sx={{ display: 'block', p: 2.5 }}>
                                <ColorizedYaml text={fallbackYaml} previousLineSet={previousVersionLineSet} />
                            </Box>
                        )}

                        {busy && busyMode === 'refine' && (
                            <Box
                                role="status"
                                aria-live="polite"
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1.5,
                                    color: 'primary.main',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    backdropFilter: 'blur(2px)',
                                }}
                            >
                                <CircularProgress size={18} />
                                {retryAttempt > 0
                                    ? `Retrying (${retryAttempt}/2) — model refused, nudging…`
                                    : 'Refining…'}
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

            {/* ─── Footer actions ─── */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    borderTop: '1px solid var(--glass-stroke)',
                }}
            >
                {/* Reset/regenerate as a small de-emphasized icon — destructive (clears versions) */}
                {result && !busy && (
                    <Tooltip title="Discard versions and start a new generation from this prompt">
                        <IconButton
                            size="small"
                            onClick={async () => {
                                if (versions.length > 1) {
                                    const ok = await confirm({
                                        title: 'Discard refine history?',
                                        message: `You have ${versions.length} versions (v1–v${versions.length}). Starting a new generation will discard all of them.`,
                                        confirmText: 'Start over',
                                        cancelText: 'Keep history',
                                        severity: 'danger',
                                    });
                                    if (!ok) return;
                                }
                                generate();
                            }}
                            sx={{
                                color: 'text.secondary',
                                border: '1px solid var(--glass-stroke)',
                                borderRadius: 1.5,
                                '&:hover': { color: 'warning.main', borderColor: 'warning.main' },
                            }}
                        >
                            <ReplayRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                )}
                {busy ? (
                    <Button onClick={cancel} color="warning" sx={{ textTransform: 'none' }}>
                        Cancel request
                    </Button>
                ) : (
                    <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                        Close
                    </Button>
                )}
                {!result && (
                    <Button
                        variant="contained"
                        onClick={generate}
                        disabled={busy || !prompt.trim()}
                        sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 500 }}
                    >
                        {busy ? 'Generating…' : 'Generate'}
                    </Button>
                )}
                {result && (
                    <Button
                        variant="contained"
                        onClick={apply}
                        disabled={!canApply || busy}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 1.5,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                            boxShadow: '0 4px 14px -4px var(--accent), inset 0 1px 0 rgba(255,255,255,0.3)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, var(--accent-2), var(--accent))',
                            },
                        }}
                    >
                        {tests.length > 1 ? 'Apply selected' : 'Apply to form'}
                    </Button>
                )}
            </Box>
        </Dialog>
    );
}
