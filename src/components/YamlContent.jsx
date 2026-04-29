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

const atomic_yaml = (inputs) => {
  const atomic = {};
  Object.keys(inputs).forEach((key) => {
    if (key === 'input_arguments') {
      atomic['input_arguments'] = {};
      inputs.input_arguments.forEach((input) => {
        atomic['input_arguments'][input.name] = {
          type: input['type'],
          default: input['default'],
          description: input['description'],
        };
      });
    } else {
      atomic[key] = inputs[key];
    }
  });
  return atomic;
};

function cleanObject(obj) {
  if (Array.isArray(obj)) {
    return obj
      .map(cleanObject)
      .filter((item) => item !== null && item !== undefined && !(Array.isArray(item) && item.length === 0));
  } else if (typeof obj === 'object' && obj !== null) {
    const cleanedObject = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value);
      if (
        cleanedValue !== null &&
        cleanedValue !== undefined &&
        !(Array.isArray(cleanedValue) && cleanedValue.length === 0) &&
        !(typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0)
      ) {
        cleanedObject[key] = cleanedValue;
      }
    }
    return cleanedObject;
  }
  return obj === '' || obj === null || obj === undefined ? undefined : obj;
}

function YamlContent({ darkMode, inputs, setInputs, updated, base, validationErrors, setChanged, changed }) {
  const [formatted_yaml, setFormattedYaml] = React.useState(null);
  const [showContent, setShowContent] = React.useState(false);
  const [showValidationErrors, setShowValidationErrors] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const showValidationErrorHandler = () => {
    if (validationErrors.length > 0) {
      setShowValidationErrors(true);
    }
  };

  useEffect(() => {
    setFormattedYaml(yaml.dump([cleanObject(atomic_yaml(inputs))], { lineWidth: -1 }));
    if (validationErrors.length === 0) {
      setShowValidationErrors(false);
    }
  }, [inputs, validationErrors.length]);

  useEffect(() => {
    setShowContent(updated && formatted_yaml !== '{}\n');
  }, [updated, formatted_yaml]);

  const resetButtonHandle = () => {
    const confirmReset = window.confirm('Are you sure you want to reset?');
    if (confirmReset) {
      setInputs(base);
      setChanged(false);
    }
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
          gap: 2,
          px: 2.5,
          py: 1.75,
          borderBottom: '1px solid var(--glass-stroke)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
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
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            YAML preview
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              fontSize: 11,
              color: hasErrors ? 'error.main' : 'success.main',
              background: hasErrors ? 'rgba(229, 72, 77, 0.10)' : 'rgba(77, 221, 150, 0.10)',
              border: '1px solid',
              borderColor: hasErrors ? 'rgba(229, 72, 77, 0.30)' : 'rgba(77, 221, 150, 0.30)',
              px: 1.25,
              py: 0.4,
              borderRadius: 12,
              backdropFilter: 'blur(12px)',
              cursor: hasErrors ? 'pointer' : 'default',
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
            {hasErrors ? `${errorCount} error${errorCount === 1 ? '' : 's'}` : '0 errors'}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={`Download${changed ? ' *' : ''}`}>
            <span>
              <IconButton disabled={!showContent} onClick={downloadButtonHandle} sx={iconBtnSx}>
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
              minHeight: 300,
              gap: 1,
              opacity: 0.7,
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 36, color: 'var(--text-faint)' }} />
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Fill in the form to generate YAML
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

export default YamlContent;
