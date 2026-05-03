import React from 'react';
import yaml from 'js-yaml';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RadarRoundedIcon from '@mui/icons-material/RadarRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import Editor from './Editor';
import ModelBadge from './ModelBadge';
import useLlmSettings from '../hooks/useLlmSettings';
import { generateSigmaRule, quickValidateSigma } from '../utils/llm/detectionRules';
import { buildSigconverterUrl, SIGCONVERTER_TARGETS } from '../utils/sigconverter';

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

export default function DetectionExportModal({ open, onClose, inputs, darkMode }) {
    const settings = useLlmSettings();
    const provider = settings.provider;
    const apiKey = settings.apiKey;
    const model = settings.model || provider?.defaultModel;

    const [state, setState] = React.useState('idle'); // 'idle' | 'loading' | 'ready' | 'refused' | 'error'
    const [result, setResult] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [refusalReason, setRefusalReason] = React.useState(null);
    const [copied, setCopied] = React.useState(false);
    const [convertAnchor, setConvertAnchor] = React.useState(null);

    React.useEffect(() => {
        if (!open) {
            setState('idle');
            setResult(null);
            setError(null);
            setRefusalReason(null);
            setCopied(false);
        }
    }, [open]);

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
            const out = await generateSigmaRule({
                providerId: provider.id,
                apiKey,
                model,
                currentInputs: inputs,
            });
            if (out?.action === 'refuse') {
                setState('refused');
                setRefusalReason(out.reason || 'Model declined to generate the rule.');
                return;
            }
            if (!out?.sigma) {
                setState('error');
                setError('Model returned no rule — try again.');
                return;
            }
            setResult(out);
            setState('ready');
        } catch (e) {
            setState('error');
            setError(e?.message || String(e));
        }
    }, [provider, apiKey, model, inputs]);

    const validation = React.useMemo(
        () => (result?.sigma ? quickValidateSigma(result.sigma, yaml) : null),
        [result]
    );

    const handleCopy = async () => {
        if (!result?.sigma) return;
        try {
            await navigator.clipboard.writeText(result.sigma);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* noop */
        }
    };

    const handleDownload = () => {
        if (!result?.sigma) return;
        const baseName = (inputs.name || 'detection')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .toLowerCase();
        downloadString(`${baseName}.yml`, result.sigma);
    };

    const openConvertTarget = (target) => {
        if (!result?.sigma) return;
        const url = buildSigconverterUrl(result.sigma, target.backend, target.format);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        setConvertAnchor(null);
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
                        Detection rule — Sigma
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        AI-generated from your atomic test. Convert to any SIEM via sigconverter.io.
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2, minHeight: 400 }}>
                {!hasCommand && (
                    <Alert severity="info" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                        Add an attack command (or manual steps) in Execution before generating the rule.
                    </Alert>
                )}

                {state === 'idle' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
                        <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.55 }}>
                            atomicgen.io will ask the configured AI provider to generate a Sigma rule for the
                            current test, then build a one-click link to{' '}
                            <Box component="strong" sx={{ color: 'primary.main' }}>sigconverter.io</Box>{' '}
                            so you can convert it to any SIEM (Splunk · Sentinel · Elastic · QRadar · …) in
                            the browser.
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
                                <Box component="strong" sx={{ color: 'text.primary' }}>Sigma</Box> — vendor-neutral YAML
                                with proper logsource taxonomy, anchored selectors, real falsepositives,
                                and severity.
                            </li>
                            <li>
                                Selectors anchor on the <strong>actual</strong> image / cmdline / registry paths
                                from your test &mdash; not generic patterns.
                            </li>
                            <li>
                                Validates locally with js-yaml + a Sigma spec sanity check before showing.
                            </li>
                            <li>
                                Uses your <strong>BYOK</strong> {provider?.name || 'AI'} key — one API call,
                                billed to your account.
                            </li>
                        </Box>
                        {(!provider || !apiKey) && (
                            <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                                Configure your AI provider key first (settings) before generating.
                            </Alert>
                        )}
                    </Box>
                )}

                {state === 'loading' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 8 }}>
                        <CircularProgress size={20} />
                        <Typography fontSize={13} color="text.secondary">
                            Generating a Sigma rule…
                        </Typography>
                        <ModelBadge providerName={provider?.name} model={model} sx={{ mt: 0.5 }} />
                    </Box>
                )}

                {state === 'error' && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
                )}

                {state === 'refused' && (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        Model declined: {refusalReason}
                    </Alert>
                )}

                {state === 'ready' && result?.sigma && (
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
                            <Typography component="div" sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                                Review selectors, field names, and falsepositives against your SIEM&rsquo;s schema.
                                Test against known-bad and known-good telemetry before promotion.
                            </Typography>
                        </Alert>

                        {validation && validation.issues.length > 0 && (
                            <Alert severity="error" variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>
                                    Sigma sanity check found issues:
                                </Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2, fontSize: 12 }}>
                                    {validation.issues.map((iss, i) => (
                                        <li key={i}>{iss}</li>
                                    ))}
                                </Box>
                                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                                    Re-roll, or fix manually before converting.
                                </Typography>
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            {result.sigma_logsource && (
                                <Chip
                                    size="small"
                                    label={`logsource: ${result.sigma_logsource}`}
                                    sx={{ fontSize: 10.5, height: 20, '& .MuiChip-label': { px: 0.6 } }}
                                />
                            )}
                            {result.sigma_level && (
                                <Chip
                                    size="small"
                                    label={`level: ${result.sigma_level}`}
                                    color={result.sigma_level === 'high' || result.sigma_level === 'critical' ? 'warning' : 'default'}
                                    variant="outlined"
                                    sx={{ fontSize: 10.5, height: 20, '& .MuiChip-label': { px: 0.6 } }}
                                />
                            )}
                            {validation && validation.ok && (
                                <Chip
                                    size="small"
                                    icon={<CheckRoundedIcon sx={{ fontSize: 12 }} />}
                                    label="Sigma sanity check passed"
                                    color="success"
                                    variant="outlined"
                                    sx={{ fontSize: 10.5, height: 20, '& .MuiChip-label': { px: 0.6 } }}
                                />
                            )}
                        </Box>

                        <Editor
                            darkMode={darkMode}
                            name="detection-sigma"
                            value={result.sigma}
                            mode="yaml"
                            readOnly
                            height="320px"
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
                    flexWrap: 'wrap',
                }}
            >
                {state === 'ready' && result?.sigma ? (
                    <>
                        <Button onClick={run} startIcon={<ReplayRoundedIcon />} sx={{ textTransform: 'none' }}>
                            Re-roll
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title={copied ? 'Copied!' : 'Copy Sigma YAML'}>
                            <Button
                                onClick={handleCopy}
                                variant="outlined"
                                startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
                                sx={{ textTransform: 'none', borderRadius: 2 }}
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                        </Tooltip>
                        <Tooltip title="Download as .yml">
                            <Button
                                onClick={handleDownload}
                                variant="outlined"
                                startIcon={<DownloadRoundedIcon />}
                                sx={{ textTransform: 'none', borderRadius: 2 }}
                            >
                                Download
                            </Button>
                        </Tooltip>
                        <Tooltip title="Convert to your SIEM via sigconverter.io">
                            <span>
                                <Button
                                    onClick={(e) => setConvertAnchor(e.currentTarget)}
                                    disabled={!result?.sigma}
                                    variant="contained"
                                    color="primary"
                                    startIcon={<OpenInNewRoundedIcon />}
                                    endIcon={<KeyboardArrowDownRoundedIcon />}
                                    sx={{ textTransform: 'none', borderRadius: 2 }}
                                >
                                    Convert to…
                                </Button>
                            </span>
                        </Tooltip>
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
                                ? 'Generate rule'
                                : state === 'loading'
                                ? 'Generating…'
                                : 'Try again'}
                        </Button>
                    </>
                )}
            </DialogActions>

            {/* Convert-to menu — vendor-grouped sigconverter.io targets */}
            <Menu
                anchorEl={convertAnchor}
                open={Boolean(convertAnchor)}
                onClose={() => setConvertAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            mb: 0.75,
                            minWidth: 320,
                            maxHeight: '70vh',
                        },
                    },
                }}
            >
                {SIGCONVERTER_TARGETS.map((row, idx) => {
                    if (row.section) {
                        return (
                            <Box
                                key={`s-${idx}`}
                                sx={{
                                    px: 1.75,
                                    pt: idx === 0 ? 0.75 : 1.25,
                                    pb: 0.4,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    letterSpacing: '0.10em',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-faint)',
                                    pointerEvents: 'none',
                                }}
                            >
                                {row.section}
                            </Box>
                        );
                    }
                    const isGeneric = !row.backend;
                    return (
                        <MenuItem
                            key={`t-${idx}`}
                            onClick={() => openConvertTarget(row)}
                            sx={{
                                py: 0.6,
                                '&:hover': { background: 'var(--accent-soft)' },
                            }}
                        >
                            <ListItemText
                                primary={row.label}
                                primaryTypographyProps={{ fontSize: 13 }}
                            />
                            {!isGeneric && (
                                <Box
                                    component="span"
                                    sx={{
                                        ml: 2,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 10,
                                        color: 'var(--text-faint)',
                                    }}
                                >
                                    {row.backend}
                                    {row.format && row.format !== 'default' ? ` · ${row.format}` : ''}
                                </Box>
                            )}
                            <OpenInNewRoundedIcon sx={{ fontSize: 12, ml: 1, color: 'var(--text-faint)', opacity: 0.7 }} />
                        </MenuItem>
                    );
                })}
            </Menu>
        </Dialog>
    );
}
