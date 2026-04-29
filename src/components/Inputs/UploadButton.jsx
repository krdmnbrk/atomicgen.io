import React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import yaml from 'js-yaml';
import UploadedAtomicSelection from './UploadedAtomicSelection';
import { mergeTechniqueAndTestIntoForm } from '../../utils/aiResponseValidator';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});


export default function UploadButton({ inputButtonErrors, setInputButtonErrors, setChanged, changed, base, darkMode, setInputs, setLoadedSource }) {
    const [open, setOpen] = React.useState(false);
    const [atomicNames, setAtomicNames] = React.useState([]);
    const [techniqueName, setTechniqueName] = React.useState(null);
    const [techniqueId, setTechniqueId] = React.useState(null);
    const [fileContent, setFileContent] = React.useState(null);
    const [filename, setFilename] = React.useState(null);

    const handleFileUpload = async (event) => {
        setInputButtonErrors([]);
        if (changed) {
            const confirm = window.confirm('Are you sure you want to load another test? Your current inputs will be overwritten.');
            if (!confirm) return;
        }
        const file = event.target.files[0];
        if (file) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (fileExtension !== "yaml" && fileExtension !== "yml") {
                setInputButtonErrors([...inputButtonErrors, "Only yaml files can be uploaded."]);
                console.error("Only yaml files can be uploaded.");
                return;
            }
            try {
                const content = await file.text();

                const parsed = yaml.load(content);
                setFileContent(parsed);
                setFilename(file.name);
                if (parsed.atomic_tests && typeof parsed.atomic_tests === 'object') {
                    setAtomicNames(parsed.atomic_tests.map(i => i.name))
                    setTechniqueName(parsed.display_name);
                    setTechniqueId(parsed.attack_technique);
                    setOpen(true);
                } else {
                    // Bare-array YAML (legacy single-test format) — no wrapper
                    const test = Array.isArray(parsed) ? parsed[0] : parsed;
                    const shape = mergeTechniqueAndTestIntoForm({}, test);
                    if (shape) setInputs({ ...base, ...shape });
                    if (setLoadedSource) setLoadedSource({ type: 'upload', filename: file.name });
                }

            } catch (error) {
                console.error("Error while file processing the yaml file, check format.", error);
                setInputButtonErrors([...inputButtonErrors, "Error while file processing the yaml file, check format."])
            } finally {
                event.target.value = null;
            }
        }
    };
    return (

        <Button
            component="label"
            role={undefined}
            variant={darkMode ? "outlined" : "contained"}
            tabIndex={-1}
        >
            Upload YAML
            <VisuallyHiddenInput
                type="file"
                onChange={handleFileUpload}
                multiple
            />
            {
                open &&
                <UploadedAtomicSelection
                    base={base}
                    atomicNames={atomicNames}
                    techniqueName={techniqueName}
                    techniqueId={techniqueId}
                    open={open}
                    setOpen={setOpen}
                    fileContent={fileContent}
                    setInputs={setInputs}
                    setLoadedSource={setLoadedSource}
                    sourceType="upload"
                    sourceFilename={filename}
                />
            }
        </Button>
    );
}
