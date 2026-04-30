import React from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: { xs: 4, md: 6 },
        px: { xs: 2, md: 3 },
        py: 3,
        borderTop: '1px solid var(--glass-stroke)',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <Box
        sx={{
          maxWidth: 1500,
          mx: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--text-faint)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            atomicgen.io
          </Box>
          <Box component="span" sx={{ opacity: 0.6 }}>·</Box>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'success.main',
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 12 }} />
            BYOK · no backend
          </Box>
          <Box component="span" sx={{ opacity: 0.6 }}>·</Box>
          <Box component="span">authoring tool for atomic-red-team</Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <Link
            href="https://github.com/krdmnbrk/atomicgen.io"
            target="_blank"
            rel="noopener"
            sx={{ color: 'inherit', '&:hover': { color: 'primary.main' } }}
          >
            GitHub
          </Link>
          <Box component="span" sx={{ opacity: 0.6 }}>·</Box>
          <Link
            href="https://github.com/redcanaryco/atomic-red-team"
            target="_blank"
            rel="noopener"
            sx={{ color: 'inherit', '&:hover': { color: 'primary.main' } }}
          >
            atomic-red-team
          </Link>
          <Box component="span" sx={{ opacity: 0.6 }}>·</Box>
          <Box component="span">v2</Box>
        </Box>
      </Box>
    </Box>
  );
}
