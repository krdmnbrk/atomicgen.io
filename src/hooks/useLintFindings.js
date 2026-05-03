import { useMemo } from 'react';
import useAtomicIndex from './useAtomicIndex';
import { lintAtomic, validationErrorsToFindings } from '../utils/atLinter';

// Combines App.jsx required-field validation errors with structural / spec
// lint findings so the YAML pane has a single unified source of truth.
// `originalGuid` (optional) lets the linter skip GUID-collision warnings
// when the current GUID is the one we loaded the test with.
export default function useLintFindings(inputs, validationErrors = [], originalGuid = null) {
    const { data: atomicIndex } = useAtomicIndex();
    return useMemo(() => {
        const required = validationErrorsToFindings(validationErrors);
        const lint = lintAtomic(inputs, atomicIndex, { originalGuid });
        return [...required, ...lint];
    }, [inputs, validationErrors, atomicIndex, originalGuid]);
}
