import { useMemo } from 'react';
import useAtomicIndex from './useAtomicIndex';
import { lintAtomic, validationErrorsToFindings } from '../utils/atLinter';

// Combines App.jsx required-field validation errors with structural / spec
// lint findings so the YAML pane has a single unified source of truth.
export default function useLintFindings(inputs, validationErrors = []) {
    const { data: atomicIndex } = useAtomicIndex();
    return useMemo(() => {
        const required = validationErrorsToFindings(validationErrors);
        const lint = lintAtomic(inputs, atomicIndex);
        return [...required, ...lint];
    }, [inputs, validationErrors, atomicIndex]);
}
