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
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RadarRoundedIcon from '@mui/icons-material/RadarRounded';
import Editor from './Editor';
import { renderAll } from '../utils/detectionStubs';

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
    const [tab, setTab] = React.useState(0);
    const [copied, setCopied] = React.useState(false);

    const stubs = React.useMemo(() => (open ? renderAll(inputs) : []), [open, inputs]);
    const current = stubs[tab];

    React.useEffect(() => {
        setCopied(false);
    }, [tab]);

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

    const hasCommand = !!(inputs.executor && inputs.executor.command);

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
                        Detection rule stubs
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        Editable starter rules derived from your attack command. Tune selectors before shipping.
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <Box sx={{ px: 2, borderBottom: '1px solid var(--glass-stroke)' }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ minHeight: 40 }}
                >
                    {stubs.map((s) => (
                        <Tab
                            key={s.id}
                            label={s.label}
                            sx={{ textTransform: 'none', minHeight: 40, fontSize: 13 }}
                        />
                    ))}
                </Tabs>
            </Box>

            <DialogContent sx={{ p: 2, minHeight: 380 }}>
                {!hasCommand && (
                    <Alert severity="info" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                        Stubs are derived from the attack command. Add a command in Execution to get more
                        useful selectors.
                    </Alert>
                )}
                {current && (
                    <Editor
                        darkMode={darkMode}
                        name={`detection-${current.id}`}
                        value={current.content}
                        mode={current.language}
                        readOnly
                        height="380px"
                        highlightActiveLine={false}
                    />
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
                <Typography sx={{ flex: 1, fontSize: 11, color: 'var(--text-faint)' }}>
                    Tip: Sigma converts to most SIEMs via{' '}
                    <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        sigconverter.io
                    </Box>
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                    <Button
                        onClick={handleCopy}
                        variant="outlined"
                        startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
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
            </DialogActions>
        </Dialog>
    );
}
