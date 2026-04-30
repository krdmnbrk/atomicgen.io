import React from 'react';
import yaml from 'js-yaml';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import UploadedAtomicSelection from './UploadedAtomicSelection';
import useAtomicIndex from '../../hooks/useAtomicIndex';
import { useConfirm } from '../ConfirmDialog';

const REPO_BASE = 'https://raw.githubusercontent.com/redcanaryco/atomic-red-team/master/atomics';
const techniqueYamlUrl = (tid) => `${REPO_BASE}/${tid}/${tid}.yaml`;

const TACTIC_META = {
    'reconnaissance':         { label: 'Reconnaissance',          color: '#6FF1A1' },
    'resource-development':   { label: 'Resource Development',    color: '#DEB6FF' },
    'initial-access':         { label: 'Initial Access',          color: '#6FA9FF' },
    'execution':              { label: 'Execution',               color: '#FF5C39' },
    'persistence':            { label: 'Persistence',             color: '#C28FFF' },
    'privilege-escalation':   { label: 'Privilege Escalation',    color: '#FFB347' },
    'defense-evasion':        { label: 'Defense Evasion',         color: '#4DDD96' },
    'credential-access':      { label: 'Credential Access',       color: '#F45C7B' },
    'discovery':              { label: 'Discovery',               color: '#50D5E0' },
    'lateral-movement':       { label: 'Lateral Movement',        color: '#B4D85A' },
    'collection':             { label: 'Collection',              color: '#FF8AC1' },
    'command-and-control':    { label: 'Command and Control',     color: '#A0A0A0' },
    'exfiltration':           { label: 'Exfiltration',            color: '#E5C07B' },
    'impact':                 { label: 'Impact',                  color: '#D85959' },
};
const TACTIC_ORDER = Object.keys(TACTIC_META);

export default function RepoLoaderButton({
    inputButtonErrors,
    setInputButtonErrors,
    setChanged,
    changed,
    base,
    darkMode,
    setInputs,
    setLoadedSource,
}) {
    const [open, setOpen] = React.useState(false);
    const [loadingYaml, setLoadingYaml] = React.useState(false);
    const [selectionOpen, setSelectionOpen] = React.useState(false);
    const [filter, setFilter] = React.useState('');
    const [activeTactic, setActiveTactic] = React.useState(null);

    // technique-pick → atomic-test selection state
    const [atomicNames, setAtomicNames] = React.useState([]);
    const [techniqueName, setTechniqueName] = React.useState(null);
    const [techniqueId, setTechniqueId] = React.useState(null);
    const [fileContent, setFileContent] = React.useState(null);

    const { data, loading: indexLoading, error } = useAtomicIndex();
    const confirm = useConfirm();

    // Group tests by tactic → technique → count. Also keep per-technique
    // test-name list so search can match atomic-test names, not just TIDs.
    const tacticGroups = React.useMemo(() => {
        if (!data?.tests) return [];
        const byTactic = new Map();
        for (const t of data.tests) {
            if (!t.tactic || !t.tid) continue;
            if (!byTactic.has(t.tactic)) byTactic.set(t.tactic, new Map());
            const techs = byTactic.get(t.tactic);
            if (!techs.has(t.tid)) {
                techs.set(t.tid, {
                    id: t.tid,
                    name: t.techName || t.tid,
                    testCount: 0,
                    executors: new Set(),
                    testNames: [],
                });
            }
            const tech = techs.get(t.tid);
            tech.testCount += 1;
            if (t.exec) tech.executors.add(t.exec);
            if (t.testName) tech.testNames.push(t.testName);
        }

        const tacticIds = [
            ...TACTIC_ORDER.filter((id) => byTactic.has(id)),
            ...Array.from(byTactic.keys()).filter((id) => !TACTIC_ORDER.includes(id)),
        ];
        return tacticIds.map((id) => {
            const techs = Array.from(byTactic.get(id).values()).sort((a, b) =>
                a.id.localeCompare(b.id, undefined, { numeric: true })
            );
            return {
                id,
                label: TACTIC_META[id]?.label || id,
                color: TACTIC_META[id]?.color || '#A0A0A0',
                techniques: techs,
                count: techs.length,
            };
        });
    }, [data]);

    // Auto-pick the first tactic once data lands.
    React.useEffect(() => {
        if (!activeTactic && tacticGroups.length) setActiveTactic(tacticGroups[0].id);
    }, [tacticGroups, activeTactic]);

    // Visible techniques: filter overrides tactic when present.
    // Filter matches against TID, technique name, and any atomic-test name.
    const visibleTechniques = React.useMemo(() => {
        if (!tacticGroups.length) return [];
        const q = filter.trim().toLowerCase();
        if (q) {
            const seen = new Set();
            const out = [];
            for (const group of tacticGroups) {
                for (const tech of group.techniques) {
                    if (seen.has(tech.id)) continue;
                    const tidHit = tech.id.toLowerCase().includes(q);
                    const nameHit = tech.name.toLowerCase().includes(q);
                    const testHits = (tech.testNames || []).filter((tn) =>
                        tn && tn.toLowerCase().includes(q)
                    );
                    if (tidHit || nameHit || testHits.length) {
                        seen.add(tech.id);
                        out.push({
                            ...tech,
                            tactic: group.id,
                            tacticLabel: group.label,
                            tacticColor: group.color,
                            testHits: tidHit || nameHit ? [] : testHits.slice(0, 2),
                        });
                    }
                }
            }
            return out;
        }
        const group = tacticGroups.find((g) => g.id === activeTactic);
        if (!group) return [];
        return group.techniques.map((t) => ({
            ...t,
            tactic: group.id,
            tacticLabel: group.label,
            tacticColor: group.color,
            testHits: [],
        }));
    }, [tacticGroups, activeTactic, filter]);

    const totalTests = React.useMemo(() => {
        return tacticGroups.reduce(
            (sum, g) => sum + g.techniques.reduce((s, t) => s + t.testCount, 0),
            0
        );
    }, [tacticGroups]);

    const handleOpen = async () => {
        if (changed) {
            const ok = await confirm({
                title: 'Replace current test?',
                message: 'Loading a test from atomic-red-team will overwrite the test you have in the form.',
                confirmText: 'Browse repo',
                cancelText: 'Keep current',
                severity: 'warning',
            });
            if (!ok) return;
        }
        setInputButtonErrors([]);
        setOpen(true);
    };

    const handleClose = () => {
        if (loadingYaml) return;
        setOpen(false);
    };

    const handleTechniquePick = async (tech) => {
        setLoadingYaml(true);
        try {
            const res = await fetch(techniqueYamlUrl(tech.id));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            // Detect proxy / captive-portal interception that returns HTML
            // with HTTP 200 — yaml.load would otherwise silently produce junk.
            const trimmed = (text || '').trim();
            if (!trimmed) throw new Error('Empty response from repository.');
            if (/^\s*<(?:!doctype|html|head|body|meta|script|title)\b/i.test(trimmed)) {
                throw new Error(
                    'The repository returned HTML instead of YAML — likely your network or proxy is blocking raw.githubusercontent.com.'
                );
            }
            let parsed;
            try {
                parsed = yaml.load(text);
            } catch (yamlErr) {
                throw new Error(`Response was not valid YAML (${yamlErr.message || yamlErr}).`);
            }
            // Real atomic-red-team YAML must have these keys.
            if (!parsed || typeof parsed !== 'object' || !parsed.attack_technique || !Array.isArray(parsed.atomic_tests)) {
                throw new Error('Response did not match the expected atomic-red-team schema.');
            }
            if (parsed.atomic_tests.length === 0) {
                setInputButtonErrors([`No atomic tests found in ${tech.id}.`]);
                return;
            }
            setFileContent(parsed);
            setAtomicNames(parsed.atomic_tests.map((t) => t.name));
            setTechniqueName(parsed.display_name);
            setTechniqueId(parsed.attack_technique);
            setOpen(false);
            setSelectionOpen(true);
        } catch (e) {
            console.error('Failed to load technique YAML', e);
            const detail = e?.message || 'Unknown error';
            setInputButtonErrors([`Failed to load ${tech.id} — ${detail}`]);
        } finally {
            setLoadingYaml(false);
        }
    };

    const setInputsAndReset = (next) => {
        setInputs(next);
        setChanged(false);
    };

    return (
        <>
            <Button
                variant="outlined"
                color="primary"
                onClick={handleOpen}
                sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: 2,
                    borderColor: 'var(--glass-stroke-strong)',
                    '&:hover': {
                        borderColor: 'primary.main',
                        background: 'var(--accent-soft)',
                    },
                }}
            >
                Load from Repo
            </Button>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth={false}
                sx={{
                    '& .MuiDialog-container': {
                        alignItems: 'flex-start',
                    },
                }}
                PaperProps={{
                    sx: {
                        mt: { xs: '8vh', sm: '25vh' },
                        mx: 2,
                        width: 'min(820px, calc(100vw - 32px))',
                        height: { xs: '78vh', sm: '60vh' },
                        minHeight: { xs: 'auto', sm: 460 },
                        maxHeight: { xs: '85vh', sm: '64vh' },
                        overflow: 'hidden',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr)',
                        gridTemplateRows: 'auto 1fr',
                        borderRadius: 3,
                    },
                }}
            >
                {/* ── Header ───────────────────────────────── */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        gap: { xs: 1, sm: 1.5 },
                        px: { xs: 1.75, sm: 2.5 },
                        py: 1.5,
                        borderBottom: '1px solid var(--glass-stroke)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Browse atomic-red-team
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    color: 'var(--text-faint)',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    mt: 0.25,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {indexLoading
                                    ? 'Loading index…'
                                    : `${tacticGroups.length} tactics · ${totalTests.toLocaleString()} atomic tests`}
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={handleClose}
                            sx={{ flexShrink: 0, display: { xs: 'inline-flex', sm: 'none' } }}
                            aria-label="Close"
                        >
                            <CloseRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--glass-stroke)',
                            borderRadius: 2,
                            px: 1.5,
                            py: 0.75,
                            width: { xs: '100%', sm: 240 },
                            flexShrink: 0,
                            transition: 'border-color 0.14s, box-shadow 0.14s',
                            '&:focus-within': {
                                borderColor: 'primary.main',
                                boxShadow: '0 0 0 3px rgba(255, 92, 57, 0.10)',
                            },
                        }}
                    >
                        <SearchRoundedIcon sx={{ fontSize: 16, color: 'var(--text-faint)' }} />
                        <Box
                            component="input"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Search T-ID, technique, or atomic test…"
                            disabled={indexLoading || loadingYaml}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'text.primary',
                                font: 'inherit',
                                fontSize: 13,
                                py: 0.25,
                                '&::placeholder': { color: 'var(--text-faint)' },
                            }}
                        />
                    </Box>

                    <IconButton
                        size="small"
                        onClick={handleClose}
                        sx={{ flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }}
                        aria-label="Close"
                    >
                        <CloseRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                {/* ── Body ─────────────────────────────────── */}
                {indexLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : error ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                                Could not load atomic-red-team index
                            </Typography>
                            <Typography sx={{ fontSize: 13, mb: 1 }}>
                                {error.message || 'Unknown error.'}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                The CSV index lives at <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, background: 'rgba(0,0,0,0.3)', px: 0.5, borderRadius: 0.5 }}>raw.githubusercontent.com</Box>. If you are behind a corporate proxy, it may be intercepting the response — try a different network or ask IT to allow the host.
                            </Typography>
                        </Alert>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' },
                            gridTemplateRows: { xs: 'auto 1fr', sm: '1fr' },
                            minHeight: 0,
                        }}
                    >
                        {/* Tactics rail */}
                        <Box
                            sx={{
                                background: 'rgba(0,0,0,0.18)',
                                borderRight: { xs: 'none', sm: '1px solid var(--glass-stroke)' },
                                borderBottom: { xs: '1px solid var(--glass-stroke)', sm: 'none' },
                                overflow: 'auto',
                                py: 1,
                                px: 0.75,
                                opacity: filter ? 0.55 : 1,
                                pointerEvents: filter ? 'none' : 'auto',
                                transition: 'opacity 0.14s',
                                display: { xs: 'flex', sm: 'block' },
                                flexDirection: { xs: 'row', sm: 'unset' },
                                gap: { xs: 0.5, sm: 0 },
                                whiteSpace: { xs: 'nowrap', sm: 'normal' },
                            }}
                        >
                            {tacticGroups.map((g) => {
                                const active = g.id === activeTactic;
                                return (
                                    <Box
                                        key={g.id}
                                        ref={(el) => {
                                            if (el && active) {
                                                // Auto-scroll the active tactic into view, primarily
                                                // useful for the mobile horizontal scroll strip.
                                                el.scrollIntoView({ block: 'nearest', inline: 'center' });
                                            }
                                        }}
                                        onClick={() => setActiveTactic(g.id)}
                                        role="button"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.25,
                                            px: 1.25,
                                            py: 1,
                                            borderRadius: 1.5,
                                            cursor: 'pointer',
                                            color: active ? 'text.primary' : 'text.secondary',
                                            background: active ? 'rgba(255, 92, 57, 0.12)' : 'transparent',
                                            fontSize: 13,
                                            transition: 'background 0.1s, color 0.1s',
                                            flexShrink: 0,
                                            '&:hover': {
                                                background: active
                                                    ? 'rgba(255, 92, 57, 0.16)'
                                                    : 'rgba(255,255,255,0.04)',
                                                color: 'text.primary',
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: g.color,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {g.label}
                                        </Box>
                                        <Box
                                            sx={{
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10,
                                                color: 'var(--text-faint)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {g.count}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* Techniques pane */}
                        <Box sx={{ overflow: 'auto', p: 1.25, position: 'relative' }}>
                            {loadingYaml && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(0,0,0,0.4)',
                                        backdropFilter: 'blur(4px)',
                                        zIndex: 1,
                                    }}
                                >
                                    <CircularProgress size={26} />
                                </Box>
                            )}

                            {visibleTechniques.length === 0 ? (
                                <Box
                                    sx={{
                                        p: 4,
                                        textAlign: 'center',
                                        color: 'var(--text-faint)',
                                        fontSize: 13,
                                    }}
                                >
                                    {filter
                                        ? `No techniques matching "${filter}"`
                                        : 'Pick a tactic to see techniques'}
                                </Box>
                            ) : (
                                visibleTechniques.map((tech) => (
                                    <Box
                                        key={tech.id}
                                        onClick={() => !loadingYaml && handleTechniquePick(tech)}
                                        role="button"
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '74px 1fr auto', sm: '92px 1fr auto' },
                                            gap: { xs: 1, sm: 1.5 },
                                            alignItems: 'center',
                                            px: { xs: 1, sm: 1.5 },
                                            py: 1.25,
                                            borderRadius: 1.5,
                                            mb: 0.5,
                                            cursor: 'pointer',
                                            border: '1px solid transparent',
                                            transition: 'all 0.12s',
                                            '&:hover': {
                                                background: 'rgba(255,255,255,0.04)',
                                                borderColor: 'var(--glass-stroke)',
                                            },
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 12,
                                                color: 'primary.main',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {tech.id}
                                        </Typography>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    fontSize: 13.5,
                                                    color: 'text.primary',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {tech.name}
                                            </Typography>
                                            <Typography
                                                component="div"
                                                sx={{
                                                    fontSize: 11,
                                                    color: 'var(--text-faint)',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    mt: 0.25,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.75,
                                                    minWidth: 0,
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {filter && (
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                width: 6,
                                                                height: 6,
                                                                borderRadius: '50%',
                                                                background: tech.tacticColor,
                                                                display: 'inline-block',
                                                            }}
                                                        />
                                                        {tech.tacticLabel}
                                                        <Box component="span" sx={{ color: 'var(--text-faint)', mx: 0.25 }}>·</Box>
                                                    </Box>
                                                )}
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    {Array.from(tech.executors || []).slice(0, 2).join(' · ') || '—'}
                                                </Box>
                                            </Typography>
                                            {tech.testHits && tech.testHits.length > 0 && (
                                                <Typography
                                                    sx={{
                                                        fontSize: 11,
                                                        color: 'primary.light',
                                                        mt: 0.5,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={tech.testHits.join(' · ')}
                                                >
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            fontFamily: "'JetBrains Mono', monospace",
                                                            fontSize: 9,
                                                            color: 'var(--text-faint)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.06em',
                                                        }}
                                                    >
                                                        match:
                                                    </Box>
                                                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {tech.testHits.join(' · ')}
                                                    </Box>
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box
                                            sx={{
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 10,
                                                color: 'text.secondary',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid var(--glass-stroke)',
                                                borderRadius: 1,
                                                px: 1,
                                                py: 0.4,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {tech.testCount} {tech.testCount === 1 ? 'test' : 'tests'}
                                        </Box>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </Box>
                )}
            </Dialog>

            {selectionOpen && (
                <UploadedAtomicSelection
                    base={base}
                    atomicNames={atomicNames}
                    techniqueName={techniqueName}
                    techniqueId={techniqueId}
                    open={selectionOpen}
                    setOpen={setSelectionOpen}
                    fileContent={fileContent}
                    setInputs={setInputsAndReset}
                    setLoadedSource={setLoadedSource}
                    sourceType="repo"
                    onBack={() => {
                        setSelectionOpen(false);
                        setOpen(true);
                    }}
                />
            )}
        </>
    );
}
