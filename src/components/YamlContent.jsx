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
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BookmarkAddRoundedIcon from '@mui/icons-material/BookmarkAddRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import SaveAltRoundedIcon from '@mui/icons-material/SaveAltRounded';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { keyframes } from '@mui/system';
import Editor from './Editor';
import LintPanel from './LintPanel';
import DetectionExportModal from './DetectionExportModal';
import ContributeModal from './ContributeModal';
import HowToRun from './HowToRun';
import DiffViewer from './DiffViewer';
import VariantSuggestModal from './VariantSuggestModal';
import useLocalLibrary from '../hooks/useLocalLibrary';
import useLintFindings from '../hooks/useLintFindings';
import { summarizeFindings } from '../utils/atLinter';
import { inputsToYaml } from '../utils/atomicYaml';
import { encodeStateToUrl } from '../utils/shareUrl';

const pulseKeyframe = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(229, 72, 77, 0.55); }
  60%  { box-shadow: 0 0 0 9px rgba(229, 72, 77, 0); }
  100% { box-shadow: 0 0 0 0 rgba(229, 72, 77, 0); }
`;

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

function YamlContent({ darkMode, inputs, setInputs, setLoadedSource, loadedSource, updated, base, validationErrors, setChanged, changed, onReset, originalSnapshot, originalGuid, actionHandlersRef }) {
  const [formatted_yaml, setFormattedYaml] = React.useState(null);
  const [showContent, setShowContent] = React.useState(false);
  const [showLintPanel, setShowLintPanel] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Unified lint findings (required-field validation + AT-spec lint).
  const lintFindings = useLintFindings(inputs, validationErrors, originalGuid);
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
  const [variantsOpen, setVariantsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('yaml');
  const [copiedSnippet, setCopiedSnippet] = React.useState(false);
  const [copiedShare, setCopiedShare] = React.useState(false);
  // Save dropdown menu anchor
  const [saveMenuAnchor, setSaveMenuAnchor] = React.useState(null);

  // Expose modal openers to App (used by Command Palette).
  React.useEffect(() => {
    if (actionHandlersRef) {
      actionHandlersRef.current = {
        openContribute: () => setContributeOpen(true),
        openDetection: () => setDetectionOpen(true),
        openVariants: () => setVariantsOpen(true),
      };
    }
  }, [actionHandlersRef]);
  // Lint badge first-time pulse (K3)
  const [pulseLint, setPulseLint] = React.useState(false);
  const prevErrorCountRef = React.useRef(0);
  React.useEffect(() => {
    if (lintCounts.error > 0 && prevErrorCountRef.current === 0) {
      setPulseLint(true);
      const t = setTimeout(() => setPulseLint(false), 2400);
      prevErrorCountRef.current = lintCounts.error;
      return () => clearTimeout(t);
    }
    prevErrorCountRef.current = lintCounts.error;
  }, [lintCounts.error]);
  const copyShareLink = async () => {
    try {
      const url = encodeStateToUrl(inputs);
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      /* noop */
    }
  };

  // One-click save to local library — uses inputs.name (or auto-name on
  // empty), shows a 2s checkmark, no drawer flash.
  const { save: saveToLibrary } = useLocalLibrary();
  const [savedToLib, setSavedToLib] = React.useState(false);
  const saveCurrentToLibrary = () => {
    saveToLibrary(inputs.name || '', inputs);
    setSavedToLib(true);
    setTimeout(() => setSavedToLib(false), 2000);
  };
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
            role={totalFindings > 0 ? 'button' : undefined}
            tabIndex={totalFindings > 0 ? 0 : -1}
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
              transition: 'all 0.14s',
              animation: pulseLint ? `${pulseKeyframe} 1.2s ease-out 2` : 'none',
              '&:hover': totalFindings > 0 ? {
                borderColor: badgeColor,
                background: badgeBg,
                filter: 'brightness(1.15)',
              } : {},
              '&:focus-visible': totalFindings > 0 ? {
                outline: 'none',
                boxShadow: `0 0 0 3px ${badgeBg}`,
              } : {},
            }}
            onClick={totalFindings > 0 ? () => setShowLintPanel((v) => !v) : undefined}
            onKeyDown={(e) => {
              if (totalFindings > 0 && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setShowLintPanel((v) => !v);
              }
            }}
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
            {totalFindings > 0 && (
              <KeyboardArrowDownRoundedIcon
                sx={{
                  fontSize: 14,
                  ml: 0.25,
                  transition: 'transform 0.18s',
                  transform: showLintPanel ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            )}
          </Box>
          </Tooltip>
          )}
        </Box>
        {/* Action group — minimal ghost buttons + Contribute primary CTA */}
        {(() => {
          // Shared minimal/ghost button style. Border + background appear
          // on hover only; default state is just label + icon.
          const ghostBtnSx = {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 12.5,
            borderRadius: 1.25,
            color: 'text.secondary',
            px: 1,
            py: 0.35,
            minWidth: 0,
            border: '1px solid transparent',
            transition: 'all 0.12s',
            '& .MuiButton-startIcon': { mr: 0.5 },
            '& .MuiButton-endIcon':   { ml: 0.25 },
            '&:hover': {
              color: 'text.primary',
              background: 'var(--glass-strong)',
              border: '1px solid var(--glass-stroke-strong)',
            },
            '&.Mui-disabled': {
              color: 'var(--text-faint)',
              opacity: 0.5,
            },
          };
          const ghostIconSx = {
            width: 28,
            height: 28,
            color: 'text.secondary',
            border: '1px solid transparent',
            borderRadius: 1.25,
            transition: 'all 0.12s',
            '&:hover': {
              color: 'text.primary',
              background: 'var(--glass-strong)',
              border: '1px solid var(--glass-stroke-strong)',
            },
            '&.Mui-disabled': { opacity: 0.4 },
          };
          return (
            <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
              <Tooltip title="Save / export — Download · Copy · Share · Library">
                <span>
                  <Button
                    disabled={!showContent}
                    onClick={(e) => setSaveMenuAnchor(e.currentTarget)}
                    size="small"
                    startIcon={<SaveAltRoundedIcon sx={{ fontSize: 15 }} />}
                    endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 14 }} />}
                    aria-label="Save and export menu"
                    sx={ghostBtnSx}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Save</Box>
                  </Button>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  showContent
                    ? 'Generate a Sigma rule with AI · convert to any SIEM via sigconverter.io'
                    : 'Author a test first, then generate detection'
                }
              >
                <span>
                  <Button
                    disabled={!showContent}
                    onClick={() => setDetectionOpen(true)}
                    size="small"
                    startIcon={<RadarRoundedIcon sx={{ fontSize: 15 }} />}
                    aria-label="Generate Sigma rule"
                    sx={ghostBtnSx}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Detection</Box>
                  </Button>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  showContent
                    ? inputs.executor && inputs.executor.command
                      ? 'Suggest variants — alternative implementations of the same technique'
                      : 'Add an attack command first, then suggest variants'
                    : 'Author a test first, then suggest variants'
                }
              >
                <span>
                  <Button
                    disabled={!showContent || !inputs.executor || !inputs.executor.command}
                    onClick={() => setVariantsOpen(true)}
                    size="small"
                    startIcon={<AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} />}
                    aria-label="Suggest variants"
                    sx={ghostBtnSx}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Variants</Box>
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title="Reset form (undo for 10s)">
                <span>
                  <IconButton
                    disabled={!showContent}
                    onClick={resetButtonHandle}
                    sx={ghostIconSx}
                    aria-label="Reset form"
                  >
                    <RestartAltRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>

              {(() => {
                const unchangedFromOriginal =
                  loadedSource && loadedSource.type === 'repo' &&
                  !!originalSnapshot && formatted_yaml === originalSnapshot;
                const disabled = !showContent || !inputs.attack_technique || unchangedFromOriginal;
                const tooltip = !showContent
                  ? 'Author a test first, then contribute'
                  : !inputs.attack_technique
                  ? 'Set an ATT&CK technique to enable contribute flow'
                  : unchangedFromOriginal
                  ? 'No changes vs the loaded atomic-red-team test — edit something before contributing'
                  : 'Contribute this test to atomic-red-team (open pre-filled fork on GitHub)';
                return (
                  <Tooltip title={tooltip}>
                    <span>
                      <Button
                        disabled={disabled}
                        onClick={() => setContributeOpen(true)}
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<CallSplitRoundedIcon sx={{ fontSize: 15 }} />}
                        aria-label="Contribute to atomic-red-team"
                        sx={{
                          ml: 0.5,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: 12.5,
                          borderRadius: 1.25,
                          px: 1.25,
                          py: 0.4,
                          minWidth: 0,
                          boxShadow: '0 4px 14px -4px rgba(255, 92, 57, 0.45)',
                          '& .MuiButton-startIcon': { mr: 0.5 },
                          '&.Mui-disabled': {
                            background: 'var(--glass-strong)',
                            color: 'var(--text-faint)',
                            boxShadow: 'none',
                          },
                        }}
                      >
                        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Contribute</Box>
                      </Button>
                    </span>
                  </Tooltip>
                );
              })()}
            </Box>
          );
        })()}

        {/* Save menu */}
        <Menu
          anchorEl={saveMenuAnchor}
          open={Boolean(saveMenuAnchor)}
          onClose={() => setSaveMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { mt: 0.5, minWidth: 240 } } }}
        >
          <MenuItem
            onClick={() => { setSaveMenuAnchor(null); downloadButtonHandle(); }}
          >
            <ListItemIcon><DownloadRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={`Download YAML${changed ? ' *' : ''}`}
              secondary={inputs.name ? `${inputs.name.replace(/ /g, '_').toLowerCase()}.yaml` : 'name required'}
              primaryTypographyProps={{ fontSize: 13 }}
              secondaryTypographyProps={{ fontSize: 10.5, sx: { fontFamily: "'JetBrains Mono', monospace" } }}
            />
            <Box component="span" sx={{ ml: 1, fontSize: 10, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>⌘S</Box>
          </MenuItem>
          <MenuItem onClick={() => { setSaveMenuAnchor(null); copyButtonHandler(); }}>
            <ListItemIcon>{copied ? <CheckRoundedIcon fontSize="small" sx={{ color: 'success.main' }} /> : <ContentCopyRoundedIcon fontSize="small" />}</ListItemIcon>
            <ListItemText
              primary={copied ? 'Copied!' : `Copy YAML${changed ? ' *' : ''}`}
              primaryTypographyProps={{ fontSize: 13 }}
            />
          </MenuItem>
          <MenuItem onClick={() => { setSaveMenuAnchor(null); copyShareLink(); }}>
            <ListItemIcon>{copiedShare ? <CheckRoundedIcon fontSize="small" sx={{ color: 'success.main' }} /> : <IosShareRoundedIcon fontSize="small" />}</ListItemIcon>
            <ListItemText
              primary={copiedShare ? 'Link copied!' : 'Copy share link'}
              secondary="state encoded in URL"
              primaryTypographyProps={{ fontSize: 13 }}
              secondaryTypographyProps={{ fontSize: 10.5 }}
            />
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={() => { setSaveMenuAnchor(null); saveCurrentToLibrary(); }}>
            <ListItemIcon>{savedToLib ? <CheckRoundedIcon fontSize="small" sx={{ color: 'success.main' }} /> : <BookmarkAddRoundedIcon fontSize="small" />}</ListItemIcon>
            <ListItemText
              primary={savedToLib ? 'Saved to library!' : 'Save to My Tests'}
              secondary="local browser only"
              primaryTypographyProps={{ fontSize: 13 }}
              secondaryTypographyProps={{ fontSize: 10.5 }}
            />
            <Box component="span" sx={{ ml: 1, fontSize: 10, color: 'var(--text-faint)', fontFamily: "'JetBrains Mono', monospace" }}>⌘⇧S</Box>
          </MenuItem>
          <MenuItem
            disabled={!invokeAtomicSnippet}
            onClick={() => { setSaveMenuAnchor(null); copyInvokeSnippet(); }}
          >
            <ListItemIcon>{copiedSnippet ? <CheckRoundedIcon fontSize="small" sx={{ color: 'success.main' }} /> : <TerminalRoundedIcon fontSize="small" />}</ListItemIcon>
            <ListItemText
              primary={copiedSnippet ? 'Snippet copied!' : 'Copy Invoke-AtomicTest'}
              secondary={invokeAtomicSnippet || 'set technique to enable'}
              primaryTypographyProps={{ fontSize: 13 }}
              secondaryTypographyProps={{ fontSize: 10.5, sx: { fontFamily: "'JetBrains Mono', monospace" } }}
            />
          </MenuItem>
        </Menu>

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
            <Tab value="howto" label="How to run" />
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

      {/* Variant brainstorm modal */}
      <VariantSuggestModal
        open={variantsOpen}
        onClose={() => setVariantsOpen(false)}
        currentInputs={inputs}
        base={base}
        formIsModified={changed}
        onLoadVariant={(next) => {
          setInputs(next);
          if (typeof setLoadedSource === 'function') {
            setLoadedSource({ type: 'ai' });
          }
        }}
      />

      {/* Body */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {showContent ? (
          activeTab === 'howto' ? (
            <HowToRun inputs={inputs} />
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
