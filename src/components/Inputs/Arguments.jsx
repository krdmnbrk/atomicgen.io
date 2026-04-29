import React, { useEffect } from 'react';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { InputLabel } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// Arguments component for managing input arguments
function Arguments({ darkMode, errors, setErrors, inputs, setInputs }) {
    // Check if there are duplicate names among the input arguments
    function hasDuplicateNames(data) {
        const names = data.map(obj => obj.name.trim());
        return new Set(names).size !== names.length;
    }

    // Check if there are empty names among the input arguments
    function hasEmptyNames(data) {
        const names = data.map(obj => obj.name.trim());
        return names.includes("");
    }

    // Use effect to validate input arguments and update errors
    useEffect(() => {
        let newErrors = [];

        // Check for duplicate names
        if (hasDuplicateNames(inputs.input_arguments)) {
            newErrors.push('Argument names must be unique.');
        } else {
            newErrors = newErrors.filter((error) => error !== 'Argument names must be unique.');
        }

        // Check for empty names
        if (hasEmptyNames(inputs.input_arguments)) {
            newErrors.push('Argument names cannot be empty.');
        } else {
            newErrors = newErrors.filter((error) => error !== 'Argument names cannot be empty.');
        }

        setErrors(newErrors);
    }, [inputs.input_arguments, setErrors]);

    // Handle changes to a specific input argument field
    const handleInputArgumentChange = (index, field, value) => {
        setInputs((prev) => {
            const updatedDependencies = [...prev.input_arguments];
            updatedDependencies[index] = {
                ...updatedDependencies[index],
                [field]: value,
            };
            return { ...prev, input_arguments: updatedDependencies };
        });
    };

    // Add a new input argument with default values
    const addInputArgument = () => {
        setInputs((prev) => ({
            ...prev,
            input_arguments: [
                { description: '', default: `value_${inputs.input_arguments.length + 1}`, type: '', name: `input_${inputs.input_arguments.length + 1}` },
                ...prev.input_arguments,
            ],
        }));
    };

    // Remove an input argument by index
    const removeInputArgument = (index) => {
        setInputs((prev) => ({
            ...prev,
            input_arguments: prev.input_arguments.filter((_, i) => i !== index),
        }));
    };

    return (
        <Box>
            {/* Button to Add Input Arguments */}
            <Box>
                <Button
                    sx={{
                        mb: 1,
                        textTransform: 'none',
                        borderRadius: 1.5,
                        borderColor: 'var(--glass-stroke-strong)',
                        '&:hover': { borderColor: 'primary.main', background: 'var(--accent-soft)' },
                    }}
                    startIcon={<AddCircleOutlineIcon />}
                    variant="outlined"
                    color="primary"
                    onClick={addInputArgument}
                >
                    Add input argument {inputs.input_arguments.length > 0 ? `(${inputs.input_arguments.length})` : ''}
                </Button>
            </Box>

            {/* Display Validation Errors */}
            {errors.length > 0 &&
                <Alert sx={{ mb: 1 }} variant={darkMode ? "outlined" : "filled"}  severity="error">
                    {errors.map((error, index) => (
                        <li key={index}>
                            {error}
                        </li>
                    ))}
                </Alert>
            }

            {/* Render Each Input Argument */}
            {inputs.input_arguments.map((arg, index) => (
                <Box
                    key={`input-argument-${index}`}
                    sx={{
                        mb: 1.5,
                        background: 'var(--glass-inset)',
                        border: '1px solid var(--glass-stroke)',
                        borderRadius: 2,
                        p: 1.75,
                    }}
                >
                    {/* Argument Name */}
                    <TextField
                        spellCheck="false"
                        fullWidth
                        size='small'
                        label="Argument Name"
                        value={arg.name || ''}
                        onChange={(e) =>
                            handleInputArgumentChange(index, 'name', e.target.value)
                        }
                        placeholder="Enter argument name"
                        sx={{ mb: 2 }}
                    />

                    {/* Argument Description */}
                    <TextField
                        spellCheck="false"
                        fullWidth
                        size='small'
                        label="Argument Description"
                        value={arg.description || ''}
                        onChange={(e) =>
                            handleInputArgumentChange(index, 'description', e.target.value)
                        }
                        sx={{ mb: 2 }}
                    />

                    {/* Default Value */}
                    <TextField
                        spellCheck="false"
                        fullWidth
                        size='small'
                        label="Default Value"
                        value={arg.default || ''}
                        onChange={(e) =>
                            handleInputArgumentChange(index, 'default', e.target.value)
                        }
                        sx={{ mb: 2 }}
                    />

                    {/* Input Type Dropdown and Delete Button */}
                    <Box sx={{ display: "flex", justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        {/* Input Type Selector */}
                        <FormControl sx={{ mr: 1, mb: 1, width: '50%' }} size="small">
                            <InputLabel id={`input-type-${index}`} style={{ fontSize: 14 }}>Input Type</InputLabel>
                            <Select
                                labelId={`input-type-${index}`}
                                id={`input-type-select-${index}`}
                                label="Input Type"
                                value={arg.type}
                                onChange={(e) =>
                                    handleInputArgumentChange(index, 'type', e.target.value)
                                }
                            >
                                {['string', 'url', 'path', 'integer', 'float'].map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Delete Input Argument */}
                        <IconButton
                            aria-label="delete"
                            size="large"
                            color="primary"
                            variant={darkMode ? "outlined" : "contained"} 
                            onClick={() => removeInputArgument(index)}
                        >
                            <DeleteIcon fontSize="inherit" />
                        </IconButton>
                    </Box>
                </Box>
            ))}
        </Box>
    );
}

export default Arguments;
