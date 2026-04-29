import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import yaml from 'js-yaml';
import UploadedAtomicSelection from './UploadedAtomicSelection';
import useAtomicIndex from '../../hooks/useAtomicIndex';

const REPO_BASE = 'https://raw.githubusercontent.com/redcanaryco/atomic-red-team/master/atomics';
const techniqueYamlUrl = (tid) => `${REPO_BASE}/${tid}/${tid}.yaml`;

export default function RepoLoaderButton({
    inputButtonErrors,
    setInputButtonErrors,
    setChanged,
    changed,
    base,
    darkMode,
    setInputs,
    setLoadedSource,
}) {
    const [open, setOpen] = React.useState(false);
    const [loadingYaml, setLoadingYaml] = React.useState(false);
    const [selectionOpen, setSelectionOpen] = React.useState(false);
    const [atomicNames, setAtomicNames] = React.useState([]);
    const [techniqueName, setTechniqueName] = React.useState(null);
    const [techniqueId, setTechniqueId] = React.useState(null);
    const [fileContent, setFileContent] = React.useState(null);
    const { data, loading, error } = useAtomicIndex();
    const techniques = data ? data.techniques : [];

    React.useEffect(() => {
        if (error) setInputButtonErrors(['Failed to load technique index from atomic-red-team repository.']);
    }, [error, setInputButtonErrors]);

    const handleOpen = () => {
        if (changed) {
            const confirm = window.confirm(
                'Are you sure you want to load a test from the repository? Your current inputs will be overwritten.'
            );
            if (!confirm) return;
        }
        setInputButtonErrors([]);
        setOpen(true);
    };

    const handleClose = () => {
        if (loadingYaml) return;
        setOpen(false);
    };

    const handleTechniqueSelect = async (_event, value) => {
        if (!value) return;
        setLoadingYaml(true);
        try {
            const res = await fetch(techniqueYamlUrl(value.id));
            if (!res.ok) throw new Error(`YAML fetch failed: ${res.status}`);
            const text = await res.text();
            const parsed = yaml.load(text);
            if (parsed && Array.isArray(parsed.atomic_tests) && parsed.atomic_tests.length > 0) {
                setFileContent(parsed);
                setAtomicNames(parsed.atomic_tests.map((t) => t.name));
                setTechniqueName(parsed.display_name);
                setTechniqueId(parsed.attack_technique);
                setOpen(false);
                setSelectionOpen(true);
            } else {
                setInputButtonErrors([`No atomic tests found in ${value.id}.`]);
            }
        } catch (e) {
            console.error('Failed to load technique YAML', e);
            setInputButtonErrors([`Failed to load ${value.id} from repository.`]);
        } finally {
            setLoadingYaml(false);
        }
    };

    const setInputsAndReset = (next) => {
        setInputs(next);
        setChanged(false);
    };

    return (
        <>
            <Button
                variant={darkMode ? 'outlined' : 'contained'}
                onClick={handleOpen}
            >
                Load from Repo
            </Button>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Load from atomic-red-team</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Autocomplete
                            sx={{ mt: 1 }}
                            options={techniques}
                            getOptionLabel={(o) => o.label}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            disabled={loadingYaml}
                            onChange={handleTechniqueSelect}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Search technique (e.g. T1003.001)"
                                    autoFocus
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {loadingYaml ? <CircularProgress size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                    )}
                </DialogContent>
            </Dialog>
            {selectionOpen && (
                <UploadedAtomicSelection
                    base={base}
                    atomicNames={atomicNames}
                    techniqueName={techniqueName}
                    techniqueId={techniqueId}
                    open={selectionOpen}
                    setOpen={setSelectionOpen}
                    fileContent={fileContent}
                    setInputs={setInputsAndReset}
                    setLoadedSource={setLoadedSource}
                    sourceType="repo"
                />
            )}
        </>
    );
}
