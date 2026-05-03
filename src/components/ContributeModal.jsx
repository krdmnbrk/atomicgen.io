import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import {
    fetchExistingTechnique,
    mergeTestIntoExisting,
    newFileUrl,
    editFileUrl,
    newFileFallbackUrl,
    editFileFallbackUrl,
    browseFileUrl,
    prTitle,
    prBody,
} from '../utils/contribute';
import { inputsToAtomicTestObject } from '../utils/atomicYaml';

export default function ContributeModal({ open, onClose, inputs, formattedYaml, lintErrorCount }) {
    // 'detecting' | 'new' | 'existing' | 'error'
    const [state, setState] = React.useState('detecting');
    const [existing, setExisting] = React.useState(null);
    const [mergedYaml, setMergedYaml] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [copied, setCopied] = React.useState({ title: false, body: false, yaml: false });

    const tid = (inputs.attack_technique || '').trim().toUpperCase();
    const atomicTestObject = React.useMemo(
        () => (open ? inputsToAtomicTestObject(inputs) : null),
        [open, inputs]
    );

    React.useEffect(() => {
        if (!open) return undefined;
        if (!tid) {
            setState('error');
            setError('Set an ATT&CK technique (T####) first to use the contribute flow.');
            return undefined;
        }
        const ctrl = new AbortController();
        setState('detecting');
        setError(null);
        fetchExistingTechnique(tid, ctrl.signal)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                if (res === null) {
                    setExisting(null);
                    setMergedYaml(null);
                    setState('new');
                    return;
                }
                setExisting(res);
                try {
                    const merged = mergeTestIntoExisting(res, atomicTestObject);
                    setMergedYaml(merged);
                } catch (e) {
                    setError(e.message);
                    setState('error');
                    return;
                }
                setState('existing');
            })
            .catch((e) => {
                if (ctrl.signal.aborted) return;
                setError(e.message || 'Failed to check atomic-red-team.');
                setState('error');
            });
        return () => ctrl.abort();
    }, [open, tid, atomicTestObject]);

    const yamlForUrl = state === 'existing' ? mergedYaml : formattedYaml;
    const directUrl = !yamlForUrl
        ? null
        : state === 'new'
        ? newFileUrl(tid, yamlForUrl)
        : state === 'existing'
        ? editFileUrl(tid, yamlForUrl)
        : null;
    const fallbackUrl = !tid
        ? null
        : state === 'new'
        ? newFileFallbackUrl(tid)
        : state === 'existing'
        ? editFileFallbackUrl(tid)
        : null;
    const tooLarge = directUrl === null && fallbackUrl !== null && state !== 'detecting' && state !== 'error';

    const title = state === 'detecting' || state === 'error' ? '' : prTitle(tid, inputs.display_name, inputs.name);
    const body =
        state === 'detecting' || state === 'error'
            ? ''
            : prBody({
                  tid,
                  testName: inputs.name,
                  isNew: state === 'new',
                  executor: inputs.executor && inputs.executor.name,
                  platforms: (inputs.supported_platforms || []).join(', '),
                  guid: inputs.auto_generated_guid,
              });

    const copy = async (key, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied((c) => ({ ...c, [key]: true }));
            setTimeout(() => setCopied((c) => ({ ...c, [key]: false })), 2000);
        } catch {
            /* noop */
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                        Contribute to atomic-red-team
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        Opens a pre-filled fork on GitHub. No auth needed here — review and submit on GitHub.
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2 }}>
                {state === 'detecting' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                        <CircularProgress size={16} />
                        <Typography fontSize={13}>
                            Checking redcanaryco/atomic-red-team for {tid}…
                        </Typography>
                    </Box>
                )}

                {state === 'error' && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                {state !== 'detecting' && state !== 'error' && (
                    <>
                        {lintErrorCount > 0 && (
                            <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
                                {lintErrorCount} lint error{lintErrorCount === 1 ? '' : 's'} — fix these
                                before submitting to avoid PR review pushback.
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            <Chip
                                size="small"
                                label={
                                    state === 'new'
                                        ? `New technique → atomics/${tid}/`
                                        : `Append to atomics/${tid}/${tid}.yaml`
                                }
                                color={state === 'new' ? 'primary' : 'success'}
                                variant="outlined"
                            />
                            {state === 'existing' && (
                                <Chip
                                    size="small"
                                    component="a"
                                    href={browseFileUrl(tid)}
                                    target="_blank"
                                    label={`view existing — ${
                                        (existing && existing.parsed && existing.parsed.atomic_tests
                                            ? existing.parsed.atomic_tests.length
                                            : 0)
                                    } test(s)`}
                                    variant="outlined"
                                    clickable
                                />
                            )}
                        </Box>

                        {tooLarge && (
                            <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                                YAML is too large to pre-fill via URL. Use the fallback flow: copy the YAML,
                                open the fork editor, paste it in.
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                disabled={!directUrl && !fallbackUrl}
                                href={directUrl || fallbackUrl}
                                target="_blank"
                                startIcon={<GitHubIcon />}
                                endIcon={<OpenInNewRoundedIcon />}
                                sx={{ textTransform: 'none', borderRadius: 2 }}
                            >
                                {tooLarge
                                    ? 'Open fork editor (paste YAML manually)'
                                    : state === 'new'
                                    ? 'Create new file in fork'
                                    : 'Edit existing T-file in fork'}
                            </Button>
                            {tooLarge && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => copy('yaml', yamlForUrl || '')}
                                    startIcon={
                                        copied.yaml ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />
                                    }
                                    sx={{ textTransform: 'none', borderRadius: 2 }}
                                >
                                    {copied.yaml ? 'YAML copied — paste into fork editor' : 'Copy merged YAML'}
                                </Button>
                            )}
                        </Box>

                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
                            PR title & body — copy and paste when GitHub opens the PR form:
                        </Typography>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1,
                                mb: 1,
                                background: 'var(--glass-strong)',
                                border: '1px solid var(--glass-stroke)',
                                borderRadius: 1.5,
                            }}
                        >
                            <Typography
                                sx={{
                                    flex: 1,
                                    fontSize: 12,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    minWidth: 0,
                                }}
                            >
                                {title}
                            </Typography>
                            <Tooltip title={copied.title ? 'Copied!' : 'Copy title'}>
                                <IconButton size="small" onClick={() => copy('title', title)}>
                                    {copied.title ? (
                                        <CheckRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
                                    ) : (
                                        <ContentCopyRoundedIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box
                            sx={{
                                p: 1.5,
                                background: 'var(--glass-strong)',
                                border: '1px solid var(--glass-stroke)',
                                borderRadius: 1.5,
                                maxHeight: 220,
                                overflow: 'auto',
                                position: 'relative',
                            }}
                        >
                            <Tooltip title={copied.body ? 'Copied!' : 'Copy body'}>
                                <IconButton
                                    size="small"
                                    onClick={() => copy('body', body)}
                                    sx={{ position: 'absolute', top: 4, right: 4 }}
                                >
                                    {copied.body ? (
                                        <CheckRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
                                    ) : (
                                        <ContentCopyRoundedIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </Tooltip>
                            <Box
                                component="pre"
                                sx={{
                                    m: 0,
                                    fontSize: 11,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    whiteSpace: 'pre-wrap',
                                    color: 'text.primary',
                                }}
                            >
                                {body}
                            </Box>
                        </Box>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid var(--glass-stroke)' }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
