import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { mergeTechniqueAndTestIntoForm } from '../../utils/aiResponseValidator';

function platformBadgeText(platforms) {
  if (!platforms) return '';
  if (Array.isArray(platforms)) return platforms.join(' · ');
  return String(platforms);
}

function executorName(test) {
  return test?.executor?.name || '—';
}

function descriptionPreview(desc, max = 160) {
  if (!desc || typeof desc !== 'string') return '';
  const collapsed = desc.replace(/\s+/g, ' ').trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed;
}

export default function UploadedAtomicSelection({
  base,
  atomicNames,
  techniqueId,
  techniqueName,
  open,
  setOpen,
  fileContent,
  setInputs,
  setLoadedSource,
  sourceType,
  sourceFilename,
  onBack,
}) {
  const tests = Array.isArray(fileContent?.atomic_tests) ? fileContent.atomic_tests : [];

  const handlePick = (idx) => {
    const test = tests[idx];
    const shape = mergeTechniqueAndTestIntoForm(fileContent, test);
    if (shape) setInputs({ ...base, ...shape });
    if (setLoadedSource) {
      if (sourceType === 'upload') {
        setLoadedSource({ type: 'upload', filename: sourceFilename });
      } else {
        setLoadedSource({ type: 'repo', tid: fileContent?.attack_technique || techniqueId });
      }
    }
    setOpen(false);
  };

  const handleClose = () => setOpen(false);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      sx={{
        '& .MuiDialog-container': { alignItems: 'flex-start' },
      }}
      PaperProps={{
        sx: {
          mt: { xs: '8vh', sm: '25vh' },
          mx: 2,
          width: 'min(720px, calc(100vw - 32px))',
          maxHeight: { xs: '85vh', sm: '64vh' },
          overflow: 'hidden',
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          borderRadius: 3,
        },
      }}
    >
      {/* ── Header ─────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: { xs: 1.75, sm: 2.5 },
          py: 1.5,
          borderBottom: '1px solid var(--glass-stroke)',
        }}
      >
        {onBack && (
          <Tooltip title="Back to repo browser">
            <IconButton size="small" onClick={onBack} sx={{ flexShrink: 0 }} aria-label="Back">
              <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {techniqueId && (
              <Box
                component="span"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'primary.main',
                  background: 'var(--accent-soft)',
                  border: '1px solid rgba(255, 92, 57, 0.3)',
                  borderRadius: 1,
                  px: 1,
                  py: 0.25,
                  fontWeight: 500,
                }}
              >
                {techniqueId}
              </Box>
            )}
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 600,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                flex: 1,
              }}
              title={techniqueName || ''}
            >
              {techniqueName || 'Atomic tests'}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: 11,
              color: 'var(--text-faint)',
              fontFamily: "'JetBrains Mono', monospace",
              mt: 0.25,
            }}
          >
            {tests.length} atomic {tests.length === 1 ? 'test' : 'tests'} · pick one to load
          </Typography>
        </Box>

        <IconButton size="small" onClick={handleClose} sx={{ flexShrink: 0 }} aria-label="Close">
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* ── Test list ──────────────────────────── */}
      <Box sx={{ overflow: 'auto', p: 1.25 }}>
        {tests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            No atomic tests in this technique.
          </Box>
        ) : (
          tests.map((test, idx) => {
            const name = test?.name || atomicNames[idx] || `Atomic ${idx + 1}`;
            const desc = descriptionPreview(test?.description);
            const platforms = platformBadgeText(test?.supported_platforms);
            const exec = executorName(test);
            const elevated = !!test?.executor?.elevation_required;

            return (
              <Box
                key={idx}
                onClick={() => handlePick(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePick(idx);
                  }
                }}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr',
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 1.5,
                  mb: 0.75,
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'all 0.12s',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255, 92, 57, 0.3)',
                    transform: 'translateX(2px)',
                  },
                  '&:focus-visible': {
                    outline: 'none',
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--accent-soft)',
                    border: '1px solid rgba(255, 92, 57, 0.25)',
                    color: 'primary.main',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: 'text.primary',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={name}
                    >
                      {name}
                    </Typography>
                    {elevated && (
                      <Tooltip title="Elevation required">
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            color: 'warning.main',
                            flexShrink: 0,
                          }}
                        >
                          <LockOutlinedIcon sx={{ fontSize: 13 }} />
                        </Box>
                      </Tooltip>
                    )}
                  </Box>

                  {desc && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: 'text.secondary',
                        mt: 0.5,
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {desc}
                    </Typography>
                  )}

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      mt: 0.75,
                      flexWrap: 'wrap',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10.5,
                      color: 'var(--text-faint)',
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <TerminalRoundedIcon sx={{ fontSize: 12 }} />
                      {exec}
                    </Box>
                    {platforms && (
                      <Box component="span">
                        {platforms}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Dialog>
  );
}
