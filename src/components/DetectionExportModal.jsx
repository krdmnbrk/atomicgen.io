import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RadarRoundedIcon from '@mui/icons-material/RadarRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import Editor from './Editor';
import useLlmSettings from '../hooks/useLlmSettings';
import { generateDetectionRules } from '../utils/llm/detectionRules';

function downloadString(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const FORMATS = [
    { id: 'sigma',  label: 'Sigma',  ext: 'yml', mode: 'yaml' },
    { id: 'splunk', label: 'Splunk', ext: 'spl', mode: 'sh'   },
];

export default function DetectionExportModal({ open, onClose, inputs, darkMode }) {
    const settings = useLlmSettings();
    const provider = settings.provider;
    const apiKey = settings.apiKey;
    const model = settings.model || provider?.defaultModel;

    const [tab, setTab] = React.useState(0);
    const [state, setState] = React.useState('idle'); // 'idle' | 'loading' | 'ready' | 'refused' | 'error'
    const [result, setResult] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [refusalReason, setRefusalReason] = React.useState(null);
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        // Reset on close — explainer-first when reopened.
        if (!open) {
            setState('idle');
            setResult(null);
            setError(null);
            setRefusalReason(null);
            setTab(0);
            setCopied(false);
        }
    }, [open]);

    React.useEffect(() => {
        setCopied(false);
    }, [tab]);

    const run = React.useCallback(async () => {
        if (!provider || !apiKey) {
            setState('error');
            setError('Configure your AI provider key first (settings).');
            return;
        }
        setState('loading');
        setError(null);
        setRefusalReason(null);
        setResult(null);
        try {
            const out = await generateDetectionRules({
                providerId: provider.id,
                apiKey,
                model,
                currentInputs: inputs,
            });
            if (out?.action === 'refuse') {
                setState('refused');
                setRefusalReason(out.reason || 'Model declined to generate rules.');
                return;
            }
            if (!out?.sigma || !out?.splunk) {
                setState('error');
                setError('Model returned no rules — try again.');
                return;
            }
            setResult(out);
            setState('ready');
        } catch (e) {
            setState('error');
            setError(e?.message || String(e));
        }
    }, [provider, apiKey, model, inputs]);

    const current = result
        ? { ...FORMATS[tab], content: tab === 0 ? result.sigma : result.splunk }
        : null;

    const handleCopy = async () => {
        if (!current) return;
        try {
            await navigator.clipboard.writeText(current.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* noop */
        }
    };

    const handleDownload = () => {
        if (!current) return;
        const baseName = (inputs.name || 'detection')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .toLowerCase();
        downloadString(`${baseName}.${current.ext}`, current.content);
    };

    const hasCommand = !!(
        inputs.executor &&
        (inputs.executor.command ||
            (inputs.executor.name === 'manual' && inputs.executor.steps))
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    pr: 1,
                    py: 1.5,
                    borderBottom: '1px solid var(--glass-stroke)',
                }}
            >
                <RadarRoundedIcon sx={{ color: 'primary.main' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                        Detection rules — Sigma + Splunk
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        AI-generated starter rules derived from your atomic test.
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2, minHeight: 400 }}>
                {!hasCommand && (
                    <Alert severity="info" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                        Add an attack command (or manual steps) in Execution before generating rules.
                    </Alert>
                )}

                {state === 'idle' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
                        <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.55 }}>
                            atomicgen.io will ask the configured AI provider to generate two detection rules
                            for the current test:
                        </Typography>
                        <Box
                            component="ul"
                            sx={{
                                m: 0,
                                pl: 2.5,
                                fontSize: 12.5,
                                color: 'text.secondary',
                                lineHeight: 1.7,
                                '& li::marker': { color: 'var(--accent)' },
                            }}
                        >
                            <li>
                                <Box component="strong" sx={{ color: 'text.primary' }}>Sigma rule</Box> —
                                vendor-neutral YAML; convert to most SIEMs via{' '}
                                <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                    sigconverter.io
                                </Box>{' '}
                                or pySigma.
                            </li>
                            <li>
                                <Box component="strong" sx={{ color: 'text.primary' }}>Splunk SPL</Box> —
                                Sysmon-aware search query (EID 1 for Windows process events, auditd /
                                Sysmon-for-Linux for Linux/macOS).
                            </li>
                            <li>
                                Selectors anchor on the <strong>actual</strong> image / cmdline / registry
                                paths from your test &mdash; not generic patterns.
                            </li>
                            <li>
                                Uses your <strong>BYOK</strong> {provider?.name || 'AI'} key — one API call,
                                billed to your account.
                            </li>
                        </Box>
                        {(!provider || !apiKey) && (
                            <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                                Configure your AI provider key first (settings) before generating rules.
                            </Alert>
                        )}
                    </Box>
                )}

                {state === 'loading' && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1.5,
                            py: 8,
                        }}
                    >
                        <CircularProgress size={20} />
                        <Typography fontSize={13} color="text.secondary">
                            Asking {provider?.name || 'AI'} for Sigma + Splunk rules…
                        </Typography>
                    </Box>
                )}

                {state === 'error' && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                {state === 'refused' && (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        Model declined: {refusalReason}
                    </Alert>
                )}

                {state === 'ready' && current && (
                    <>
                        <Alert
                            severity="warning"
                            variant="outlined"
                            icon={<AutoAwesomeRoundedIcon fontSize="small" />}
                            sx={{ borderRadius: 2, mb: 2 }}
                        >
                            <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 500 }}>
                                AI-generated &mdash; tune for your environment before deploying.
                            </Typography>
                            <Typography
                                component="div"
                                sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}
                            >
                                These rules may contain inaccuracies. Review selectors, indices, source-types,
                                and field names against your SIEM&rsquo;s schema. Test against known-bad and
                                known-good telemetry before promotion.
                            </Typography>
                        </Alert>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 1,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Tabs
                                value={tab}
                                onChange={(_, v) => setTab(v)}
                                sx={{ minHeight: 32, flex: 1 }}
                            >
                                {FORMATS.map((f) => (
                                    <Tab
                                        key={f.id}
                                        label={f.label}
                                        sx={{
                                            textTransform: 'none',
                                            minHeight: 32,
                                            fontSize: 13,
                                            py: 0.25,
                                        }}
                                    />
                                ))}
                            </Tabs>
                            {tab === 0 && result.sigma_logsource && (
                                <Chip
                                    size="small"
                                    label={`logsource: ${result.sigma_logsource}`}
                                    sx={{
                                        fontSize: 10.5,
                                        height: 20,
                                        '& .MuiChip-label': { px: 0.6 },
                                    }}
                                />
                            )}
                            {tab === 0 && result.sigma_level && (
                                <Chip
                                    size="small"
                                    label={`level: ${result.sigma_level}`}
                                    color={
                                        result.sigma_level === 'high' ||
                                        result.sigma_level === 'critical'
                                            ? 'warning'
                                            : 'default'
                                    }
                                    variant="outlined"
                                    sx={{
                                        fontSize: 10.5,
                                        height: 20,
                                        '& .MuiChip-label': { px: 0.6 },
                                    }}
                                />
                            )}
                        </Box>

                        <Editor
                            darkMode={darkMode}
                            name={`detection-${current.id}`}
                            value={current.content}
                            mode={current.mode}
                            readOnly
                            height="340px"
                            highlightActiveLine={false}
                        />
                    </>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: 2,
                    py: 1.5,
                    gap: 1,
                    borderTop: '1px solid var(--glass-stroke)',
                }}
            >
                {state === 'ready' ? (
                    <>
                        <Button
                            onClick={run}
                            startIcon={<ReplayRoundedIcon />}
                            sx={{ textTransform: 'none' }}
                        >
                            Re-roll
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                            <Button
                                onClick={handleCopy}
                                variant="outlined"
                                startIcon={
                                    copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />
                                }
                                sx={{ textTransform: 'none', borderRadius: 2 }}
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                        </Tooltip>
                        <Button
                            onClick={handleDownload}
                            variant="contained"
                            color="primary"
                            startIcon={<DownloadRoundedIcon />}
                            sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                            Download
                        </Button>
                    </>
                ) : (
                    <>
                        <Box sx={{ flex: 1 }} />
                        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                            Close
                        </Button>
                        <Button
                            onClick={run}
                            variant="contained"
                            color="primary"
                            disabled={!provider || !apiKey || !hasCommand || state === 'loading'}
                            startIcon={<AutoAwesomeRoundedIcon />}
                            sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                            {state === 'idle'
                                ? 'Generate rules'
                                : state === 'loading'
                                ? 'Generating…'
                                : 'Try again'}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
