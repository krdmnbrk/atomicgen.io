import React from 'react';
import yaml from 'js-yaml';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import SettingsIcon from '@mui/icons-material/Settings';
import { SYSTEM_PROMPT, buildTechniqueIndexBlock } from '../../utils/atContext';
import { validateGeneratedTest, toAppFormShape } from '../../utils/aiResponseValidator';

const MAX_PROMPT_LEN = 2000;

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
}) {
    const [prompt, setPrompt] = React.useState(initialPrompt);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [refusal, setRefusal] = React.useState(null);
    const [result, setResult] = React.useState(null);
    const [validation, setValidation] = React.useState(null);
    const [activeIdx, setActiveIdx] = React.useState(0);
    const abortRef = React.useRef(null);

    React.useEffect(() => {
        if (open) {
            setPrompt(initialPrompt);
            setError(null);
            setRefusal(null);
            setResult(null);
            setValidation(null);
            setActiveIdx(0);
        }
    }, [open, initialPrompt]);

    const knownTids = React.useMemo(
        () => new Set((techniques || []).map((t) => t.id)),
        [techniques]
    );

    const generate = async () => {
        setError(null);
        setRefusal(null);
        setResult(null);
        setValidation(null);
        setActiveIdx(0);

        const trimmed = prompt.trim();
        if (!trimmed) {
            setError('Describe the test you want to generate.');
            return;
        }
        if (trimmed.length > MAX_PROMPT_LEN) {
            setError(`Prompt is too long (max ${MAX_PROMPT_LEN} characters).`);
            return;
        }
        if (!settings.apiKey) {
            setError(`Add your ${settings.provider.name} API key in settings first.`);
            return;
        }

        setBusy(true);
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            const indexBlock = buildTechniqueIndexBlock(techniques);
            const wrappedUserPrompt =
                'Generate one Atomic Red Team test for the following request from an ' +
                'authorized security professional. Use only T-IDs from the provided ' +
                'index, or a TID you are highly confident exists in real MITRE ATT&CK. ' +
                'If the technique applies to multiple platforms with different commands, ' +
                'return one atomic_test entry per platform. Refuse only if the request ' +
                'falls under the refusal criteria in your instructions.\n\n' +
                'Request:\n' + trimmed;
            const payload = await settings.provider.generate({
                apiKey: settings.apiKey,
                model: settings.model,
                systemPrompt: SYSTEM_PROMPT,
                indexBlock,
                userPrompt: wrappedUserPrompt,
                signal: ctrl.signal,
            });

            if (payload?.action === 'refuse') {
                setRefusal(payload.reason || 'Request was declined.');
                return;
            }
            if (payload?.action !== 'generate' || !payload.test_data) {
                setError('Unexpected response. Try rephrasing your request.');
                return;
            }
            const v = validateGeneratedTest(payload.test_data, knownTids);
            setValidation(v);
            setResult(payload.test_data);
        } catch (e) {
            if (e.name !== 'AbortError') {
                setError(e.message || 'Generation failed.');
            }
        } finally {
            setBusy(false);
            abortRef.current = null;
        }
    };

    const cancel = () => {
        if (abortRef.current) abortRef.current.abort();
    };

    const tests = Array.isArray(result?.atomic_tests) ? result.atomic_tests : [];
    const activeTest = tests[activeIdx];
    const activeTestValidation = validation?.perTest?.[activeIdx];
    const topLevelErrors = validation?.errors || [];
    const topLevelWarnings = validation?.warnings || [];

    const apply = () => {
        if (!result) return;
        const shape = toAppFormShape(result, activeIdx);
        if (!shape) {
            setError('Could not map the generated test to the form.');
            return;
        }
        setInputs({ ...base, ...shape });
        setChanged(false);
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
        <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Generate atomic test with AI</span>
                <IconButton onClick={onOpenSettings} aria-label="AI settings" size="small">
                    <SettingsIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="info" variant="outlined">
                        Provider: <strong>{settings.provider.name}</strong> · Model: <strong>{settings.model}</strong>
                        {!settings.apiKey && ' · No API key set'}
                    </Alert>
                    <TextField
                        label="Describe the atomic test"
                        placeholder='e.g. "Create a Windows scheduled task that runs cmd.exe at logon."'
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        multiline
                        minRows={3}
                        maxRows={8}
                        fullWidth
                        autoFocus
                        disabled={busy}
                        inputProps={{ maxLength: MAX_PROMPT_LEN }}
                        helperText={`${prompt.length}/${MAX_PROMPT_LEN}`}
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                    {refusal && (
                        <Alert severity="info">
                            The model declined to generate this test: {refusal}
                        </Alert>
                    )}
                    {topLevelErrors.length > 0 && (
                        <Alert severity="error">
                            <Typography variant="subtitle2">Validation errors</Typography>
                            <ul style={{ marginTop: 4, marginBottom: 0 }}>
                                {topLevelErrors.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                        </Alert>
                    )}
                    {topLevelWarnings.length > 0 && (
                        <Alert severity="warning">
                            <ul style={{ marginTop: 0, marginBottom: 0 }}>
                                {topLevelWarnings.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                        </Alert>
                    )}
                    {result && tests.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                {result.attack_technique} — {result.display_name}
                                {tests.length > 1 && ` · ${tests.length} variants`}
                            </Typography>
                            {tests.length > 1 && (
                                <>
                                    <Tabs
                                        value={activeIdx}
                                        onChange={(_, v) => setActiveIdx(v)}
                                        variant="scrollable"
                                        scrollButtons="auto"
                                        sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
                                    >
                                        {tests.map((t, i) => (
                                            <Tab
                                                key={i}
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        <Typography variant="body2">{t.name || `Variant ${i + 1}`}</Typography>
                                                        {Array.isArray(t.supported_platforms) && t.supported_platforms.length > 0 && (
                                                            <Chip
                                                                size="small"
                                                                label={t.supported_platforms.join(', ')}
                                                                color="warning"
                                                                variant="outlined"
                                                                sx={{ height: 18, fontSize: 10 }}
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                            />
                                        ))}
                                    </Tabs>
                                    <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
                                        Multiple platform variants generated. The selected tab will be applied to the form.
                                    </Alert>
                                </>
                            )}
                            {activeTestValidation && activeTestValidation.errors.length > 0 && (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2">Errors in this variant</Typography>
                                    <ul style={{ marginTop: 4, marginBottom: 0 }}>
                                        {activeTestValidation.errors.map((m, i) => <li key={i}>{m}</li>)}
                                    </ul>
                                </Alert>
                            )}
                            {activeTestValidation && activeTestValidation.warnings.length > 0 && (
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                    <ul style={{ marginTop: 0, marginBottom: 0 }}>
                                        {activeTestValidation.warnings.map((m, i) => <li key={i}>{m}</li>)}
                                    </ul>
                                </Alert>
                            )}
                            <Box
                                component="pre"
                                sx={{
                                    p: 0,
                                    m: 0,
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    bgcolor: 'action.hover',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    maxHeight: 320,
                                    overflow: 'auto',
                                    whiteSpace: 'pre',
                                }}
                            >
                                {yamlBlocks ? (
                                    <>
                                        <Box component="span" sx={{ display: 'block', px: 2, pt: 2 }}>
                                            {yamlBlocks.headerYaml}
                                        </Box>
                                        {yamlBlocks.testYamls.map((y, i) => (
                                            <Box
                                                key={i}
                                                component="span"
                                                sx={(theme) => {
                                                    const active = i === activeIdx && yamlBlocks.testYamls.length > 1;
                                                    const dim = i !== activeIdx && yamlBlocks.testYamls.length > 1;
                                                    return {
                                                        display: 'block',
                                                        px: 2,
                                                        py: 0.25,
                                                        opacity: dim ? 0.42 : 1,
                                                        backgroundColor: active
                                                            ? (theme.palette.mode === 'dark'
                                                                ? 'rgba(255, 167, 38, 0.14)'
                                                                : 'rgba(255, 167, 38, 0.18)')
                                                            : 'transparent',
                                                        boxShadow: active
                                                            ? `inset 3px 0 0 0 ${theme.palette.warning.main}`
                                                            : 'none',
                                                        transition: 'opacity 150ms, background-color 150ms',
                                                    };
                                                }}
                                            >
                                                {y}
                                            </Box>
                                        ))}
                                        <Box component="span" sx={{ display: 'block', pb: 2 }} />
                                    </>
                                ) : (
                                    <Box component="span" sx={{ display: 'block', p: 2 }}>{fallbackYaml}</Box>
                                )}
                            </Box>
                        </Box>
                    )}
                    {busy && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2">Generating…</Typography>
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                {busy ? (
                    <Button color="warning" onClick={cancel}>Cancel request</Button>
                ) : (
                    <Button onClick={onClose}>Close</Button>
                )}
                <Button variant="outlined" onClick={generate} disabled={busy}>
                    Generate
                </Button>
                <Button variant="contained" onClick={apply} disabled={!canApply || busy}>
                    {tests.length > 1 ? 'Apply selected to form' : 'Apply to form'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
