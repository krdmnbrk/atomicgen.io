import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// Platforms we have a meaningful Invoke-AtomicTest path for. Cloud / SaaS
// targets run via vendor-specific tooling and aren't covered here.
const RUNNABLE_PLATFORMS = ['windows', 'linux', 'macos'];

const PLATFORM_LABELS = {
    windows: 'Windows',
    linux: 'Linux',
    macos: 'macOS',
};

const PLATFORM_INSTALL = {
    windows: {
        steps: [
            {
                label: 'Allow scripts (one-time, current user)',
                code: 'Set-ExecutionPolicy Bypass -Scope CurrentUser -Force',
            },
            {
                label: 'Install Invoke-AtomicTest + the atomics folder',
                code:
                    `IEX (IWR 'https://raw.githubusercontent.com/redcanaryco/invoke-atomicredteam/master/install-atomicredteam.ps1' -UseBasicParsing)
Install-AtomicRedTeam -getAtomics -Force
Import-Module "$env:USERPROFILE\\AtomicRedTeam\\invoke-atomicredteam\\Invoke-AtomicRedTeam.psd1" -Force`,
            },
        ],
        elevationNote: 'Open an elevated PowerShell window before running.',
    },
    macos: {
        steps: [
            {
                label: 'Install PowerShell (one-time)',
                code: 'brew install --cask powershell',
            },
            {
                label: 'Install Invoke-AtomicTest + atomics from pwsh',
                code:
                    `pwsh -c "IEX (IWR 'https://raw.githubusercontent.com/redcanaryco/invoke-atomicredteam/master/install-atomicredteam.ps1' -UseBasicParsing); Install-AtomicRedTeam -getAtomics -Force"`,
            },
        ],
        elevationNote: 'Prepend `sudo` to the pwsh invocation.',
    },
    linux: {
        steps: [
            {
                label: 'Install PowerShell (one-time, distro-specific)',
                code:
                    `# Ubuntu / Debian:
sudo apt-get install -y powershell

# Other distros: see https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-linux`,
            },
            {
                label: 'Install Invoke-AtomicTest + atomics from pwsh',
                code:
                    `pwsh -c "IEX (IWR 'https://raw.githubusercontent.com/redcanaryco/invoke-atomicredteam/master/install-atomicredteam.ps1' -UseBasicParsing); Install-AtomicRedTeam -getAtomics -Force"`,
            },
        ],
        elevationNote: 'Prepend `sudo` to the pwsh invocation.',
    },
};

function escapePsString(v) {
    return String(v).replace(/`/g, '``').replace(/"/g, '`"');
}

function formatInputArgsHashtable(args) {
    const list = (args || []).filter((a) => a && a.name);
    if (list.length === 0) return null;
    const pairs = list
        .map((a) => {
            const v = a.default;
            if (v === null || v === undefined || v === '') return `${a.name}="<value>"`;
            return `${a.name}="${escapePsString(v)}"`;
        })
        .join('; ');
    return `@{${pairs}}`;
}

function substituteCommand(cmd, args) {
    if (!cmd) return '';
    let out = cmd;
    for (const a of args || []) {
        if (!a || !a.name) continue;
        const v = a.default ?? `<${a.type || 'value'}>`;
        out = out.replace(new RegExp(`#\\{${a.name}\\}`, 'g'), String(v));
    }
    return out;
}

function CodeBlock({ children }) {
    const [copied, setCopied] = React.useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* noop */
        }
    };
    return (
        <Box
            sx={{
                position: 'relative',
                background: 'var(--glass-strong)',
                border: '1px solid var(--glass-stroke)',
                borderRadius: 1.5,
                p: 1.25,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: 'text.primary',
                whiteSpace: 'pre-wrap',
                overflowX: 'auto',
                lineHeight: 1.55,
            }}
        >
            <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton
                    size="small"
                    onClick={handleCopy}
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                >
                    {copied ? (
                        <CheckRoundedIcon fontSize="small" sx={{ color: 'success.main' }} />
                    ) : (
                        <ContentCopyRoundedIcon fontSize="small" />
                    )}
                </IconButton>
            </Tooltip>
            <Box sx={{ pr: 4 }}>{children}</Box>
        </Box>
    );
}

function Step({ number, title, children }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Box
                    sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--accent-soft)',
                        color: 'primary.main',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    {number}
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>
                    {title}
                </Typography>
            </Box>
            <Box sx={{ pl: 3.75 }}>{children}</Box>
        </Box>
    );
}

const dividerLabelSx = {
    fontSize: 10,
    color: 'var(--text-faint)',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    fontWeight: 600,
};

export default function HowToRun({ inputs }) {
    const platforms = (inputs.supported_platforms || []).filter((p) =>
        RUNNABLE_PLATFORMS.includes(p)
    );
    const [picked, setPicked] = React.useState(platforms[0] || 'windows');

    React.useEffect(() => {
        if (platforms.length && !platforms.includes(picked)) {
            setPicked(platforms[0]);
        }
    }, [platforms, picked]);

    const tid = (inputs.attack_technique || '').trim();
    const guid = inputs.auto_generated_guid;
    const exec = inputs.executor || {};
    const inputArgs = Array.isArray(inputs.input_arguments) ? inputs.input_arguments : [];
    const dependencies = Array.isArray(inputs.dependencies) ? inputs.dependencies : [];
    const elevation = !!exec.elevation_required;
    const isManual = exec.name === 'manual';

    if (!tid) {
        return (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                Set an ATT&amp;CK technique (T####) to see how-to-run instructions.
            </Alert>
        );
    }
    if (platforms.length === 0) {
        return (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                Pick at least one of <strong>Windows / Linux / macOS</strong> in Supported platforms.
                Cloud / SaaS / Containers tests run via vendor-specific tooling — not covered here.
            </Alert>
        );
    }

    const platformInfo = PLATFORM_INSTALL[picked];

    // Invoke-AtomicTest run line
    const argsHash = formatInputArgsHashtable(inputArgs);
    const targetSpec = guid ? `-TestGuids ${guid}` : '-TestNumbers 1';
    const argsPart = argsHash ? ` -InputArgs ${argsHash}` : '';
    const runLine = `Invoke-AtomicTest ${tid} ${targetSpec}${argsPart}`;
    const prereqsLine = `Invoke-AtomicTest ${tid} ${targetSpec} -GetPrereqs`;
    const cleanupLine = `Invoke-AtomicTest ${tid} ${targetSpec} -Cleanup`;
    const showDetailsLine = `Invoke-AtomicTest ${tid} ${targetSpec} -ShowDetails`;

    // Substituted raw command (placeholders replaced with defaults)
    const substitutedCommand = isManual ? null : substituteCommand(exec.command, inputArgs);
    const substitutedCleanup = isManual ? null : substituteCommand(exec.cleanup_command, inputArgs);

    let stepNum = 1;
    const stepNumber = () => stepNum++;

    return (
        <Box>
            {/* Platform picker */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        color: 'var(--text-faint)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.10em',
                        fontWeight: 600,
                    }}
                >
                    Run on
                </Typography>
                {platforms.map((p) => {
                    const sel = p === picked;
                    return (
                        <Chip
                            key={p}
                            label={PLATFORM_LABELS[p] || p}
                            size="small"
                            onClick={() => setPicked(p)}
                            sx={{
                                background: sel ? 'var(--accent-soft)' : 'var(--glass-strong)',
                                color: sel ? 'primary.main' : 'text.secondary',
                                border: '1px solid',
                                borderColor: sel ? 'primary.main' : 'var(--glass-stroke)',
                                fontWeight: sel ? 500 : 400,
                                cursor: 'pointer',
                            }}
                        />
                    );
                })}
                {elevation && (
                    <Chip
                        icon={<LockOutlinedIcon sx={{ fontSize: 12 }} />}
                        label="elevation required"
                        size="small"
                        color="warning"
                        variant="outlined"
                    />
                )}
            </Box>

            {elevation && platformInfo.elevationNote && (
                <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{ borderRadius: 2, mb: 2, py: 0.5 }}
                >
                    {platformInfo.elevationNote}
                </Alert>
            )}

            {/* Quick — raw command first, immediately runnable */}
            {!isManual && substitutedCommand && (
                <>
                    <Divider sx={{ mb: 1.5 }}>
                        <Typography sx={dividerLabelSx}>Quick — paste &amp; run</Typography>
                    </Divider>
                    <Box sx={{ mb: 1, pl: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.75 }}>
                            Raw {exec.name} command, with #{`{placeholders}`} substituted by defaults — works without any framework.
                        </Typography>
                        <CodeBlock>{substitutedCommand}</CodeBlock>
                        {substitutedCleanup && (
                            <Box sx={{ mt: 1 }}>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        color: 'var(--text-faint)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        fontWeight: 600,
                                        mb: 0.5,
                                    }}
                                >
                                    Cleanup
                                </Typography>
                                <CodeBlock>{substitutedCleanup}</CodeBlock>
                            </Box>
                        )}
                    </Box>
                </>
            )}

            {isManual && exec.steps && (
                <>
                    <Divider sx={{ mb: 1.5 }}>
                        <Typography sx={dividerLabelSx}>Manual steps — follow by hand</Typography>
                    </Divider>
                    <Box sx={{ mb: 2, pl: 0.5 }}>
                        <CodeBlock>{exec.steps}</CodeBlock>
                    </Box>
                </>
            )}

            {/* Or use Invoke-AtomicTest */}
            <Divider sx={{ my: 2 }}>
                <Typography sx={dividerLabelSx}>Or use Invoke-AtomicTest</Typography>
            </Divider>

            <Step number={stepNumber()} title="Install Invoke-AtomicTest (one-time)">
                {platformInfo.steps.map((s, i) => (
                    <Box key={i} sx={{ mb: 1 }}>
                        <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', mb: 0.5 }}>
                            {s.label}
                        </Typography>
                        <CodeBlock>{s.code}</CodeBlock>
                    </Box>
                ))}
            </Step>

            {dependencies.length > 0 && (
                <Step number={stepNumber()} title={`Install dependencies (${dependencies.length})`}>
                    <CodeBlock>{prereqsLine}</CodeBlock>
                </Step>
            )}

            <Step number={stepNumber()} title={isManual ? 'Show manual steps' : 'Run the test'}>
                <CodeBlock>{isManual ? showDetailsLine : runLine}</CodeBlock>
                {!isManual && argsHash && (
                    <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', mt: 0.5 }}>
                        InputArgs values are PowerShell-quoted strings — adjust types as needed for your environment.
                    </Typography>
                )}
                {isManual && (
                    <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', mt: 0.5 }}>
                        Manual tests print steps to follow by hand — no auto-execution.
                    </Typography>
                )}
            </Step>

            {(exec.cleanup_command || isManual) && (
                <Step number={stepNumber()} title="Clean up artifacts">
                    <CodeBlock>{cleanupLine}</CodeBlock>
                </Step>
            )}

            <Typography sx={{ mt: 2, fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                The test must exist locally for Invoke-AtomicTest to find it — either in the installed atomics folder
                or via <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>-PathToAtomicsFolder</Box>{' '}
                pointing to a folder containing your YAML.
            </Typography>
        </Box>
    );
}
