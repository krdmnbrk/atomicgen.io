import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const ConfirmContext = createContext(null);

const SEVERITY_META = {
    info: {
        color: 'info.main',
        Icon: InfoOutlinedIcon,
        button: 'primary',
    },
    warning: {
        color: 'warning.main',
        Icon: WarningAmberRoundedIcon,
        button: 'primary',
    },
    danger: {
        color: 'error.main',
        Icon: ErrorOutlineRoundedIcon,
        button: 'error',
    },
};

export function ConfirmProvider({ children }) {
    const [state, setState] = useState({ open: false });
    const resolveRef = useRef(null);
    const confirmBtnRef = useRef(null);

    const confirm = useCallback((opts) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({
                open: true,
                title: opts.title || 'Are you sure?',
                message: opts.message || '',
                confirmText: opts.confirmText || 'Confirm',
                cancelText: opts.cancelText || 'Cancel',
                severity: opts.severity || 'warning',
            });
        });
    }, []);

    const handleClose = (result) => {
        const r = resolveRef.current;
        resolveRef.current = null;
        setState((prev) => ({ ...prev, open: false }));
        if (r) r(result);
    };

    // Close on Esc, confirm on Enter (autofocus already handles Enter on the button, but explicit is fine)
    useEffect(() => {
        if (!state.open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') handleClose(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [state.open]);

    const meta = SEVERITY_META[state.severity] || SEVERITY_META.warning;
    const Icon = meta.Icon;

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog
                open={state.open}
                onClose={() => handleClose(false)}
                fullWidth
                maxWidth="xs"
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                            minWidth: { xs: '92vw', sm: 420 },
                            maxWidth: { xs: '92vw', sm: 460 },
                        },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        fontWeight: 600,
                        fontSize: 16,
                        pb: 1,
                    }}
                >
                    <Box
                        sx={{
                            width: 30,
                            height: 30,
                            borderRadius: 1.5,
                            display: 'grid',
                            placeItems: 'center',
                            background: state.severity === 'danger'
                                ? 'rgba(229, 72, 77, 0.15)'
                                : state.severity === 'info'
                                ? 'rgba(111, 169, 255, 0.15)'
                                : 'rgba(245, 183, 78, 0.15)',
                            color: meta.color,
                            flexShrink: 0,
                        }}
                    >
                        <Icon sx={{ fontSize: 18 }} />
                    </Box>
                    {state.title}
                </DialogTitle>
                <DialogContent sx={{ pt: 0 }}>
                    {typeof state.message === 'string' ? (
                        <DialogContentText sx={{ color: 'text.secondary', fontSize: 13.5, lineHeight: 1.5 }}>
                            {state.message}
                        </DialogContentText>
                    ) : (
                        <Box sx={{ color: 'text.secondary', fontSize: 13.5, lineHeight: 1.5 }}>{state.message}</Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.25, gap: 0.5 }}>
                    <Button
                        onClick={() => handleClose(false)}
                        sx={{
                            textTransform: 'none',
                            color: 'text.secondary',
                            borderRadius: 1.5,
                            px: 1.75,
                        }}
                    >
                        {state.cancelText}
                    </Button>
                    <Button
                        ref={confirmBtnRef}
                        autoFocus
                        onClick={() => handleClose(true)}
                        variant="contained"
                        color={meta.button}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 1.5,
                            fontWeight: 600,
                            px: 2,
                            ...(state.severity === 'warning' && {
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, var(--accent-2), var(--accent))',
                                },
                            }),
                        }}
                    >
                        {state.confirmText}
                    </Button>
                </DialogActions>
            </Dialog>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error('useConfirm must be used within a <ConfirmProvider>');
    }
    return ctx;
}
