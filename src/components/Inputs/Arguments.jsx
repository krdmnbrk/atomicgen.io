import React, { useEffect, useRef } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';

const ARG_TYPES = ['string', 'url', 'path', 'integer', 'float'];

// Type-aware default suggestions
const DEFAULT_BY_TYPE = {
    string: '',
    url: 'https://example.com',
    path: '~/',
    integer: '0',
    float: '0.0',
};

function Arguments({ darkMode, errors, setErrors, inputs, setInputs }) {
    const lastAddedRef = useRef(null);

    function hasDuplicateNames(data) {
        const names = data.map((obj) => (obj.name || '').trim());
        return new Set(names).size !== names.length;
    }
    function hasEmptyNames(data) {
        const names = data.map((obj) => (obj.name || '').trim());
        return names.includes('');
    }

    useEffect(() => {
        let newErrors = [];
        if (hasDuplicateNames(inputs.input_arguments)) {
            newErrors.push('Argument names must be unique.');
        }
        if (hasEmptyNames(inputs.input_arguments)) {
            newErrors.push('Argument names cannot be empty.');
        }
        setErrors(newErrors);
    }, [inputs.input_arguments, setErrors]);

    const handleInputArgumentChange = (index, field, value) => {
        setInputs((prev) => {
            const next = [...prev.input_arguments];
            next[index] = { ...next[index], [field]: value };
            return { ...prev, input_arguments: next };
        });
    };

    const addInputArgument = () => {
        setInputs((prev) => ({
            ...prev,
            input_arguments: [
                ...prev.input_arguments,
                {
                    name: '',
                    type: 'string',
                    default: DEFAULT_BY_TYPE.string,
                    description: '',
                },
            ],
        }));
        // Focus the new row's name field after render
        setTimeout(() => {
            if (lastAddedRef.current) {
                lastAddedRef.current.focus();
            }
        }, 0);
    };

    const removeInputArgument = (index) => {
        setInputs((prev) => ({
            ...prev,
            input_arguments: prev.input_arguments.filter((_, i) => i !== index),
        }));
    };

    const args = inputs.input_arguments || [];

    return (
        <Box>
            {/* Compact table-style header */}
            {args.length > 0 && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 110px 1fr 1.5fr 32px',
                        gap: 1,
                        px: 1,
                        pb: 0.5,
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--text-faint)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                    }}
                >
                    <Box>Name</Box>
                    <Box>Type</Box>
                    <Box>Default</Box>
                    <Box>Description</Box>
                    <Box />
                </Box>
            )}

            {/* Compact rows */}
            {args.map((arg, index) => (
                <Box
                    key={`input-argument-${index}`}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 110px 1fr 1.5fr 32px',
                        gap: 1,
                        alignItems: 'center',
                        mb: 0.75,
                        py: 0.5,
                        background: 'var(--glass-inset)',
                        border: '1px solid var(--glass-stroke)',
                        borderRadius: 1.5,
                        px: 1,
                    }}
                >
                    <TextField
                        size="small"
                        variant="standard"
                        spellCheck="false"
                        placeholder="argument_name"
                        value={arg.name || ''}
                        onChange={(e) => handleInputArgumentChange(index, 'name', e.target.value)}
                        inputRef={index === args.length - 1 ? lastAddedRef : undefined}
                        sx={{
                            '& .MuiInput-input': {
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 12,
                                color: 'primary.main',
                                py: 0.5,
                            },
                            '& .MuiInput-underline:before': { borderBottom: 'none' },
                            '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
                                borderBottom: '1px solid var(--glass-stroke-strong)',
                            },
                        }}
                    />
                    <Select
                        size="small"
                        variant="standard"
                        value={arg.type || 'string'}
                        onChange={(e) => {
                            const newType = e.target.value;
                            handleInputArgumentChange(index, 'type', newType);
                            // If default is empty/placeholder, replace with type-aware default
                            if (
                                !arg.default ||
                                Object.values(DEFAULT_BY_TYPE).includes(arg.default)
                            ) {
                                handleInputArgumentChange(index, 'default', DEFAULT_BY_TYPE[newType] ?? '');
                            }
                        }}
                        disableUnderline
                        sx={{
                            '& .MuiSelect-select': {
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: 'text.secondary',
                                py: 0.5,
                                pr: 2,
                            },
                        }}
                    >
                        {ARG_TYPES.map((type) => (
                            <MenuItem key={type} value={type} sx={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                                {type}
                            </MenuItem>
                        ))}
                    </Select>
                    <TextField
                        size="small"
                        variant="standard"
                        spellCheck="false"
                        placeholder={DEFAULT_BY_TYPE[arg.type] ?? ''}
                        value={arg.default ?? ''}
                        onChange={(e) => handleInputArgumentChange(index, 'default', e.target.value)}
                        sx={{
                            '& .MuiInput-input': {
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 11.5,
                                py: 0.5,
                            },
                            '& .MuiInput-underline:before': { borderBottom: 'none' },
                        }}
                    />
                    <TextField
                        size="small"
                        variant="standard"
                        spellCheck="false"
                        placeholder="What this argument does"
                        value={arg.description || ''}
                        onChange={(e) => handleInputArgumentChange(index, 'description', e.target.value)}
                        sx={{
                            '& .MuiInput-input': { fontSize: 12, py: 0.5 },
                            '& .MuiInput-underline:before': { borderBottom: 'none' },
                        }}
                    />
                    <Tooltip title="Remove argument">
                        <IconButton
                            size="small"
                            onClick={() => removeInputArgument(index)}
                            sx={{ color: 'var(--text-faint)', '&:hover': { color: 'error.main' } }}
                            aria-label={`Remove argument ${arg.name || index + 1}`}
                        >
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            ))}

            {errors.length > 0 && (
                <Alert sx={{ mb: 1 }} variant={darkMode ? 'outlined' : 'filled'} severity="error">
                    {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                    ))}
                </Alert>
            )}

            {/* Add row at the BOTTOM */}
            <Button
                sx={{
                    mt: args.length > 0 ? 0.5 : 0,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    borderColor: 'var(--glass-stroke-strong)',
                    width: '100%',
                    justifyContent: 'flex-start',
                    px: 1.5,
                    '&:hover': { borderColor: 'primary.main', background: 'var(--accent-soft)' },
                }}
                startIcon={<AddCircleOutlineIcon />}
                variant="outlined"
                color="primary"
                size="small"
                onClick={addInputArgument}
            >
                Add input argument {args.length > 0 ? `(${args.length})` : ''}
            </Button>
        </Box>
    );
}

export default Arguments;
