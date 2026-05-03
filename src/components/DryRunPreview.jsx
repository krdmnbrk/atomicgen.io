import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded';

// Highlight #{name} placeholders inline.
function colorPlaceholders(text) {
    if (typeof text !== 'string') return text;
    if (!text.includes('#{')) return text;
    const parts = text.split(/(#\{[^}]+\})/g);
    return parts.map((p, i) =>
        /^#\{[^}]+\}$/.test(p) ? (
            <Box
                key={i}
                component="span"
                sx={{
                    color: 'primary.main',
                    background: 'var(--accent-soft)',
                    px: 0.4,
                    borderRadius: 0.5,
                    fontWeight: 500,
                }}
            >
                {p}
            </Box>
        ) : (
            <React.Fragment key={i}>{p}</React.Fragment>
        )
    );
}

const fieldLabelSx = {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-faint)',
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    mb: 0.5,
};

const codeBoxSx = {
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
};

export default function DryRunPreview({ inputs }) {
    const exec = inputs.executor || {};
    const inputArgs = Array.isArray(inputs.input_arguments) ? inputs.input_arguments : [];
    const dependencies = Array.isArray(inputs.dependencies) ? inputs.dependencies : [];
    const platforms = Array.isArray(inputs.supported_platforms) ? inputs.supported_platforms : [];

    return (
        <Box sx={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Invoke command bar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.25,
                    mb: 2,
                    background: 'var(--glass-strong)',
                    border: '1px solid var(--glass-stroke)',
                    borderRadius: 1.5,
                }}
            >
                <KeyboardArrowRightRoundedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                <Typography
                    sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        color: 'text.primary',
                        flex: 1,
                        overflowX: 'auto',
                    }}
                >
                    Invoke-AtomicTest {inputs.attack_technique || 'T####'}
                    {inputs.auto_generated_guid && (
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                            {' '}
                            -TestGuids {inputs.auto_generated_guid}
                        </Box>
                    )}
                </Typography>
            </Box>

            {/* Header */}
            <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 11, color: 'var(--text-faint)', mb: 0.25 }}>
                    {inputs.attack_technique || 'T####'}
                    {inputs.display_name ? ` · ${inputs.display_name}` : ''}
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary' }}>
                    {inputs.name || <Box component="span" sx={{ color: 'var(--text-faint)' }}>(unnamed test)</Box>}
                </Typography>
                {inputs.description && (
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.75, lineHeight: 1.5 }}>
                        {inputs.description}
                    </Typography>
                )}
            </Box>

            {/* Meta chips */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                {platforms.map((p) => (
                    <Chip
                        key={p}
                        label={p}
                        size="small"
                        sx={{
                            background: 'var(--accent-soft)',
                            color: 'primary.main',
                            border: '1px solid',
                            borderColor: 'rgba(255,92,57,0.30)',
                            fontWeight: 500,
                            fontSize: 11,
                        }}
                    />
                ))}
                {exec.name && (
                    <Chip
                        icon={<FlashOnRoundedIcon sx={{ fontSize: 12 }} />}
                        label={exec.name}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                    />
                )}
                {exec.elevation_required && (
                    <Chip
                        label="elevation required"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                    />
                )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Input arguments table */}
            {inputArgs.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography sx={fieldLabelSx}>Input arguments</Typography>
                    <Box
                        sx={{
                            border: '1px solid var(--glass-stroke)',
                            borderRadius: 1.5,
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '1.4fr 0.7fr 1.5fr 2fr',
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'var(--text-faint)',
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                px: 1.25,
                                py: 0.5,
                                background: 'var(--glass-strong)',
                                borderBottom: '1px solid var(--glass-stroke)',
                            }}
                        >
                            <Box>Name</Box>
                            <Box>Type</Box>
                            <Box>Default</Box>
                            <Box>Description</Box>
                        </Box>
                        {inputArgs.map((a, i) => (
                            <Box
                                key={a.name || i}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.4fr 0.7fr 1.5fr 2fr',
                                    fontSize: 12,
                                    px: 1.25,
                                    py: 0.75,
                                    borderTop: i > 0 ? '1px solid var(--glass-stroke)' : 'none',
                                    color: 'text.primary',
                                }}
                            >
                                <Box sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.main' }}>
                                    {a.name || <Box component="span" sx={{ color: 'var(--text-faint)' }}>(no name)</Box>}
                                </Box>
                                <Box sx={{ color: 'text.secondary' }}>{a.type || '—'}</Box>
                                <Box
                                    sx={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        color: 'text.secondary',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title={String(a.default ?? '')}
                                >
                                    {a.default === '' ? <em>(empty)</em> : a.default ?? '—'}
                                </Box>
                                <Box sx={{ color: 'text.secondary' }}>{a.description || '—'}</Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            {/* Command / Steps */}
            {exec.name === 'manual' ? (
                exec.steps && (
                    <Box sx={{ mb: 2 }}>
                        <Typography sx={fieldLabelSx}>Manual steps</Typography>
                        <Box sx={codeBoxSx}>{colorPlaceholders(exec.steps)}</Box>
                    </Box>
                )
            ) : (
                exec.command && (
                    <Box sx={{ mb: 2 }}>
                        <Typography sx={fieldLabelSx}>Attack command ({exec.name || 'unspecified'})</Typography>
                        <Box sx={codeBoxSx}>{colorPlaceholders(exec.command)}</Box>
                    </Box>
                )
            )}

            {exec.cleanup_command && (
                <Box sx={{ mb: 2 }}>
                    <Typography sx={fieldLabelSx}>Cleanup command</Typography>
                    <Box sx={codeBoxSx}>{colorPlaceholders(exec.cleanup_command)}</Box>
                </Box>
            )}

            {/* Dependencies */}
            {dependencies.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography sx={fieldLabelSx}>
                        Dependencies ({dependencies.length}, executor: {inputs.dependency_executor_name || 'unset'})
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {dependencies.map((d, i) => (
                            <Box
                                key={i}
                                sx={{
                                    p: 1.25,
                                    background: 'var(--glass-strong)',
                                    border: '1px solid var(--glass-stroke)',
                                    borderRadius: 1.5,
                                }}
                            >
                                <Typography sx={{ fontSize: 12, color: 'text.primary', mb: 0.5, fontWeight: 500 }}>
                                    {d.description || `Dependency ${i + 1}`}
                                </Typography>
                                {d.prereq_command && (
                                    <Box sx={{ ...codeBoxSx, p: 0.75, fontSize: 11, mb: d.get_prereq_command ? 0.5 : 0 }}>
                                        <Box component="span" sx={{ color: 'var(--text-faint)' }}>check </Box>
                                        {colorPlaceholders(d.prereq_command)}
                                    </Box>
                                )}
                                {d.get_prereq_command && (
                                    <Box sx={{ ...codeBoxSx, p: 0.75, fontSize: 11 }}>
                                        <Box component="span" sx={{ color: 'var(--text-faint)' }}>install </Box>
                                        {colorPlaceholders(d.get_prereq_command)}
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            <Typography sx={{ mt: 2, fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                Static preview — no test is executed. Mirrors{' '}
                <Box component="code" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Invoke-AtomicTest -ShowDetails
                </Box>{' '}
                output.
            </Typography>
        </Box>
    );
}
