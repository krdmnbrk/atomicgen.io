import * as React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import { mergeTechniqueAndTestIntoForm } from '../../utils/aiResponseValidator';


export default function UploadedAtomicSelection({ base, atomicNames, techniqueId, techniqueName, open, setOpen, fileContent, setInputs, setLoadedSource, sourceType, sourceFilename }) {

  const handleListItemClick = (test_number) => {
    const test = fileContent.atomic_tests[test_number];
    const shape = mergeTechniqueAndTestIntoForm(fileContent, test);
    if (shape) setInputs({ ...base, ...shape });
    if (setLoadedSource) {
      if (sourceType === 'upload') {
        setLoadedSource({ type: 'upload', filename: sourceFilename });
      } else {
        // default: from-repo
        setLoadedSource({ type: 'repo', tid: fileContent?.attack_technique || techniqueId });
      }
    }
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>{ `${techniqueId} - ${techniqueName}` }</DialogTitle>
      <List sx={{ pt: 0 }}>
        {atomicNames.map((i, index) => (
          <ListItem disablePadding key={index}>
            <ListItemButton onClick={() => handleListItemClick(index)}>
              
              <ListItemText primary={`${index + 1}. ${i}`} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Dialog>
  );
}
