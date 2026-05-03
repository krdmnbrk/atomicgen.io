import React, { useState } from 'react';
import { ReactComponent as LogoIcon } from '../assets/images/logo.svg';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Box,
  IconButton,
  Link,
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import Tooltip from '@mui/material/Tooltip';
import {
  GitHub as GitHubIcon,
  LightMode as LightModeIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
} from '@mui/icons-material';

function Navbar({ darkMode, setDarkMode, onOpenLibrary }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const usefulLinks = [
    { text: 'Atomic Specs', url: 'https://github.com/redcanaryco/atomic-red-team/wiki/Sample-Spec' },
    { text: 'Contributing Guide', url: 'https://github.com/redcanaryco/atomic-red-team/wiki/Contributing' },
    { text: 'Atomic Red Team', url: 'https://atomicredteam.io' },
    { text: 'Invoke-AtomicRedTeam', url: 'https://www.atomicredteam.io/invoke-atomicredteam' },
    { text: 'Slack Workspace', url: 'https://slack.atomicredteam.io/' },
    { text: 'AttackRuleMap', url: 'https://attackrulemap.com/' },
  ];

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

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
          <Button
            color="inherit"
            aria-controls="useful-links-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              textTransform: 'none',
              borderRadius: 2.5,
              px: 1.75,
              py: 1,
              '&:hover': { background: 'var(--glass-strong)' },
            }}
          >
            <Typography fontSize={15}>Related Links</Typography>
          </Button>
          <Tooltip title="Related Links" placement="bottom">
            <IconButton
              aria-controls="useful-links-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
                borderRadius: 2.5,
                '&:hover': { background: 'var(--glass-strong)' },
              }}
            >
              <LaunchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            id="useful-links-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            slotProps={{
              paper: {
                sx: {
                  background: 'var(--glass-strong)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: '1px solid var(--glass-stroke)',
                  mt: 1,
                },
              },
            }}
          >
            {usefulLinks.map((link, index) => (
              <MenuItem
                key={index}
                component="a"
                href={link.url}
                target="_blank"
                onClick={handleMenuClose}
              >
                {link.text}
                <LaunchIcon fontSize="small" style={{ marginLeft: '5px' }} />
              </MenuItem>
            ))}
          </Menu>

          {onOpenLibrary && (
            <Tooltip title="My Tests library — saved drafts in your browser" placement="bottom">
              <IconButton
                onClick={onOpenLibrary}
                color="inherit"
                aria-label="Open My Tests library"
                sx={{
                  borderRadius: 2.5,
                  '&:hover': { background: 'var(--glass-strong)' },
                }}
              >
                <LibraryBooksRoundedIcon fontSize="medium" />
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
