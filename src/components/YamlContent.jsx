import React, { useEffect } from 'react';
import yaml from 'js-yaml';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import Editor from './Editor';

const downloadStringAsFile = (filename, content) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Build a single atomic_test object from the form inputs.
// Drops the technique-level fields (attack_technique, display_name, auto_generated_guid)
// because those are placed at the top-level wrapper.
const atomic_test_from_inputs = (inputs) => {
  const test = {};
  const TECHNIQUE_FIELDS = new Set(['attack_technique', 'display_name', 'auto_generated_guid']);
  Object.keys(inputs).forEach((key) => {
    if (TECHNIQUE_FIELDS.has(key)) return;
    if (key === 'input_arguments') {
      test['input_arguments'] = {};
      inputs.input_arguments.forEach((input) => {
        if (!input.name) return;
        test['input_arguments'][input.name] = {
          type: input['type'],
          default: input['default'],
          description: input['description'],
        };
      });
    } else if (key === 'executor') {
      // Drop executor sub-fields based on executor type.
      const exec = { ...inputs.executor };
      if (exec.name === 'manual') {
        delete exec.command;
        delete exec.cleanup_command;
      } else {
        delete exec.steps;
      }
      test['executor'] = exec;
    } else {
      test[key] = inputs[key];
    }
  });
  if (inputs.auto_generated_guid) {
    test.auto_generated_guid = inputs.auto_generated_guid;
  }
  return test;
};

// Wrap a single atomic_test in the canonical Atomic Red Team technique-level shape.
const buildTechniqueWrapper = (inputs) => {
  return {
    attack_technique: inputs.attack_technique || null,
    display_name: inputs.display_name || null,
    atomic_tests: [atomic_test_from_inputs(inputs)],
  };
};

// Strip null/undefined and empty containers, but preserve intentionally-empty strings
// (e.g. input_arguments[*].default = "") since AT corpus uses those.
function cleanObject(obj) {
  if (Array.isArray(obj)) {
    return obj
      .map(cleanObject)
      .filter(
        (item) =>
          item !== null &&
          item !== undefined &&
          !(Array.isArray(item) && item.length === 0)
      );
  } else if (typeof obj === 'object' && obj !== null) {
    const cleanedObject = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value);
      if (
        cleanedValue !== null &&
        cleanedValue !== undefined &&
        !(Array.isArray(cleanedValue) && cleanedValue.length === 0) &&
        !(typeof cleanedValue === 'object' && !Array.isArray(cleanedValue) && Object.keys(cleanedValue).length === 0)
      ) {
        cleanedObject[key] = cleanedValue;
      }
    }
    return cleanedObject;
  }
  // null/undefined → drop. Empty strings are PRESERVED.
  return obj === null || obj === undefined ? undefined : obj;
}

// Force `|` block scalar style for any multi-line string the YAML dumper encounters.
// Without this js-yaml may emit folded or quoted forms that don't match AT corpus style.
const yamlDumpOpts = {
  lineWidth: -1,
  noRefs: true,
  styles: { '!!null': 'empty' },
  // Per-key scalar style hints
  replacer: undefined,
};

function dumpAtomicYaml(wrapper) {
  return yaml.dump(wrapper, {
    ...yamlDumpOpts,
    // Prefer literal block scalar for any multi-line string
    forceQuotes: false,
    quotingType: '"',
  });
}

function YamlContent({ darkMode, inputs, setInputs, updated, base, validationErrors, setChanged, changed, onReset }) {
  const [formatted_yaml, setFormattedYaml] = React.useState(null);
  const [showContent, setShowContent] = React.useState(false);
  const [showValidationErrors, setShowValidationErrors] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Map validation error message → form input id, used by jump-to-field
  const ERROR_TO_FIELD_ID = {
    'MITRE ATT&CK technique (T####)': 'attack_technique',
    'Technique display name': 'display_name',
    'Test name': 'name',
    'Test description': 'description',
    'Supported platforms': 'supported-platforms',
    'Attack command': 'attack-command-editor',
    'Attack executor name': 'attack_executor_select',
  };

  const jumpToFirstError = () => {
    if (!validationErrors.length) return;
    const first = validationErrors[0];
    const id = ERROR_TO_FIELD_ID[first];
    if (id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus if input
        if (typeof el.focus === 'function' && el.tagName === 'INPUT') {
          setTimeout(() => el.focus(), 400);
        }
      }
    }
  };

  const showValidationErrorHandler = () => {
    if (validationErrors.length > 0) {
      setShowValidationErrors(true);
      jumpToFirstError();
    }
  };

  useEffect(() => {
    const wrapper = cleanObject(buildTechniqueWrapper(inputs));
    // Post-process: force `|` block scalar for any multi-line string field.
    setFormattedYaml(dumpAtomicYaml(wrapper).replace(
      /^( *)([a-z_]+): "((?:[^"\\]|\\.)*\\n(?:[^"\\]|\\.)*)"$/gm,
      (_, indent, key, body) => {
        const decoded = body.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const inner = decoded
          .split('\n')
          .map((line) => indent + '  ' + line)
          .join('\n');
        return `${indent}${key}: |\n${inner}`;
      }
    ));
    if (validationErrors.length === 0) {
      setShowValidationErrors(false);
    }
  }, [inputs, validationErrors.length]);

  useEffect(() => {
    setShowContent(updated && formatted_yaml !== '{}\n');
  }, [updated, formatted_yaml]);

  const resetButtonHandle = () => {
    if (typeof onReset === 'function') {
      onReset();
      return;
    }
    // Fallback (no parent handler) — silent reset, no confirm
    setInputs(base);
    setChanged(false);
  };

  const downloadButtonHandle = () => {
    setChanged(false);
    showValidationErrorHandler();
    if (inputs.name === null || inputs.name === undefined || inputs.name.trim() === '') {
      alert('Name is required to download the file.');
      return;
    }
    const filename = inputs.name.replace(/ /g, '_').toLowerCase() + '.yaml';
    downloadStringAsFile(filename, formatted_yaml);
  };

  const [copiedSnippet, setCopiedSnippet] = React.useState(false);
  const invokeAtomicSnippet = (() => {
    const tid = (inputs.attack_technique || '').trim();
    const guid = (inputs.auto_generated_guid || '').trim();
    if (!tid) return null;
    if (guid) return `Invoke-AtomicTest ${tid} -TestGuids ${guid}`;
    return `Invoke-AtomicTest ${tid}`;
  })();
  const copyInvokeSnippet = async () => {
    if (!invokeAtomicSnippet) return;
    try {
      await navigator.clipboard.writeText(invokeAtomicSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyButtonHandler = async () => {
    showValidationErrorHandler();
    setChanged(false);
    try {
      await navigator.clipboard.writeText(formatted_yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('Clipboard API failed, falling back to textarea method.', error);
      const textarea = document.createElement('textarea');
      textarea.value = formatted_yaml;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (execError) {
        console.error('Failed to copy content using fallback method:', execError);
        alert('Failed to copy content. Please try manually.');
      }
      document.body.removeChild(textarea);
    }
  };

  const errorCount = validationErrors.length;
  const hasErrors = errorCount > 0;

  const iconBtnSx = {
    width: 30,
    height: 30,
    border: '1px solid var(--glass-stroke)',
    borderRadius: 1.25,
    color: 'text.secondary',
    transition: 'all 0.12s',
    '&:hover': {
      background: 'var(--glass-strong)',
      color: 'text.primary',
      borderColor: 'var(--glass-stroke-strong)',
    },
    '&.Mui-disabled': { opacity: 0.4 },
  };

  return (
    <Paper
      elevation={0}
      role="region"
      aria-label="YAML preview"
      sx={{
        background: 'var(--glass)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid var(--glass-stroke)',
        borderRadius: 3,
        boxShadow: 'var(--shadow-glow)',
        overflow: 'hidden',
        position: 'sticky',
        top: { xs: 'auto', md: 100 },
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { md: 'calc(100vh - 130px)' },
      }}
    >
      {/* Head */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 2 },
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1.25, sm: 1.75 },
          borderBottom: '1px solid var(--glass-stroke)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.25 }, minWidth: 0 }}>
          <Box
            sx={{
              fontSize: 11,
              fontWeight: 600,
              color: 'text.secondary',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>YAML preview</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>YAML</Box>
          </Box>
          {showContent && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 11,
              color: hasErrors ? 'error.main' : 'success.main',
              background: hasErrors ? 'rgba(229, 72, 77, 0.10)' : 'rgba(77, 221, 150, 0.10)',
              border: '1px solid',
              borderColor: hasErrors ? 'rgba(229, 72, 77, 0.30)' : 'rgba(77, 221, 150, 0.30)',
              px: 1,
              py: 0.4,
              borderRadius: 12,
              backdropFilter: 'blur(12px)',
              cursor: hasErrors ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onClick={hasErrors ? showValidationErrorHandler : undefined}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: hasErrors ? 'error.main' : 'success.main',
                boxShadow: `0 0 6px ${hasErrors ? '#E5484D' : '#4DDD96'}`,
              }}
            />
            {hasErrors
              ? `${errorCount} error${errorCount === 1 ? '' : 's'}`
              : <Box component="span"><Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>0 errors</Box><Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>OK</Box></Box>}
          </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip
            title={
              copiedSnippet
                ? 'Copied!'
                : invokeAtomicSnippet
                ? `Copy: ${invokeAtomicSnippet}`
                : 'Set ATT&CK technique to enable Invoke-AtomicTest snippet'
            }
          >
            <span>
              <IconButton
                disabled={!invokeAtomicSnippet}
                onClick={copyInvokeSnippet}
                sx={iconBtnSx}
                aria-label="Copy Invoke-AtomicTest snippet"
              >
                {copiedSnippet ? (
                  <CheckRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <TerminalRoundedIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={`Download${changed ? ' *' : ''}`}>
            <span>
              <IconButton disabled={!showContent} onClick={downloadButtonHandle} sx={iconBtnSx} aria-label="Download YAML">
                <DownloadRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={copied ? 'Copied!' : `Copy${changed ? ' *' : ''}`}>
            <span>
              <IconButton disabled={!showContent} onClick={copyButtonHandler} sx={iconBtnSx}>
                {copied ? (
                  <CheckRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Reset">
            <span>
              <IconButton disabled={!showContent} onClick={resetButtonHandle} sx={iconBtnSx}>
                <RestartAltRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Validation alert */}
      {showValidationErrors && (
        <Box sx={{ p: 2, pb: 0 }}>
          <Alert variant="outlined" severity="warning" sx={{ borderRadius: 2 }}>
            <Typography component="span" sx={{ fontWeight: 500 }}>
              Some required fields are missing.
            </Typography>
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {[...new Set(validationErrors)].map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </Box>
          </Alert>
        </Box>
      )}

      {/* Body */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {showContent ? (
          <Editor
            darkMode={darkMode}
            name="yaml-content"
            value={formatted_yaml}
            mode="yaml"
            readOnly={true}
            highlightActiveLine={false}
            maxLines={500}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 320,
              gap: 2,
              p: 2,
            }}
          >
            <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
              <DescriptionOutlinedIcon
                sx={{ fontSize: 36, color: 'var(--text-faint)', mb: 1 }}
              />
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'text.secondary',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  mb: 0.5,
                }}
              >
                Get started
              </Typography>
              <Typography sx={{ fontSize: 15, color: 'text.primary', mb: 2 }}>
                Author Atomic Red Team tests, fast.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', maxWidth: 360 }}>
              {[
                {
                  num: '1',
                  title: 'Describe a test in plain English',
                  hint: 'AI bar above — type what you want, refine until it fits.',
                  action: () => {
                    const ai = document.querySelector('input[placeholder*="Describe a test"]');
                    if (ai) {
                      ai.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setTimeout(() => ai.focus(), 350);
                    }
                  },
                },
                {
                  num: '2',
                  title: 'Browse existing atomic-red-team tests',
                  hint: 'Load any T-ID and adapt it to your environment.',
                  action: () => {
                    const btn = [...document.querySelectorAll('button')].find(
                      (b) => b.textContent.trim() === 'Load from Repo'
                    );
                    btn?.click();
                  },
                },
                {
                  num: '3',
                  title: 'Author from scratch',
                  hint: 'Fill the form below; YAML appears here as you type.',
                  action: () => {
                    const name = document.querySelector('input[name="name"]');
                    if (name) {
                      name.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setTimeout(() => name.focus(), 350);
                    }
                  },
                },
              ].map((step) => (
                <Box
                  key={step.num}
                  role="button"
                  tabIndex={0}
                  onClick={step.action}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      step.action();
                    }
                  }}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                    p: 1.5,
                    background: 'var(--glass-inset)',
                    border: '1px solid var(--glass-stroke)',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.14s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      background: 'var(--accent-soft)',
                      transform: 'translateX(2px)',
                    },
                    '&:focus-visible': {
                      outline: 'none',
                      borderColor: 'primary.main',
                      boxShadow: '0 0 0 3px rgba(255, 92, 57, 0.15)',
                    },
                  }}
                >
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
                    {step.num}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>
                      {step.title}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                      {step.hint}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

export default YamlContent;
