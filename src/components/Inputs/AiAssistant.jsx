import React from 'react';
import yaml from 'js-yaml';
import Fuse from 'fuse.js';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import useAtomicIndex from '../../hooks/useAtomicIndex';
import useLlmSettings from '../../hooks/useLlmSettings';
import { useConfirm } from '../ConfirmDialog';
import { mergeTechniqueAndTestIntoForm } from '../../utils/aiResponseValidator';
import AiPromptDialog from './AiPromptDialog';
import AiSettingsDialog from './AiSettingsDialog';

const REPO_BASE = 'https://raw.githubusercontent.com/redcanaryco/atomic-red-team/master/atomics';
const techniqueYamlUrl = (tid) => `${REPO_BASE}/${tid}/${tid}.yaml`;
const MAX_SUGGESTIONS = 5;
const DEBOUNCE_MS = 200;

export default function AiAssistant({ base, setInputs, setChanged, changed, darkMode, setLoadedSource, query: queryProp, setQuery: setQueryProp }) {
    const [internalQuery, setInternalQuery] = React.useState('');
    const query = queryProp !== undefined ? queryProp : internalQuery;
    const setQuery = setQueryProp || setInternalQuery;
    const [debouncedQuery, setDebouncedQuery] = React.useState('');
    const [loadingTest, setLoadingTest] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [aiOpen, setAiOpen] = React.useState(false);
    const [settingsOpen, setSettingsOpen] = React.useState(false);

    const { data, loading: indexLoading, error: indexError } = useAtomicIndex();
    const settings = useLlmSettings();
    const confirm = useConfirm();

    React.useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [query]);

    const fuse = React.useMemo(() => {
        if (!data?.tests) return null;
        return new Fuse(data.tests, {
            keys: [
                { name: 'testName', weight: 0.5 },
                { name: 'techName', weight: 0.3 },
                { name: 'tid', weight: 0.1 },
                { name: 'tactic', weight: 0.05 },
                { name: 'exec', weight: 0.05 },
            ],
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 2,
        });
    }, [data]);

    const suggestions = React.useMemo(() => {
        if (!fuse || debouncedQuery.length < 2) return [];
        return fuse.search(debouncedQuery, { limit: MAX_SUGGESTIONS }).map((r) => r.item);
    }, [fuse, debouncedQuery]);

    const loadSuggestion = async (item) => {
        if (changed) {
            const ok = await confirm({
                title: 'Replace current test?',
                message: `Loading "${item.testName}" (${item.tid}) will overwrite the test you have in the form.`,
                confirmText: 'Load test',
                cancelText: 'Keep current',
                severity: 'warning',
            });
            if (!ok) return;
        }
        setError(null);
        setLoadingTest(true);
        try {
            const res = await fetch(techniqueYamlUrl(item.tid));
            if (!res.ok) throw new Error(`Failed to fetch ${item.tid} (HTTP ${res.status}).`);
            const text = await res.text();
            const trimmed = (text || '').trim();
            if (!trimmed) throw new Error('Repository returned an empty response.');
            if (/^\s*<(?:!doctype|html|head|body|meta|script|title)\b/i.test(trimmed)) {
                throw new Error(
                    'Repository returned HTML instead of YAML — your network or proxy is likely blocking raw.githubusercontent.com.'
                );
            }
            let parsed;
            try {
                parsed = yaml.load(text);
            } catch (yamlErr) {
                throw new Error(`Response was not valid YAML (${yamlErr.message || yamlErr}).`);
            }
            if (!parsed || typeof parsed !== 'object' || !parsed.attack_technique) {
                throw new Error('Response did not match the expected atomic-red-team schema.');
            }
            const tests = Array.isArray(parsed?.atomic_tests) ? parsed.atomic_tests : [];
            let test = tests.find((t) => t?.name === item.testName);
            if (!test) {
                const idx = parseInt(item.testNum, 10) - 1;
                if (Number.isFinite(idx) && idx >= 0 && idx < tests.length) test = tests[idx];
            }
            if (!test) throw new Error(`Could not locate test "${item.testName}" in ${item.tid}.`);
            const shape = mergeTechniqueAndTestIntoForm(parsed, test);
            if (shape) setInputs({ ...base, ...shape });
            if (setLoadedSource) setLoadedSource({ type: 'repo', tid: item.tid });
            setChanged(false);
            setQuery('');
        } catch (e) {
            console.error(e);
            setError(e.message || 'Failed to load suggestion.');
        } finally {
            setLoadingTest(false);
        }
    };

    const openAi = () => {
        setError(null);
        // Always open AI dialog — it renders an inline key prompt when key is missing.
        setAiOpen(true);
    };

    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            openAi();
        }
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Paper
                elevation={0}
                sx={{
                    background: 'var(--glass)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid var(--glass-stroke)',
                    borderRadius: 3,
                    boxShadow: 'var(--shadow-glow)',
                    p: { xs: 1, sm: 1.25 },
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 0.75, sm: 1.25 },
                }}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                        display: { xs: 'none', sm: 'grid' },
                        placeItems: 'center',
                        color: 'white',
                        boxShadow: '0 8px 24px -8px var(--accent), inset 0 1px 0 rgba(255,255,255,0.4)',
                        flexShrink: 0,
                    }}
                >
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />
                </Box>

                <Box
                    component="input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Describe a test, paste a procedure, or pick a technique…'
                    disabled={indexLoading || loadingTest}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'text.primary',
                        font: 'inherit',
                        fontSize: 16,
                        fontFamily: 'inherit',
                        px: 0,
                        py: 1,
                        '&::placeholder': { color: 'var(--text-faint)' },
                        '&:disabled': { opacity: 0.6 },
                    }}
                />

                {(indexLoading || loadingTest) && (
                    <CircularProgress size={18} sx={{ color: 'primary.main', mr: 0.5 }} />
                )}

                <IconButton
                    size="small"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="AI settings"
                    sx={{
                        width: 36,
                        height: 36,
                        border: '1px solid var(--glass-stroke)',
                        borderRadius: 2,
                        color: 'text.secondary',
                        '&:hover': { background: 'var(--glass-strong)', color: 'text.primary' },
                    }}
                >
                    <TuneRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <Box
                    component="button"
                    onClick={openAi}
                    disabled={loadingTest}
                    sx={{
                        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                        color: 'white',
                        border: 'none',
                        px: { xs: 1.5, sm: 2 },
                        py: 1.25,
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: 13,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        boxShadow: '0 8px 22px -8px var(--accent), inset 0 1px 0 rgba(255,255,255,0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        flexShrink: 0,
                        transition: 'transform 0.12s, box-shadow 0.12s, opacity 0.12s',
                        '&:hover:not(:disabled)': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 12px 28px -10px var(--accent), inset 0 1px 0 rgba(255,255,255,0.3)',
                        },
                        '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
                    }}
                >
                    Generate
                </Box>
            </Paper>

            {indexError && (
                <Alert severity="warning" sx={{ mt: 1.25, borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 600, mb: 0.25, fontSize: 13 }}>
                        Atomic-red-team index unavailable
                    </Typography>
                    <Typography sx={{ fontSize: 12.5 }}>
                        {indexError.message || 'Suggestions disabled.'}
                    </Typography>
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mt: 1.25, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {suggestions.length > 0 && (
                <Paper
                    elevation={0}
                    sx={{
                        mt: 1.25,
                        background: 'var(--glass)',
                        backdropFilter: 'blur(28px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                        border: '1px solid var(--glass-stroke)',
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-glow)',
                    }}
                >
                    <Box sx={{ px: 2, pt: 1.5, pb: 0.75 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Existing tests that may cover this
                        </Typography>
                    </Box>
                    <List dense disablePadding>
                        {suggestions.map((s, i) => (
                            <ListItem key={`${s.tid}-${s.testNum}-${i}`} disablePadding>
                                <ListItemButton
                                    onClick={() => loadSuggestion(s)}
                                    disabled={loadingTest}
                                    sx={{
                                        px: 2,
                                        py: 1.1,
                                        borderTop: '1px solid var(--glass-stroke)',
                                        '&:hover': { background: 'var(--glass-strong)' },
                                    }}
                                >
                                    <Chip
                                        size="small"
                                        label={s.tid}
                                        sx={{
                                            mr: 1.5,
                                            minWidth: 88,
                                            background: 'var(--accent-soft)',
                                            color: 'primary.main',
                                            border: '1px solid',
                                            borderColor: 'primary.main',
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 11,
                                            fontWeight: 500,
                                        }}
                                    />
                                    <ListItemText
                                        primary={s.testName}
                                        secondary={`${s.techName} · ${s.exec || 'unknown executor'}`}
                                        primaryTypographyProps={{ fontSize: 14 }}
                                        secondaryTypographyProps={{ fontSize: 12, color: 'var(--text-faint)' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Box
                        sx={{
                            px: 2,
                            py: 1,
                            borderTop: '1px solid var(--glass-stroke)',
                            background: 'var(--glass-inset)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            color: 'text.secondary',
                        }}
                    >
                        <span>
                            {suggestions.length} match{suggestions.length === 1 ? '' : 'es'}. Pick one or generate a new variant.
                        </span>
                        <Box
                            component="button"
                            onClick={openAi}
                            sx={{
                                background: 'transparent',
                                border: 'none',
                                color: 'primary.main',
                                fontFamily: 'inherit',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' },
                            }}
                        >
                            Generate with AI →
                        </Box>
                    </Box>
                </Paper>
            )}

            <AiPromptDialog
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                initialPrompt={query}
                base={base}
                setInputs={setInputs}
                setChanged={setChanged}
                techniques={data?.techniques || []}
                settings={settings}
                onOpenSettings={() => setSettingsOpen(true)}
                setLoadedSource={setLoadedSource}
            />
            <AiSettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                providerId={settings.providerId}
                setProviderId={settings.setProviderId}
                apiKey={settings.apiKey}
                setApiKey={settings.setApiKey}
                model={settings.model}
                setModel={settings.setModel}
                clearKey={settings.clearKey}
                provider={settings.provider}
            />
        </Box>
    );
}
