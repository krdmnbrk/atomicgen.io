import React from 'react';
import { ReactComponent as LogoIcon } from '../assets/images/logo.svg';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Link,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import Tooltip from '@mui/material/Tooltip';
import {
  GitHub as GitHubIcon,
  LightMode as LightModeIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
} from '@mui/icons-material';

function Navbar({ darkMode, setDarkMode, onOpenSettings, onOpenHelp }) {

  const handleThemeToggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'var(--glass-strong)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        borderBottom: '1px solid var(--glass-stroke)',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ display: 'flex', py: '6px', px: { xs: 1.5, md: 3.5 }, minHeight: { xs: 56, sm: 64 }, gap: 0.5 }}>
        <Link
          underline="none"
          href="https://atomicgen.io"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              py: '6px',
              minWidth: 0,
            }}
          >
            <LogoIcon
              style={{
                width: 'clamp(34px, 8vw, 45px)',
                height: 'clamp(34px, 8vw, 45px)',
                marginRight: '14px',
                flexShrink: 0,
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                className="headerTitle"
                variant="h5"
                component="div"
                sx={{
                  fontSize: { xs: 18, sm: 22, md: 24 },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                atomicgen.io
              </Typography>
              <Typography
                className="headerTitle"
                variant="subtitle2"
                component="div"
                sx={{
                  color: 'text.secondary',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                atomic test generator
              </Typography>
            </Box>
          </Box>
        </Link>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          <Tooltip
            title="atomicgen.io has no backend. AI keys (BYOK) and prompts stay in your browser; nothing is logged or proxied."
            placement="bottom"
          >
            <Box
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                borderRadius: 1.5,
                border: '1px solid var(--glass-stroke)',
                background: 'var(--glass-strong)',
                color: 'success.main',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
                mr: 1.5,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 13 }} />
              BYOK · no backend
            </Box>
          </Tooltip>
          <Tooltip title="BYOK · no backend — keys & prompts stay in your browser" placement="bottom">
            <Box
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                alignItems: 'center',
                px: 0.9,
                py: 0.6,
                borderRadius: 1.5,
                border: '1px solid var(--glass-stroke)',
                background: 'var(--glass-strong)',
                color: 'success.main',
                mr: 0.5,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 14 }} />
            </Box>
          </Tooltip>
          {onOpenHelp && (
            <Tooltip title="Help & docs · keyboard shortcuts" placement="bottom">
              <IconButton
                onClick={onOpenHelp}
                color="inherit"
                aria-label="Open help & docs"
                sx={{
                  borderRadius: 2.5,
                  '&:hover': { background: 'var(--glass-strong)' },
                }}
              >
                <HelpOutlineRoundedIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          )}
          {onOpenSettings && (
            <Tooltip title="Settings — AI provider · API key · model" placement="bottom">
              <IconButton
                onClick={onOpenSettings}
                color="inherit"
                aria-label="Open settings"
                sx={{
                  borderRadius: 2.5,
                  '&:hover': { background: 'var(--glass-strong)' },
                }}
              >
                <TuneRoundedIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          )}

          <IconButton
            component="a"
            href="https://github.com/krdmnbrk/atomicgen.io"
            target="_blank"
            color="inherit"
            sx={{
              borderRadius: 2.5,
              '&:hover': { background: 'var(--glass-strong)' },
            }}
          >
            <GitHubIcon fontSize="medium" />
          </IconButton>

          <IconButton
            onClick={handleThemeToggle}
            color="inherit"
            sx={{
              borderRadius: 2.5,
              '&:hover': { background: 'var(--glass-strong)' },
            }}
          >
            {darkMode ? <DarkModeOutlinedIcon fontSize="medium" /> : <LightModeIcon fontSize="medium" />}
          </IconButton>
        </Box>
      </Toolbar>

      <Box
        sx={{
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, var(--accent) 30%, var(--accent-2) 50%, var(--accent) 70%, transparent)',
          opacity: 0.6,
        }}
      />
    </AppBar>
  );
}

export default Navbar;
