import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import useAtomicIndex from '../hooks/useAtomicIndex';
import useLocalLibrary from '../hooks/useLocalLibrary';

const TACTIC_ORDER = [
    'reconnaissance',
    'resource-development',
    'initial-access',
    'execution',
    'persistence',
    'privilege-escalation',
    'defense-evasion',
    'credential-access',
    'discovery',
    'lateral-movement',
    'collection',
    'command-and-control',
    'exfiltration',
    'impact',
];

const TACTIC_LABELS = {
    'reconnaissance': 'Recon',
    'resource-development': 'Resource Dev.',
    'initial-access': 'Initial Access',
    'execution': 'Execution',
    'persistence': 'Persistence',
    'privilege-escalation': 'Priv. Esc.',
    'defense-evasion': 'Def. Evasion',
    'credential-access': 'Cred. Access',
    'discovery': 'Discovery',
    'lateral-movement': 'Lat. Movement',
    'collection': 'Collection',
    'command-and-control': 'C2',
    'exfiltration': 'Exfil',
    'impact': 'Impact',
};

export default function CoverageHeatmap({ open, onClose, currentInputs }) {
    const { data, loading } = useAtomicIndex();
    const { items: libraryItems } = useLocalLibrary();

    // Per-TID stats: AT corpus test count + user saved count + current-form flag.
    const tidStats = React.useMemo(() => {
        const out = new Map();
        const ensure = (tid) => {
            if (!out.has(tid)) {
                out.set(tid, { tid, name: '', atCount: 0, userCount: 0, isCurrent: false });
            }
            return out.get(tid);
        };
        if (data?.tests) {
            for (const t of data.tests) {
                if (!t.tid) continue;
                const e = ensure(t.tid);
                e.atCount += 1;
                if (t.techName && !e.name) e.name = t.techName;
            }
        }
        for (const item of libraryItems) {
            const tid = item.inputs?.attack_technique;
            if (!tid) continue;
            ensure(tid).userCount += 1;
        }
        if (currentInputs?.attack_technique) {
            ensure(currentInputs.attack_technique).isCurrent = true;
        }
        return out;
    }, [data, libraryItems, currentInputs]);

    // Group by tactic (using first-seen tactic per TID from the index).
    const byTactic = React.useMemo(() => {
        if (!data?.tests) return [];
        const tacticForTid = new Map();
        for (const t of data.tests) {
            if (!t.tid || !t.tactic) continue;
            if (!tacticForTid.has(t.tid)) tacticForTid.set(t.tid, t.tactic);
        }
        const map = new Map();
        for (const tid of tidStats.keys()) {
            const tactic = tacticForTid.get(tid) || 'unknown';
            if (!map.has(tactic)) map.set(tactic, []);
            map.get(tactic).push(tidStats.get(tid));
        }
        for (const arr of map.values()) {
            arr.sort((a, b) =>
                a.tid.localeCompare(b.tid, undefined, { numeric: true })
            );
        }
        return TACTIC_ORDER.filter((t) => map.has(t)).map((t) => ({
            tactic: t,
            label: TACTIC_LABELS[t] || t,
            techs: map.get(t),
        }));
    }, [data, tidStats]);

    const totals = React.useMemo(() => {
        let userTids = 0;
        let totalTids = tidStats.size;
        for (const t of tidStats.values()) {
            if (t.userCount > 0 || t.isCurrent) userTids++;
        }
        return { userTids, totalTids };
    }, [tidStats]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    py: 1.5,
                    borderBottom: '1px solid var(--glass-stroke)',
                }}
            >
                <GridViewRoundedIcon sx={{ color: 'primary.main' }} />
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                        Coverage heatmap
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        Techniques you've authored vs. atomic-red-team's catalog ·{' '}
                        <Box component="strong" sx={{ color: 'primary.main' }}>
                            {totals.userTids}
                        </Box>{' '}
                        / {totals.totalTids} techniques covered by you
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 1, height: '70vh', overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
                        <CircularProgress size={16} />
                        <Typography fontSize={13} color="text.secondary">
                            Loading atomic-red-team index…
                        </Typography>
                    </Box>
                ) : byTactic.length === 0 ? (
                    <Typography sx={{ p: 2, color: 'text.secondary' }}>
                        No data — atomic-red-team index could not be loaded.
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${byTactic.length}, minmax(120px, 1fr))`,
                            gap: 0.5,
                            height: '100%',
                            overflowX: 'auto',
                        }}
                    >
                        {byTactic.map(({ tactic, label, techs }) => {
                            const userInTactic = techs.filter(
                                (t) => t.userCount > 0 || t.isCurrent
                            ).length;
                            return (
                                <Box
                                    key={tactic}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.5,
                                        minWidth: 0,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: 'text.secondary',
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            px: 0.75,
                                            py: 0.5,
                                            background: 'var(--glass-strong)',
                                            border: '1px solid var(--glass-stroke)',
                                            borderRadius: 1,
                                            textAlign: 'center',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 0.5,
                                        }}
                                    >
                                        <Box
                                            component="span"
                                            sx={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {label}
                                        </Box>
                                        <Box
                                            component="span"
                                            sx={{
                                                color: userInTactic > 0 ? 'primary.main' : 'var(--text-faint)',
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10,
                                            }}
                                        >
                                            {userInTactic}/{techs.length}
                                        </Box>
                                    </Box>
                                    <Box
                                        sx={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.25,
                                        }}
                                    >
                                        {techs.map((t) => {
                                            const hasUser = t.userCount > 0 || t.isCurrent;
                                            const bg = hasUser
                                                ? t.isCurrent
                                                    ? 'rgba(255,92,57,0.32)'
                                                    : 'rgba(255,92,57,0.18)'
                                                : 'rgba(255,255,255,0.03)';
                                            const border = hasUser
                                                ? 'rgba(255,92,57,0.50)'
                                                : 'var(--glass-stroke)';
                                            const color = hasUser
                                                ? 'primary.main'
                                                : 'text.secondary';
                                            return (
                                                <Tooltip
                                                    key={t.tid}
                                                    title={
                                                        <Box>
                                                            <Box sx={{ fontWeight: 600 }}>
                                                                {t.tid} — {t.name || 'technique'}
                                                            </Box>
                                                            <Box sx={{ fontSize: 11 }}>
                                                                AT corpus: {t.atCount} test
                                                                {t.atCount === 1 ? '' : 's'}
                                                            </Box>
                                                            <Box sx={{ fontSize: 11 }}>
                                                                Your library: {t.userCount} test
                                                                {t.userCount === 1 ? '' : 's'}
                                                                {t.isCurrent ? ' (+ current form)' : ''}
                                                            </Box>
                                                        </Box>
                                                    }
                                                >
                                                    <Box
                                                        sx={{
                                                            px: 0.5,
                                                            py: 0.4,
                                                            background: bg,
                                                            border: '1px solid',
                                                            borderColor: border,
                                                            borderRadius: 0.75,
                                                            fontFamily: "'JetBrains Mono', monospace",
                                                            fontSize: 10.5,
                                                            color,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {t.tid}
                                                        </Box>
                                                        {t.userCount > 1 && (
                                                            <Box
                                                                component="span"
                                                                sx={{
                                                                    fontSize: 9,
                                                                    color: 'primary.main',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                ×{t.userCount}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </Tooltip>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: 2,
                    py: 1.5,
                    borderTop: '1px solid var(--glass-stroke)',
                    gap: 1.5,
                    flexWrap: 'wrap',
                }}
            >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 0.5,
                                background: 'rgba(255,92,57,0.32)',
                                border: '1px solid rgba(255,92,57,0.50)',
                            }}
                        />
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            current form
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 0.5,
                                background: 'rgba(255,92,57,0.18)',
                                border: '1px solid rgba(255,92,57,0.50)',
                            }}
                        />
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            in your library
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 0.5,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-stroke)',
                            }}
                        />
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            AT corpus only
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
