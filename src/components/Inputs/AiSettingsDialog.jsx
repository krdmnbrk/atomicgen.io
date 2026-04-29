import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { PROVIDER_LIST } from '../../utils/llm';
import { useConfirm } from '../ConfirmDialog';

export default function AiSettingsDialog({
    open,
    onClose,
    providerId,
    setProviderId,
    apiKey,
    setApiKey,
    model,
    setModel,
    clearKey,
    provider,
}) {
    const [draftKey, setDraftKey] = React.useState(apiKey);
    const [testing, setTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState(null); // { ok: bool, message }
    const confirm = useConfirm();

    React.useEffect(() => {
        setDraftKey(apiKey);
        setTestResult(null);
    }, [apiKey, providerId, open]);

    const handleSave = () => {
        setApiKey(draftKey.trim());
        onClose();
    };

    const handleTestKey = async () => {
        const trimmed = draftKey.trim();
        if (!trimmed) {
            setTestResult({ ok: false, message: 'Enter an API key first.' });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            // Lightweight ping: send a 1-token request via the provider's generate path.
            // We catch any error and infer key validity from the failure mode.
            await provider.generate({
                apiKey: trimmed,
                model,
                systemPrompt: 'Respond with the tool call only.',
                indexBlock: '',
                userPrompt: 'ping',
                signal: undefined,
            });
            setTestResult({ ok: true, message: 'Key is valid — connection successful.' });
        } catch (e) {
            const msg = (e && e.message) || 'Unknown error';
            // Heuristic: 401/Invalid key → bad key; network/overload → key may still be fine
            if (/invalid|unauthor|401/i.test(msg)) {
                setTestResult({ ok: false, message: msg });
            } else if (e?.code === 'NETWORK_BLOCKED') {
                setTestResult({ ok: false, message: `Network blocked — ${msg}` });
            } else {
                // Reached the model / produced any response → key is valid
                setTestResult({ ok: true, message: 'Key reached the API successfully.' });
            }
        } finally {
            setTesting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
            PaperProps={{ sx: { mt: { xs: '8vh', sm: '20vh' }, mx: 2 } }}
        >
            <DialogTitle>AI provider settings</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="info" variant="outlined">
                        Your API key is stored only in this browser (localStorage) and used to call
                        the provider directly. Atomicgen has no backend; nothing is sent anywhere
                        else. Use a personal key on a trusted device.
                    </Alert>
                    <TextField
                        select
                        label="Provider"
                        value={providerId}
                        onChange={(e) => setProviderId(e.target.value)}
                        fullWidth
                    >
                        {PROVIDER_LIST.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                                {p.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        label="Model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        fullWidth
                    >
                        {provider.models.map((m) => (
                            <MenuItem key={m.id} value={m.id}>
                                {m.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label={`${provider.name} API key`}
                        value={draftKey}
                        onChange={(e) => { setDraftKey(e.target.value); setTestResult(null); }}
                        placeholder={provider.apiKeyHint}
                        type="password"
                        fullWidth
                        autoComplete="off"
                        helperText={
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                Get a key
                                <Link
                                    href={provider.apiKeyHelpUrl}
                                    target="_blank"
                                    rel="noopener"
                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                                >
                                    here →
                                </Link>
                            </Box>
                        }
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleTestKey}
                            disabled={!draftKey.trim() || testing}
                            startIcon={
                                testing ? (
                                    <CircularProgress size={14} sx={{ color: 'inherit' }} />
                                ) : testResult?.ok ? (
                                    <CheckRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                ) : testResult && !testResult.ok ? (
                                    <ErrorOutlineRoundedIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                ) : null
                            }
                            sx={{ textTransform: 'none', borderRadius: 1.5, flexShrink: 0 }}
                        >
                            {testing ? 'Testing…' : 'Test API key'}
                        </Button>
                        {testResult && (
                            <Box
                                sx={{
                                    fontSize: 12,
                                    color: testResult.ok ? 'success.main' : 'error.main',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                                title={testResult.message}
                            >
                                {testResult.message}
                            </Box>
                        )}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ '& .MuiButton-root': { textTransform: 'none' } }}>
                <Button
                    color="warning"
                    onClick={async () => {
                        const ok = await confirm({
                            title: 'Remove API key?',
                            message: `This will delete your ${provider.name} API key from this browser. You'll need to re-enter it the next time you use AI generation.`,
                            confirmText: 'Remove key',
                            cancelText: 'Cancel',
                            severity: 'danger',
                        });
                        if (ok) { clearKey(); setDraftKey(''); setTestResult(null); }
                    }}
                >
                    Clear key
                </Button>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
