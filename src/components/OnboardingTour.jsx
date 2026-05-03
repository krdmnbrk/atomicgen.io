import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';

const TOUR_KEY = 'atomicgen.tour.completed.v1';

const kbdSx = {
    px: 0.6,
    py: 0.05,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10.5,
    background: 'var(--glass-inset)',
    border: '1px solid var(--glass-stroke)',
    borderRadius: 0.5,
    color: 'text.secondary',
};

const STEPS = [
    {
        icon: AutoAwesomeRoundedIcon,
        title: 'Start a test the way you like',
        body: (
            <>
                Type what you want in the <strong>AI prompt</strong> at the top, browse the{' '}
                <strong>atomic-red-team</strong> repo, paste an existing YAML, restore from your saved{' '}
                <strong>library</strong>, or fill the form by hand. Drafts auto-save in your browser.
            </>
        ),
    },
    {
        icon: DescriptionOutlinedIcon,
        title: 'Write, lint, iterate',
        body: (
            <>
                The right pane shows the <strong>YAML</strong> live, a <strong>How to run</strong> guide
                (per-platform), and a <strong>Diff</strong> vs the loaded version. The status badge
                surfaces lint findings — click it to jump to issues.
            </>
        ),
    },
    {
        icon: CallSplitRoundedIcon,
        title: 'Ship — to Splunk, to your library, or to atomic-red-team',
        body: (
            <>
                Generate Sigma + Splunk rules, save the test to your local library, or click{' '}
                <strong>Contribute</strong> to open a pre-filled fork on GitHub. Press{' '}
                <Box component="kbd" sx={kbdSx}>⌘K</Box> any time for the command palette.
            </>
        ),
    },
];

export default function OnboardingTour() {
    const [open, setOpen] = React.useState(false);
    const [step, setStep] = React.useState(0);

    React.useEffect(() => {
        try {
            const done = localStorage.getItem(TOUR_KEY);
            if (!done) {
                // Defer 600ms so the app paints first; tour appears as a
                // visible CTA, not a startup blocker.
                const t = setTimeout(() => setOpen(true), 600);
                return () => clearTimeout(t);
            }
        } catch {
            /* noop */
        }
    }, []);

    const close = () => {
        try { localStorage.setItem(TOUR_KEY, '1'); } catch {}
        setOpen(false);
    };

    if (!open) return null;
    const Step = STEPS[step];
    const Icon = Step.icon;
    const isLast = step === STEPS.length - 1;

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 1400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                p: 2,
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) close();
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 520,
                    background: 'var(--glass-modal)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid var(--glass-stroke)',
                    borderRadius: 3,
                    boxShadow: 'var(--shadow-modal)',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.75, borderBottom: '1px solid var(--glass-stroke)' }}>
                    <Box
                        sx={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'var(--accent-soft)',
                            color: 'primary.main',
                            display: 'grid', placeItems: 'center',
                        }}
                    >
                        <Icon sx={{ fontSize: 20 }} />
                    </Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{Step.title}</Typography>
                    <IconButton size="small" onClick={close} aria-label="Skip tour">
                        <CloseRoundedIcon />
                    </IconButton>
                </Box>

                <Box sx={{ px: 2.5, py: 2.5 }}>
                    <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.6 }}>
                        {Step.body}
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2.5,
                    py: 1.5,
                    borderTop: '1px solid var(--glass-stroke)',
                }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {STEPS.map((_, i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: i === step ? 18 : 6,
                                    height: 6,
                                    borderRadius: 3,
                                    background: i === step ? 'var(--accent)' : 'var(--glass-stroke-strong)',
                                    transition: 'all 0.18s',
                                }}
                            />
                        ))}
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Button onClick={close} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                        Skip
                    </Button>
                    {step > 0 && (
                        <Button onClick={() => setStep((s) => s - 1)} sx={{ textTransform: 'none' }}>
                            Back
                        </Button>
                    )}
                    {isLast ? (
                        <Button variant="contained" color="primary" onClick={close} sx={{ textTransform: 'none', borderRadius: 2 }}>
                            Got it
                        </Button>
                    ) : (
                        <Button variant="contained" color="primary" onClick={() => setStep((s) => s + 1)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                            Next
                        </Button>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
