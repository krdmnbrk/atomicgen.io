import React, { useEffect } from 'react';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import RadarRoundedIcon from '@mui/icons-material/RadarRounded';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Editor from './Editor';
import LintPanel from './LintPanel';
import DetectionExportModal from './DetectionExportModal';
import ContributeModal from './ContributeModal';
import DryRunPreview from './DryRunPreview';
import DiffViewer from './DiffViewer';
import useLintFindings from '../hooks/useLintFindings';
import { summarizeFindings } from '../utils/atLinter';
import { inputsToYaml, inputsToAtomicTestObject } from '../utils/atomicYaml';

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

function YamlContent({ darkMode, inputs, setInputs, updated, base, validationErrors, setChanged, changed, onReset, originalSnapshot }) {
  const [formatted_yaml, setFormattedYaml] = React.useState(null);
  const [showContent, setShowContent] = React.useState(false);
  const [showLintPanel, setShowLintPanel] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Unified lint findings (required-field validation + AT-spec lint).
  const lintFindings = useLintFindings(inputs, validationErrors);
  const lintCounts = summarizeFindings(lintFindings);

  const jumpToField = React.useCallback((fieldId) => {
    if (!fieldId) return;
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof el.focus === 'function' && el.tagName === 'INPUT') {
        setTimeout(() => el.focus(), 400);
      }
    }
  }, []);

  const jumpToFirstError = React.useCallback(() => {
    const first = lintFindings.find((f) => f.severity === 'error');
    if (first?.field) jumpToField(first.field);
  }, [lintFindings, jumpToField]);

  const showValidationErrorHandler = React.useCallback(() => {
    if (lintCounts.error > 0) {
      setShowLintPanel(true);
      jumpToFirstError();
    }
  }, [lintCounts.error, jumpToFirstError]);

  useEffect(() => {
    setFormattedYaml(inputsToYaml(inputs));
    if (lintFindings.length === 0) {
      setShowLintPanel(false);
    }
  }, [inputs, lintFindings.length]);

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

  const [detectionOpen, setDetectionOpen] = React.useState(false);
  const [contributeOpen, setContributeOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('yaml');
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

  const errorCount = lintCounts.error;
  const warningCount = lintCounts.warning;
  const infoCount = lintCounts.info;
  const hasErrors = errorCount > 0;
  const hasWarnings = !hasErrors && warningCount > 0;
  const hasInfo = !hasErrors && !hasWarnings && infoCount > 0;
  const badgeColor = hasErrors ? 'error.main' : hasWarnings ? 'warning.main' : hasInfo ? 'info.main' : 'success.main';
  const badgeBg = hasErrors
    ? 'rgba(229, 72, 77, 0.10)'
    : hasWarnings
    ? 'rgba(245, 183, 78, 0.10)'
    : hasInfo
    ? 'rgba(111, 169, 255, 0.10)'
    : 'rgba(77, 221, 150, 0.10)';
  const badgeBorder = hasErrors
    ? 'rgba(229, 72, 77, 0.30)'
    : hasWarnings
    ? 'rgba(245, 183, 78, 0.30)'
    : hasInfo
    ? 'rgba(111, 169, 255, 0.30)'
    : 'rgba(77, 221, 150, 0.30)';
  const badgeGlow = hasErrors ? '#E5484D' : hasWarnings ? '#F5B74E' : hasInfo ? '#6FA9FF' : '#4DDD96';
  const totalFindings = errorCount + warningCount + infoCount;
  const badgeText = hasErrors
    ? `${errorCount} error${errorCount === 1 ? '' : 's'}${warningCount ? ` · ${warningCount} warn` : ''}`
    : hasWarnings
    ? `${warningCount} warning${warningCount === 1 ? '' : 's'}`
    : hasInfo
    ? `${infoCount} hint${infoCount === 1 ? '' : 's'}`
    : 'Ready to PR';
  const badgeTextShort = hasErrors
    ? `${errorCount}E${warningCount ? `/${warningCount}W` : ''}`
    : hasWarnings
    ? `${warningCount}W`
    : hasInfo
    ? `${infoCount}i`
    : 'OK';

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
          <Tooltip
            title={
              totalFindings === 0
                ? 'No lint issues — looks contribution-ready'
                : `${errorCount} error · ${warningCount} warning · ${infoCount} hint — click to view`
            }
            placement="bottom"
          >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 11,
              color: badgeColor,
              background: badgeBg,
              border: '1px solid',
              borderColor: badgeBorder,
              px: 1,
              py: 0.4,
              borderRadius: 12,
              backdropFilter: 'blur(12px)',
              cursor: totalFindings > 0 ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onClick={totalFindings > 0 ? () => setShowLintPanel((v) => !v) : undefined}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: badgeColor,
                boxShadow: `0 0 6px ${badgeGlow}`,
              }}
            />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{badgeText}</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{badgeTextShort}</Box>
          </Box>
          </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip
            title={
              showContent
                ? inputs.attack_technique
                  ? 'Contribute this test to atomic-red-team (open pre-filled fork on GitHub)'
                  : 'Set an ATT&CK technique to enable contribute flow'
                : 'Author a test first, then contribute'
            }
          >
            <span>
              <IconButton
                disabled={!showContent || !inputs.attack_technique}
                onClick={() => setContributeOpen(true)}
                sx={{
                  ...iconBtnSx,
                  color: 'primary.main',
                  borderColor: 'rgba(255,92,57,0.40)',
                  '&:hover': {
                    background: 'var(--accent-soft)',
                    color: 'primary.main',
                    borderColor: 'primary.main',
                  },
                }}
                aria-label="Contribute to atomic-red-team"
              >
                <CallSplitRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip
            title={
              showContent
                ? 'Generate detection rule stubs (Sigma · KQL · SPL · EQL)'
                : 'Author a test first, then generate detection stubs'
            }
          >
            <span>
              <IconButton
                disabled={!showContent}
                onClick={() => setDetectionOpen(true)}
                sx={iconBtnSx}
                aria-label="Generate detection rule stubs"
              >
                <RadarRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
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

      {/* Tabs (only when content is shown) */}
      {showContent && (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            borderBottom: '1px solid var(--glass-stroke)',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                textTransform: 'none',
                minHeight: 36,
                fontSize: 12,
                fontWeight: 500,
                color: 'text.secondary',
                py: 0.5,
              },
              '& .Mui-selected': { color: 'primary.main' },
            }}
          >
            <Tab value="yaml" label="YAML" />
            <Tab value="dryrun" label="Dry-run" />
            {originalSnapshot && <Tab value="diff" label="Diff" />}
          </Tabs>
        </Box>
      )}

      {/* Lint findings panel */}
      {showLintPanel && lintFindings.length > 0 && (
        <LintPanel findings={lintFindings} onJumpToField={jumpToField} />
      )}

      {/* Detection rule stubs modal */}
      <DetectionExportModal
        open={detectionOpen}
        onClose={() => setDetectionOpen(false)}
        inputs={inputs}
        darkMode={darkMode}
      />

      {/* Contribute-to-AT modal */}
      <ContributeModal
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        inputs={inputs}
        formattedYaml={formatted_yaml}
        lintErrorCount={errorCount}
      />

      {/* Body */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {showContent ? (
          activeTab === 'dryrun' ? (
            <DryRunPreview inputs={inputs} />
          ) : activeTab === 'diff' ? (
            <DiffViewer original={originalSnapshot} current={formatted_yaml} />
          ) : (
            <Editor
              darkMode={darkMode}
              name="yaml-content"
              value={formatted_yaml}
              mode="yaml"
              readOnly={true}
              highlightActiveLine={false}
              maxLines={500}
            />
          )
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
