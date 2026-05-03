import React, { useState, useEffect, useRef } from 'react';
import Inputs from './components/Inputs';
import YamlContent from './components/YamlContent';
import Navbar from './components/Navbar';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { ConfirmProvider } from './components/ConfirmDialog';
import MyTestsLibrary from './components/MyTestsLibrary';
import { inputsToYaml } from './utils/atomicYaml';
import { decodeStateFromHash, clearShareHash } from './utils/shareUrl';

const executor_names = [
  "powershell",
  "command_prompt",
  "bash",
  "sh",
  "manual",
];

const supported_platforms = [
  "Windows",
  "Macos",
  "Linux",
  "Office-365",
  "Azure-AD",
  "Google-Workspace",
  "SaaS",
  "IaaS",
  "Containers",
  "IaaS:gcp",
  "IaaS:azure",
  "IaaS:aws",
].map((name) => name.toLowerCase());

// Base Inputs — full Atomic Red Team technique-level shape
const base = {
  attack_technique: null,
  display_name: null,
  name: null,
  description: null,
  supported_platforms: [],
  input_arguments: [],
  dependency_executor_name: "",
  dependencies: [],
  executor: {
    command: null,
    cleanup_command: null,
    steps: null,
    name: "",
    elevation_required: false,
  },
  auto_generated_guid: null,
};

// Validation Rules
const validationRules = {
  attack_technique: { required: true, errorMessage: 'MITRE ATT&CK technique (T####)' },
  display_name: { required: true, errorMessage: 'Technique display name' },
  name: { required: true, errorMessage: 'Test name' },
  description: { required: true, errorMessage: 'Test description' },
  supported_platforms: { required: true, errorMessage: 'Supported platforms' },
  input_arguments: {
    required: false,
    nestedValidation: {
      type: { required: true, errorMessage: 'Input type' },
      name: { required: true, errorMessage: 'Input name' },
      default: { required: false },
    },
  },
  dependency_executor_name: { required: false },
  dependencies: {
    required: false,
    nestedValidation: {
      description: { required: true, errorMessage: 'Dependency description' },
      prereq_command: { required: true, errorMessage: 'Dependency check command' },
      get_prereq_command: { required: false },
    },
  },
  executor: {
    required: true,
    nestedValidation: {
      command: { required: true, errorMessage: 'Attack command' },
      cleanup_command: { required: false },
      name: { required: true, errorMessage: 'Attack executor name' },
      elevation_required: { required: false },
    },
  },
};

// Validate Inputs Function (original recursive logic — must handle arrays vs objects distinctly)
const validateInputs = (data, rules) => {
  const errors = [];
  Object.keys(rules).forEach((key) => {
    const rule = rules[key];
    const value = data[key];

    // Required Field Check
    if (rule.required) {
      if (
        (Array.isArray(value) && value.length === 0) ||
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === "")
      ) {
        errors.push(rule.errorMessage);
      }
    }

    // Nested Validation: Array — iterate each item with nested rules
    if (rule.nestedValidation && Array.isArray(value)) {
      value.forEach((item) => {
        const nestedErrors = validateInputs(item, rule.nestedValidation);
        nestedErrors.forEach((error) => errors.push(error));
      });
    }

    // Nested Validation: Object
    if (rule.nestedValidation && typeof value === 'object' && !Array.isArray(value) && value !== null) {
      const nestedErrors = validateInputs(value, rule.nestedValidation);
      nestedErrors.forEach((error) => errors.push(error));
    }
  });
  return errors;
};


const DRAFT_KEY = 'atomicgen.form.draft';
const DRAFT_DEBOUNCE_MS = 800;

function App() {
  const [errors, setErrors] = useState([]);
  const [inputButtonErrors, setInputButtonErrors] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [inputs, setInputs] = useState(base);
  const [darkMode, setDarkMode] = useState(true);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [changed, setChanged] = useState(false);
  // Source provenance — set by RepoLoader / UploadButton / AiAssistant when they hydrate the form
  const [loadedSource, setLoadedSource] = useState(null);
  // Snapshot of YAML at the moment a test was loaded — used by the Diff tab
  // so users can see exactly what they've changed since hydration.
  const [originalSnapshot, setOriginalSnapshot] = useState(null);
  // Draft restore prompt (shown on initial load if a saved draft exists)
  const [draftRestoreOpen, setDraftRestoreOpen] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);
  // Share-via-URL pending state
  const [shareRestoreOpen, setShareRestoreOpen] = useState(false);
  const [pendingShare, setPendingShare] = useState(null);
  // My Tests library drawer
  const [libraryOpen, setLibraryOpen] = useState(false);
  const loadFromLibrary = (libInputs) => {
    setInputs(libInputs);
    setLoadedSource({ type: 'library' });
  };
  // Reset undo (10s window)
  const [undoSnack, setUndoSnack] = useState({ open: false, snapshot: null });
  const undoTimerRef = useRef(null);

  // On mount: shared link in URL takes precedence over draft restore.
  useEffect(() => {
    const shared = decodeStateFromHash(window.location.hash);
    if (shared) {
      setPendingShare(shared);
      setShareRestoreOpen(true);
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && JSON.stringify(parsed) !== JSON.stringify(base)) {
          setSavedDraft(parsed);
          setDraftRestoreOpen(true);
        }
      }
    } catch { /* ignore corrupt drafts */ }
  }, []);

  // Debounced autosave of `inputs` to localStorage
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (JSON.stringify(inputs) === JSON.stringify(base)) {
          localStorage.removeItem(DRAFT_KEY);
        } else {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(inputs));
        }
      } catch { /* ignore quota errors */ }
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [inputs]);

  const restoreDraft = () => {
    if (savedDraft) {
      setInputs(savedDraft);
    }
    setDraftRestoreOpen(false);
    setSavedDraft(null);
    setLoadedSource({ type: 'draft' });
  };

  const dismissDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestoreOpen(false);
    setSavedDraft(null);
  };

  const restoreShared = () => {
    if (pendingShare) {
      setInputs(pendingShare);
      setLoadedSource({ type: 'shared' });
    }
    clearShareHash();
    setShareRestoreOpen(false);
    setPendingShare(null);
  };

  const dismissShared = () => {
    clearShareHash();
    setShareRestoreOpen(false);
    setPendingShare(null);
  };

  // Reset with undo
  const resetWithUndo = () => {
    const snapshot = { inputs, source: loadedSource, originalSnapshot };
    setInputs(base);
    setChanged(false);
    setLoadedSource(null);
    setOriginalSnapshot(null);
    setUndoSnack({ open: true, snapshot });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoSnack({ open: false, snapshot: null });
    }, 10000);
  };
  const undoReset = () => {
    if (undoSnack.snapshot) {
      setInputs(undoSnack.snapshot.inputs);
      setLoadedSource(undoSnack.snapshot.source);
      setOriginalSnapshot(undoSnack.snapshot.originalSnapshot || null);
    }
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoSnack({ open: false, snapshot: null });
  };

  // Snapshot the YAML when a test is loaded from anywhere (repo / upload /
  // sample / AI / draft). Intentionally only depends on `loadedSource` —
  // setInputs + setLoadedSource batch in the same handler, so by the time
  // this effect runs, `inputs` already reflects the loaded test.
  useEffect(() => {
    if (loadedSource) {
      setOriginalSnapshot(inputsToYaml(inputs));
    } else {
      setOriginalSnapshot(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedSource]);

  // Prevent page reload
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (changed) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [changed]);


  // Check screen orientation
  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const cachedTheme = localStorage.getItem('darkMode');
    if (cachedTheme !== null) {
      setDarkMode(cachedTheme === 'true');
    }
  }, []);

  // Check if inputs are updated
  useEffect(() => {
    if (JSON.stringify(inputs) === JSON.stringify(base)) {
      setUpdated(false);
      setChanged(false);
    } else {
      setUpdated(true);
      setChanged(true);
    }
  }, [inputs]);

  // Validate inputs
  useEffect(() => {
    setInputButtonErrors([]);
    if (updated) {

      const errors = validateInputs(inputs, validationRules);
      setValidationErrors(errors);
    } else {
      setValidationErrors([]);
    }
  }, [updated, inputs]);

  // Liquid Glass — Dark
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#FF5C39', light: '#FF8A66', dark: '#E04A1E', contrastText: '#fff' },
      secondary: { main: '#FF8A66' },
      success: { main: '#4DDD96' },
      warning: { main: '#F5B74E' },
      error: { main: '#E5484D' },
      info: { main: '#6FA9FF' },
      background: {
        default: '#07080B',
        paper: 'rgba(20, 24, 32, 0.55)',
      },
      text: {
        primary: '#F0F2F5',
        secondary: '#9AA3AE',
        disabled: '#5E6772',
      },
      divider: 'rgba(255, 255, 255, 0.08)',
    },
    typography: {
      fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
    shape: { borderRadius: 12 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: 'rgba(20, 24, 32, 0.72)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.08), 0 32px 80px -16px rgba(0, 0, 0, 0.65)',
            borderRadius: 16,
            backgroundImage: 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            background: 'rgba(20, 24, 32, 0.72)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.06), 0 16px 40px -8px rgba(0, 0, 0, 0.5)',
            backgroundImage: 'none',
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            background: 'rgba(20, 24, 32, 0.72)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.06), 0 16px 40px -8px rgba(0, 0, 0, 0.5)',
            backgroundImage: 'none',
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            '&.MuiBackdrop-invisible': {
              backgroundColor: 'transparent',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            },
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          'code, pre, .mono': { fontFamily: "'JetBrains Mono', ui-monospace, monospace" },
        },
      },
    },
  });

  // Liquid Glass — Light
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#E04A1E', light: '#FF7A57', dark: '#C13C12', contrastText: '#fff' },
      secondary: { main: '#FF7A57' },
      success: { main: '#1F9D67' },
      warning: { main: '#C28419' },
      error: { main: '#C63842' },
      info: { main: '#2A6FCC' },
      background: {
        default: '#F2EEEA',
        paper: 'rgba(255, 255, 255, 0.65)',
      },
      text: {
        primary: '#14161A',
        secondary: '#56606C',
        disabled: '#8A929E',
      },
      divider: 'rgba(0, 0, 0, 0.06)',
    },
    typography: {
      fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
    shape: { borderRadius: 12 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: 'rgba(252, 252, 250, 0.78)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.06), 0 32px 80px -16px rgba(0, 0, 0, 0.18)',
            borderRadius: 16,
            backgroundImage: 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            background: 'rgba(252, 252, 250, 0.78)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.04), 0 16px 40px -8px rgba(0, 0, 0, 0.14)',
            backgroundImage: 'none',
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            background: 'rgba(252, 252, 250, 0.78)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.04), 0 16px 40px -8px rgba(0, 0, 0, 0.14)',
            backgroundImage: 'none',
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(0, 0, 0, 0.18)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            '&.MuiBackdrop-invisible': {
              backgroundColor: 'transparent',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            },
          },
        },
      },
    },
  });

  // Global styles — gradient mesh + noise + glass utilities
  const globalStyles = (
    <GlobalStyles
      styles={(theme) => ({
        ':root': {
          '--accent': theme.palette.primary.main,
          '--accent-2': theme.palette.primary.light,
          '--accent-soft': darkMode ? 'rgba(255, 92, 57, 0.15)' : 'rgba(224, 74, 30, 0.12)',
          '--glass': darkMode ? 'rgba(20, 24, 32, 0.55)' : 'rgba(255, 255, 255, 0.65)',
          '--glass-strong': darkMode ? 'rgba(20, 24, 32, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          '--glass-modal': darkMode ? 'rgba(20, 24, 32, 0.72)' : 'rgba(252, 252, 250, 0.78)',
          '--glass-stroke': darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          '--glass-stroke-strong': darkMode ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)',
          '--glass-inset': darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
          '--shadow-glow': darkMode
            ? '0 0 0 1px rgba(255, 255, 255, 0.06), 0 24px 60px -20px rgba(0, 0, 0, 0.65)'
            : '0 0 0 1px rgba(0, 0, 0, 0.04), 0 24px 60px -20px rgba(0, 0, 0, 0.16)',
          '--shadow-modal': darkMode
            ? '0 0 0 1px rgba(255, 255, 255, 0.10), 0 32px 80px -16px rgba(0, 0, 0, 0.85)'
            : '0 0 0 1px rgba(0, 0, 0, 0.06), 0 32px 80px -16px rgba(0, 0, 0, 0.20)',
          '--text-faint': darkMode ? '#5E6772' : '#8A929E',
        },
        body: {
          margin: 0,
          background: theme.palette.background.default,
          color: theme.palette.text.primary,
          minHeight: '100vh',
          overflowX: 'hidden',
          fontFamily: "'Inter', system-ui, sans-serif",
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        },
        'body::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          background: darkMode
            ? `radial-gradient(ellipse 70% 60% at 18% 12%, rgba(99, 65, 175, 0.28), transparent 65%),
               radial-gradient(ellipse 80% 70% at 86% 90%, rgba(48, 110, 190, 0.22), transparent 65%)`
            : `radial-gradient(ellipse 70% 60% at 18% 12%, rgba(160, 130, 220, 0.22), transparent 65%),
               radial-gradient(ellipse 80% 70% at 86% 90%, rgba(110, 165, 220, 0.20), transparent 65%)`,
          pointerEvents: 'none',
        },
        'code, pre, .mono': {
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        },
        // Visually-hidden skip-link surface
        '.skip-link': {
          position: 'absolute',
          top: 0,
          left: 0,
          padding: '8px 14px',
          background: theme.palette.primary.main,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 6,
          margin: 8,
          textDecoration: 'none',
          transform: 'translateY(-150%)',
          transition: 'transform 0.18s',
          zIndex: 9999,
        },
        '.skip-link:focus': {
          transform: 'translateY(0)',
          outline: '2px solid #fff',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.001ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.001ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      })}
    />
  );

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      {globalStyles}
      <ConfirmProvider>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenLibrary={() => setLibraryOpen(true)}
      />
      <Box id="main-content" component="main" sx={{ p: { xs: 2, md: 3 }, maxWidth: 1500, mx: 'auto' }}>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid size={isPortrait ? 12 : 6}>
            <Inputs
              base={base}
              darkMode={darkMode}
              changed={changed}
              setChanged={setChanged}
              executor_names={executor_names}
              supported_platforms={supported_platforms}
              inputs={inputs}
              setInputs={setInputs}
              errors={errors}
              setErrors={setErrors}
              inputButtonErrors={inputButtonErrors}
              setInputButtonErrors={setInputButtonErrors}
              loadedSource={loadedSource}
              setLoadedSource={setLoadedSource}
            />
          </Grid>
          <Grid size={isPortrait ? 12 : 6}>
            <YamlContent
              darkMode={darkMode}
              base={base}
              errors={errors}
              setErrors={setErrors}
              inputs={inputs}
              setInputs={setInputs}
              updated={updated}
              validationErrors={validationErrors}
              setChanged={setChanged}
              changed={changed}
              onReset={resetWithUndo}
              originalSnapshot={originalSnapshot}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Restore shared-via-URL prompt (takes precedence over draft) */}
      <Snackbar
        open={shareRestoreOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClose={() => {}}
      >
        <Alert
          severity="info"
          variant="outlined"
          sx={{ borderRadius: 2, alignItems: 'center', backdropFilter: 'blur(20px)', background: 'var(--glass-modal)' }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" size="small" onClick={dismissShared}>
                Dismiss
              </Button>
              <Button color="primary" size="small" variant="contained" onClick={restoreShared}>
                Load shared
              </Button>
            </Box>
          }
        >
          A shared atomic test is encoded in this URL.
        </Alert>
      </Snackbar>

      {/* Restore draft prompt */}
      <Snackbar
        open={draftRestoreOpen && !shareRestoreOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClose={() => {}}
      >
        <Alert
          severity="info"
          variant="outlined"
          sx={{ borderRadius: 2, alignItems: 'center', backdropFilter: 'blur(20px)', background: 'var(--glass-modal)' }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" size="small" onClick={dismissDraft}>
                Discard
              </Button>
              <Button color="primary" size="small" variant="contained" onClick={restoreDraft}>
                Restore
              </Button>
            </Box>
          }
        >
          Found an unsaved draft from your last session.
        </Alert>
      </Snackbar>

      {/* Reset undo */}
      <Snackbar
        open={undoSnack.open}
        autoHideDuration={10000}
        onClose={() => setUndoSnack({ open: false, snapshot: null })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="outlined"
          sx={{ borderRadius: 2, backdropFilter: 'blur(20px)', background: 'var(--glass-modal)' }}
          action={
            <Button color="primary" size="small" onClick={undoReset}>
              Undo
            </Button>
          }
        >
          Form reset.
        </Alert>
      </Snackbar>

      <MyTestsLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        currentInputs={inputs}
        onLoad={loadFromLibrary}
        formIsModified={changed}
      />

      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;
