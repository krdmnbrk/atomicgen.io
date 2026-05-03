import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import { getGuidanceFor, attackUrlFor } from '../utils/attackGuidance';

const PLATFORM_COLORS = {
    windows: '#6FA9FF',
    linux:   '#4DDD96',
    macos:   '#C28FFF',
    'office-365': '#F5B74E',
};

const SECTION_TITLE_SX = {
    fontSize: 11,
    fontWeight: 600,
    color: 'text.secondary',
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
};

export default function DetectionGuidancePanel({ tid, supportedPlatforms = [] }) {
    const guidance = getGuidanceFor(tid);

    // Render shell even when no curated data — direct user to MITRE for any TID.
    if (!tid) return null;

    const attackHref = attackUrlFor(tid);

    if (!guidance) {
        return (
            <Accordion
                disableGutters
                square={false}
                elevation={0}
                sx={{
                    background: 'var(--glass)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid var(--glass-stroke)',
                    borderRadius: '24px !important',
                    boxShadow: 'var(--shadow-glow)',
                    overflow: 'hidden',
                    mb: 2,
                    '&:before': { display: 'none' },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreRoundedIcon sx={{ color: 'text.secondary' }} />}
                    sx={{ px: 2.5, py: 1 }}
                >
                    <Box sx={{ ...SECTION_TITLE_SX }}>
                        <VisibilityOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        Detection guidance
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5, borderTop: '1px solid var(--glass-stroke)' }}>
                    <Typography sx={{ pt: 2, fontSize: 13, color: 'text.secondary' }}>
                        No curated guidance for {tid} in atomicgen.io's dataset yet.{' '}
                        {attackHref && (
                            <>
                                Open{' '}
                                <Link href={attackHref} target="_blank" underline="hover">
                                    {tid} on attack.mitre.org
                                </Link>{' '}
                                for the canonical data sources and detections.
                            </>
                        )}
                    </Typography>
                </AccordionDetails>
            </Accordion>
        );
    }

    // Filter platforms shown based on the test's supported_platforms.
    // If the test targets platforms we don't have curated data for (or the
    // user hasn't picked any yet), show everything we have.
    const allPlatforms = Object.keys(guidance.log_sources || {});
    const wantedPlatforms = supportedPlatforms.filter((p) => allPlatforms.includes(p));
    const platforms = wantedPlatforms.length > 0 ? wantedPlatforms : allPlatforms;

    return (
        <Accordion
            disableGutters
            square={false}
            elevation={0}
            defaultExpanded
            sx={{
                background: 'var(--glass)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                border: '1px solid var(--glass-stroke)',
                borderRadius: '24px !important',
                boxShadow: 'var(--shadow-glow)',
                overflow: 'hidden',
                mb: 2,
                '&:before': { display: 'none' },
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon sx={{ color: 'text.secondary' }} />}
                sx={{
                    px: { xs: 1.75, sm: 2.5 },
                    py: 1,
                    '& .MuiAccordionSummary-content': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: { xs: 1, sm: 2 },
                        minWidth: 0,
                    },
                }}
            >
                <Box sx={{ ...SECTION_TITLE_SX, minWidth: 0, whiteSpace: 'nowrap' }}>
                    <VisibilityOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    Detection guidance
                    {!guidance.exact && (
                        <Chip
                            label={`from parent ${guidance.tid}`}
                            size="small"
                            sx={{
                                ml: 0.5,
                                fontSize: 10,
                                height: 18,
                                '& .MuiChip-label': { px: 0.6 },
                            }}
                        />
                    )}
                </Box>
                {attackHref && (
                    <Link
                        href={attackHref}
                        target="_blank"
                        underline="hover"
                        sx={{
                            fontSize: 11,
                            color: 'text.secondary',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mr: 1,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {tid} <LaunchIcon sx={{ fontSize: 12 }} />
                    </Link>
                )}
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5, borderTop: '1px solid var(--glass-stroke)' }}>
                {/* Data components */}
                <Box sx={{ pt: 2, mb: 2 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.secondary', mb: 0.75 }}>
                        ATT&amp;CK data components
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(guidance.data_components || []).map((dc) => (
                            <Chip
                                key={dc}
                                label={dc}
                                size="small"
                                sx={{
                                    background: 'var(--accent-soft)',
                                    color: 'primary.main',
                                    border: '1px solid',
                                    borderColor: 'rgba(255,92,57,0.30)',
                                    fontSize: 11,
                                    fontWeight: 500,
                                    '& .MuiChip-label': { px: 0.8 },
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Log sources by platform */}
                {platforms.map((p) => {
                    const lines = guidance.log_sources[p] || [];
                    if (lines.length === 0) return null;
                    const color = PLATFORM_COLORS[p] || '#9AA3AE';
                    return (
                        <Box key={p} sx={{ mb: 2 }}>
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: 'text.secondary',
                                    mb: 0.75,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: color,
                                        boxShadow: `0 0 6px ${color}`,
                                    }}
                                />
                                Log sources — {p}
                            </Typography>
                            <Box
                                component="ul"
                                sx={{
                                    m: 0,
                                    pl: 2,
                                    fontSize: 12,
                                    color: 'text.primary',
                                    lineHeight: 1.55,
                                    '& li': { mb: 0.25 },
                                }}
                            >
                                {lines.map((line, i) => (
                                    <li key={i}>{line}</li>
                                ))}
                            </Box>
                        </Box>
                    );
                })}

                {/* False positive notes */}
                {(guidance.fp_notes || []).length > 0 && (
                    <Box>
                        <Typography
                            sx={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: 'warning.main',
                                mb: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: 'warning.main',
                                    boxShadow: '0 0 6px #F5B74E',
                                }}
                            />
                            Common false-positive sources
                        </Typography>
                        <Box
                            component="ul"
                            sx={{
                                m: 0,
                                pl: 2,
                                fontSize: 12,
                                color: 'text.secondary',
                                lineHeight: 1.55,
                                '& li': { mb: 0.25 },
                            }}
                        >
                            {guidance.fp_notes.map((line, i) => (
                                <li key={i}>{line}</li>
                            ))}
                        </Box>
                    </Box>
                )}

                <Tooltip title="Curated dataset, not authoritative — cross-reference with attack.mitre.org and your own telemetry.">
                    <Typography sx={{ mt: 1.5, fontSize: 10, color: 'var(--text-faint)' }}>
                        atomicgen.io curated dataset · best-effort
                    </Typography>
                </Tooltip>
            </AccordionDetails>
        </Accordion>
    );
}
