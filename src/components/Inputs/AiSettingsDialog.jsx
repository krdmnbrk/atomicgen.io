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
import { PROVIDER_LIST } from '../../utils/llm';

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

    React.useEffect(() => {
        setDraftKey(apiKey);
    }, [apiKey, providerId, open]);

    const handleSave = () => {
        setApiKey(draftKey.trim());
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
                        onChange={(e) => setDraftKey(e.target.value)}
                        placeholder={provider.apiKeyHint}
                        type="password"
                        fullWidth
                        autoComplete="off"
                        helperText={
                            <>
                                Get a key:&nbsp;
                                <Link href={provider.apiKeyHelpUrl} target="_blank" rel="noopener">
                                    {provider.apiKeyHelpUrl}
                                </Link>
                            </>
                        }
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="warning" onClick={() => { clearKey(); setDraftKey(''); }}>
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
