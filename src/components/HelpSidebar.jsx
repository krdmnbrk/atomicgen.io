import React from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import LaunchIcon from '@mui/icons-material/Launch';

// Lint rule reference — keep in sync with src/utils/atLinter.js codes.
const LINT_RULES = [
    { code: 'AT001', sev: 'error',   what: 'Placeholder used but not declared in input_arguments.' },
    { code: 'AT002', sev: 'warning', what: 'Input argument declared but never referenced.' },
    { code: 'AT003', sev: 'error',   what: 'Executor / supported_platforms mismatch (e.g. powershell on linux-only).' },
    { code: 'AT004', sev: 'error',   what: 'Non-AT placeholder syntax — only #{name} is allowed.' },
    { code: 'AT010', sev: 'warning', what: 'Command appears to create persistence/artifacts but cleanup_command is empty.' },
    { code: 'AT011', sev: 'error',   what: 'GUID collides with an existing atomic-red-team test.' },
    { code: 'AT012', sev: 'warning', what: 'elevation_required set but no Windows/Linux/macOS platform — flag is ignored.' },
    { code: 'AT013', sev: 'info',    what: 'Test name not Title-Case (AT convention).' },
    { code: 'AT014', sev: 'info',    what: 'Description too short or missing a verification cue.' },
    { code: 'AT015', sev: 'error',   what: 'attack_technique not in T#### / T####.### format.' },
    { code: 'AT016', sev: 'info',    what: 'TID not in atomic-red-team index — your contribution will create a new technique folder.' },
    { code: 'AT017', sev: 'error',   what: 'dependencies present but dependency_executor_name missing.' },
    { code: 'AT020', sev: 'info',    what: 'Hardcoded user path — consider exposing as input_argument.' },
];

const SHORTCUTS = [
    { keys: ['⌘K'],         what: 'Open command palette' },
    { keys: ['⌘S'],         what: 'Download YAML' },
    { keys: ['⌘⇧S'],        what: 'Save current to My Tests library' },
    { keys: ['⌘/'],         what: 'Focus AI / search input' },
    { keys: ['?'],          what: 'Open this Help panel (Shortcuts tab)' },
    { keys: ['Esc'],        what: 'Close any open dialog' },
];

const AT_FORMAT = [
    { topic: 'YAML structure',
      body: 'Each technique YAML wraps one or more atomic_tests under a single attack_technique + display_name. atomicgen.io always emits a single test per file; merging into existing technique YAMLs happens automatically when you contribute.' },
    { topic: 'Input arguments',
      body: 'Reference variables in commands as #{name}. Each must be declared in input_arguments with a type (string | path | url | integer | float) and a default. The linter enforces the round-trip (AT001/AT002).' },
    { topic: 'Executors',
      body: 'powershell · command_prompt · bash · sh · manual. Manual takes markdown steps instead of a shell command. Windows shells require windows in supported_platforms; bash/sh do NOT mix with windows.' },
    { topic: 'Cleanup',
      body: 'cleanup_command runs via Invoke-AtomicTest TID -Cleanup. If your test creates a scheduled task, registry key, file, or service — you should provide a cleanup. Linter rule AT010 will flag obvious omissions.' },
    { topic: 'Dependencies',
      body: 'A dependency is a prereq_command (test for presence) + optional get_prereq_command (install if missing). dependency_executor_name selects the shell. Triggered by Invoke-AtomicTest TID -GetPrereqs.' },
    { topic: 'GUID',
      body: 'auto_generated_guid is a UUID v4. atomicgen.io generates one on first download. The linter checks it doesn\'t collide with the live atomic-red-team index.' },
];

const RESOURCES = [
    { label: 'Atomic Red Team — Sample Spec',  url: 'https://github.com/redcanaryco/atomic-red-team/wiki/Sample-Spec' },
    { label: 'Atomic Red Team — Contributing', url: 'https://github.com/redcanaryco/atomic-red-team/wiki/Contributing' },
    { label: 'atomicredteam.io',                url: 'https://atomicredteam.io' },
    { label: 'Invoke-AtomicRedTeam framework',  url: 'https://www.atomicredteam.io/invoke-atomicredteam' },
    { label: 'Atomic Red Team Slack',           url: 'https://slack.atomicredteam.io/' },
    { label: 'AttackRuleMap',                   url: 'https://attackrulemap.com/' },
    { label: 'sigconverter.io (Sigma → SIEM)',  url: 'https://sigconverter.io' },
    { label: 'MITRE ATT&CK',                    url: 'https://attack.mitre.org' },
];

function SeverityChip({ sev }) {
    const meta = sev === 'error'
        ? { color: '#E5484D', bg: 'rgba(229,72,77,0.10)', border: 'rgba(229,72,77,0.30)' }
        : sev === 'warning'
        ? { color: '#F5B74E', bg: 'rgba(245,183,78,0.10)', border: 'rgba(245,183,78,0.30)' }
        : { color: '#6FA9FF', bg: 'rgba(111,169,255,0.10)', border: 'rgba(111,169,255,0.30)' };
    return (
        <Chip
            label={sev}
            size="small"
            sx={{
                fontSize: 10,
                height: 17,
                color: meta.color,
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.06em',
                '& .MuiChip-label': { px: 0.6 },
            }}
        />
    );
}

export default function HelpSidebar({ open, onClose, initialTab = 0 }) {
    const [tab, setTab] = React.useState(initialTab);
    React.useEffect(() => {
        if (open) setTab(initialTab);
    }, [open, initialTab]);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 460 },
                    background: 'var(--glass-modal)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    borderLeft: '1px solid var(--glass-stroke)',
                    backgroundImage: 'none',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid var(--glass-stroke)',
                }}
            >
                <HelpOutlineRoundedIcon sx={{ color: 'primary.main' }} />
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Help &amp; docs</Typography>
                    <Typography sx={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        Atomic Red Team format · linter · keyboard shortcuts
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} aria-label="Close help">
                    <CloseRoundedIcon />
                </IconButton>
            </Box>

            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    minHeight: 36,
                    px: 1,
                    borderBottom: '1px solid var(--glass-stroke)',
                    '& .MuiTab-root': { textTransform: 'none', minHeight: 36, fontSize: 12.5, py: 0.5 },
                }}
            >
                <Tab label="AT format" />
                <Tab label="Lint rules" />
                <Tab label="Shortcuts" />
            </Tabs>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {tab === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {AT_FORMAT.map((row) => (
                            <Box
                                key={row.topic}
                                sx={{
                                    p: 1.5,
                                    background: 'var(--glass-strong)',
                                    border: '1px solid var(--glass-stroke)',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                                    {row.topic}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
                                    {row.body}
                                </Typography>
                            </Box>
                        ))}
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid var(--glass-stroke)' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-faint)', mb: 0.75 }}>
                                More resources
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                                {RESOURCES.map((r) => (
                                    <Link
                                        key={r.url}
                                        href={r.url}
                                        target="_blank"
                                        underline="hover"
                                        sx={{ fontSize: 12.5, color: 'text.primary', display: 'inline-flex', alignItems: 'center', gap: 0.5, py: 0.25 }}
                                    >
                                        {r.label}
                                        <LaunchIcon sx={{ fontSize: 11, opacity: 0.6 }} />
                                    </Link>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                )}

                {tab === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', mb: 0.5 }}>
                            Click any rule code in the YAML preview lint panel to jump to the offending field.
                        </Typography>
                        {LINT_RULES.map((r) => (
                            <Box
                                key={r.code}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 1,
                                    px: 1.25,
                                    py: 1,
                                    background: 'var(--glass-strong)',
                                    border: '1px solid var(--glass-stroke)',
                                    borderRadius: 1.5,
                                }}
                            >
                                <Box sx={{ flexShrink: 0 }}>
                                    <Typography
                                        sx={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: 11,
                                            color: 'primary.main',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {r.code}
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <SeverityChip sev={r.sev} />
                                    </Box>
                                </Box>
                                <Typography sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.5 }}>
                                    {r.what}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                {tab === 2 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {SHORTCUTS.map((s, i) => (
                            <Box
                                key={i}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    px: 1.25,
                                    py: 0.85,
                                    background: 'var(--glass-strong)',
                                    border: '1px solid var(--glass-stroke)',
                                    borderRadius: 1.5,
                                }}
                            >
                                <Box sx={{ display: 'inline-flex', gap: 0.5, flexShrink: 0, minWidth: 70 }}>
                                    {s.keys.map((k, ki) => (
                                        <Box
                                            key={ki}
                                            component="kbd"
                                            sx={{
                                                px: 0.75,
                                                py: 0.15,
                                                fontFamily: "'JetBrains Mono', monospace",
                                                fontSize: 11,
                                                background: 'var(--glass-inset)',
                                                border: '1px solid var(--glass-stroke)',
                                                borderRadius: 0.75,
                                                color: 'text.primary',
                                            }}
                                        >
                                            {k}
                                        </Box>
                                    ))}
                                </Box>
                                <Typography sx={{ fontSize: 12.5, color: 'text.primary' }}>{s.what}</Typography>
                            </Box>
                        ))}
                        <Typography sx={{ pt: 1, fontSize: 11, color: 'var(--text-faint)' }}>
                            On Windows / Linux, ⌘ = Ctrl, ⇧ = Shift.
                        </Typography>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
}
