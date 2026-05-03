import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import OpenInBrowserRoundedIcon from '@mui/icons-material/OpenInBrowserRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { generateVariants } from '../utils/llm/variants';
import { mergeTechniqueAndTestIntoForm } from '../utils/aiResponseValidator';
import useLlmSettings from '../hooks/useLlmSettings';
import useLocalLibrary from '../hooks/useLocalLibrary';
import { useConfirm } from './ConfirmDialog';
import ModelBadge from './ModelBadge';

export default function VariantSuggestModal({ open, onClose, currentInputs, base, onLoadVariant, formIsModified }) {
    const settings = useLlmSettings();
    const { save: saveToLibrary } = useLocalLibrary();
    const confirm = useConfirm();
    const [state, setState] = React.useState('idle'); // 'idle' | 'loading' | 'ready' | 'refused' | 'error'
    const [variants, setVariants] = React.useState([]);
    const [error, setError] = React.useState(null);
    const [refusalReason, setRefusalReason] = React.useState(null);
    const [savedIds, setSavedIds] = React.useState({});

    const provider = settings.provider;
    const apiKey = settings.apiKey;
    const model = settings.model || provider?.defaultModel;

    const run = React.useCallback(async () => {
        if (!provider || !apiKey) {
            setState('error');
            setError('Configure your AI provider key first (settings).');
            return;
        }
        setState('loading');
        setError(null);
        setRefusalReason(null);
        setVariants([]);
        try {
            const result = await generateVariants({
                providerId: provider.id,
                apiKey,
                model,
                currentInputs,
            });
            if (result?.action === 'refuse') {
                setState('refused');
                setRefusalReason(result.reason || 'Model declined to generate variants.');
                return;
            }
            const list = Array.isArray(result?.variants) ? result.variants : [];
            if (list.length === 0) {
                setState('error');
                setError('Variant model returned an empty list. Try again or refine the source test.');
                return;
            }
            setVariants(list);
            setState('ready');
        } catch (e) {
            setState('error');
            setError(e?.message || String(e));
        }
    }, [provider, apiKey, model, currentInputs]);

    React.useEffect(() => {
        // No auto-run on open — show explainer first, let the user trigger
        // the AI call explicitly. Reset state when the modal closes.
        if (!open) {
            setState('idle');
            setVariants([]);
            setError(null);
            setRefusalReason(null);
            setSavedIds({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleLoad = async (variant, idx) => {
        if (formIsModified) {
            const ok = await confirm({
                title: 'Replace current test?',
                message: `Loading variant "${variant.name}" will overwrite the test you have in the form.`,
                confirmText: 'Load variant',
                cancelText: 'Keep current',
                severity: 'warning',
            });
            if (!ok) return;
        }
        const wrapper = {
            attack_technique: currentInputs?.attack_technique,
            display_name: currentInputs?.display_name,
        };
        const shape = mergeTechniqueAndTestIntoForm(wrapper, variant);
        if (!shape) return;
        onLoadVariant({ ...base, ...shape });
        onClose();
    };

    const handleSave = (variant, idx) => {
        const wrapper = {
            attack_technique: currentInputs?.attack_technique,
            display_name: currentInputs?.display_name,
        };
        const shape = mergeTechniqueAndTestIntoForm(wrapper, variant);
        if (!shape) return;
        const fullInputs = { ...base, ...shape };
        const name = `${variant.name} — ${variant.variant_kind || 'variant'}`;
        saveToLibrary(name, fullInputs);
        setSavedIds((s) => ({ ...s, [idx]: true }));
    };

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
                <CallSplitRoundedIcon sx={{ color: 'primary.main' }} />
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                        Variant brainstorm
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        Alternative implementations of the same ATT&amp;CK technique — load one or save all to your library.
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2, minHeight: 320 }}>
                {state === 'idle' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
                        <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.55 }}>
                            Variant brainstorm asks the configured AI provider to propose
                            <Box component="strong" sx={{ color: 'primary.main' }}>{' '}2&ndash;4 distinct alternative implementations{' '}</Box>
                            of the SAME ATT&amp;CK technique &mdash; useful for broader detection coverage.
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
                            <li>Variants vary on: alternate LOLBin / shell / obfuscation level / platform / parameters.</li>
                            <li>Each variant is a complete atomic test definition you can <em>load into the form</em> or <em>save to My Tests</em> as a separate entry.</li>
                            <li>Uses your <strong>BYOK</strong> {provider?.name || 'AI'} key &mdash; one API call, billed to your account.</li>
                            <li>Generation is non-deterministic &mdash; re-roll if the first batch isn&rsquo;t useful.</li>
                        </Box>
                        {(!provider || !apiKey) && (
                            <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                                Configure your AI provider key first (settings) before generating variants.
                            </Alert>
                        )}
                    </Box>
                )}
                {state === 'loading' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6 }}>
                        <CircularProgress size={20} />
                        <Typography fontSize={13} color="text.secondary">
                            Generating distinct variants…
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
                {state === 'ready' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {variants.map((v, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    p: 1.5,
                                    background: 'var(--glass-strong)',
                                    border: '1px solid var(--glass-stroke)',
                                    borderRadius: 2,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.primary' }}>
                                                {v.name}
                                            </Typography>
                                            {v.variant_kind && (
                                                <Chip
                                                    label={v.variant_kind}
                                                    size="small"
                                                    icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 12 }} />}
                                                    sx={{
                                                        background: 'var(--accent-soft)',
                                                        color: 'primary.main',
                                                        border: '1px solid rgba(255,92,57,0.30)',
                                                        fontSize: 10.5,
                                                        height: 20,
                                                        '& .MuiChip-label': { px: 0.6 },
                                                    }}
                                                />
                                            )}
                                            <Chip
                                                label={v.executor?.name || 'unspecified'}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: 10.5, height: 20, '& .MuiChip-label': { px: 0.6 } }}
                                            />
                                            {(v.supported_platforms || []).map((p) => (
                                                <Chip
                                                    key={p}
                                                    label={p}
                                                    size="small"
                                                    sx={{
                                                        fontSize: 10,
                                                        height: 18,
                                                        '& .MuiChip-label': { px: 0.6 },
                                                        background: 'transparent',
                                                        border: '1px solid var(--glass-stroke-strong)',
                                                        color: 'text.secondary',
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                        {v.description && (
                                            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                                                {v.description}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                                {v.executor?.command && (
                                    <Box
                                        sx={{
                                            mt: 0.5,
                                            background: 'var(--glass-inset)',
                                            border: '1px solid var(--glass-stroke)',
                                            borderRadius: 1,
                                            p: 1,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 11,
                                            color: 'text.primary',
                                            whiteSpace: 'pre-wrap',
                                            maxHeight: 180,
                                            overflow: 'auto',
                                        }}
                                    >
                                        {v.executor.command}
                                    </Box>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Tooltip title="Replace the current form with this variant">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<OpenInBrowserRoundedIcon />}
                                            onClick={() => handleLoad(v, idx)}
                                            sx={{ textTransform: 'none', borderRadius: 1.5 }}
                                        >
                                            Load into form
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Save this variant to My Tests library">
                                        <Button
                                            size="small"
                                            variant={savedIds[idx] ? 'contained' : 'outlined'}
                                            color={savedIds[idx] ? 'success' : 'primary'}
                                            startIcon={<SaveRoundedIcon />}
                                            onClick={() => handleSave(v, idx)}
                                            sx={{ textTransform: 'none', borderRadius: 1.5 }}
                                        >
                                            {savedIds[idx] ? 'Saved' : 'Save to library'}
                                        </Button>
                                    </Tooltip>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid var(--glass-stroke)' }}>
                {state === 'idle' || state === 'error' || state === 'refused' ? (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={run}
                        disabled={!provider || !apiKey}
                        startIcon={<AutoAwesomeRoundedIcon />}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        {state === 'idle' ? 'Generate variants' : 'Try again'}
                    </Button>
                ) : (
                    <Button
                        onClick={run}
                        disabled={state === 'loading'}
                        startIcon={<ReplayRoundedIcon />}
                        sx={{ textTransform: 'none' }}
                    >
                        Re-roll
                    </Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
