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
import {
  GitHub as GitHubIcon,
  LightMode as LightModeIcon,
  DarkModeOutlined as DarkModeOutlinedIcon,
} from '@mui/icons-material';

function Navbar({ darkMode, setDarkMode }) {
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
        background: 'var(--glass)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid var(--glass-stroke)',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ display: 'flex', py: '6px', px: { xs: 2, md: 3.5 } }}>
        <Link
          underline="none"
          href="https://atomicgen.io"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', flex: 1 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              py: '6px',
            }}
          >
            <LogoIcon
              style={{
                width: '45px',
                height: '45px',
                marginRight: '20px',
              }}
            />
            <Box>
              <Typography className="headerTitle" variant="h5" component="div">
                atomicgen.io
              </Typography>
              <Typography
                className="headerTitle"
                variant="subtitle2"
                component="div"
                sx={{ color: 'text.secondary' }}
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
          }}
        >
          <Button
            color="inherit"
            aria-controls="useful-links-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            sx={{
              textTransform: 'none',
              borderRadius: 2.5,
              px: 1.75,
              py: 1,
              '&:hover': { background: 'var(--glass-strong)' },
            }}
          >
            <Typography fontSize={15}>Related Links</Typography>
          </Button>
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
