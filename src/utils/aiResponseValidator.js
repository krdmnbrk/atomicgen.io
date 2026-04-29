const TID_RE = /^T\d{4}(\.\d{3})?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER_RE = /#\{([A-Za-z0-9_]+)\}/g;
const PLATFORMS = new Set([
    'windows', 'macos', 'linux', 'office-365', 'azure-ad',
    'google-workspace', 'containers', 'iaas', 'iaas:gcp', 'iaas:aws', 'iaas:azure', 'saas',
]);
const EXECUTORS = new Set(['powershell', 'command_prompt', 'bash', 'sh', 'manual']);
const ARG_TYPES = new Set(['string', 'path', 'url', 'integer', 'float']);
const WINDOWS_EXEC = new Set(['powershell', 'command_prompt']);
const POSIX_EXEC = new Set(['bash', 'sh']);

function validateOneTest(t) {
    const errors = [];
    const warnings = [];
    if (!t.name) errors.push('name missing.');
    if (!t.description) errors.push('description missing.');

    const platforms = Array.isArray(t.supported_platforms) ? t.supported_platforms : [];
    if (platforms.length === 0) {
        errors.push('supported_platforms missing or empty.');
    } else {
        for (const p of platforms) {
            if (typeof p !== 'string' || !PLATFORMS.has(p)) {
                errors.push(`Unknown supported_platforms value: ${p}.`);
            }
        }
    }

    const exec = t.executor || {};
    if (!exec.name || !EXECUTORS.has(exec.name)) {
        errors.push(`executor.name must be one of ${[...EXECUTORS].join(', ')}.`);
    }
    // Manual executor uses `steps` (markdown), all others require `command`.
    if (exec.name === 'manual') {
        if (!exec.steps || typeof exec.steps !== 'string' || exec.steps.trim() === '') {
            errors.push('executor.steps missing or empty (required for manual executor).');
        }
    } else if (!exec.command || typeof exec.command !== 'string' || exec.command.trim() === '') {
        errors.push('executor.command missing or empty.');
    }

    if (exec.name && platforms.length > 0) {
        if (WINDOWS_EXEC.has(exec.name) && !platforms.includes('windows')) {
            errors.push(`Executor ${exec.name} requires windows in supported_platforms.`);
        }
        // FIX: drop length===1 — bash/sh on a [windows, linux] mix is also wrong.
        if (POSIX_EXEC.has(exec.name) && platforms.includes('windows')) {
            errors.push(`Executor ${exec.name} is not compatible with windows in supported_platforms.`);
        }
    }

    // Flag wrong placeholder syntaxes
    const wrongPlaceholderRe = /(\$\{[A-Za-z0-9_]+\}|\{\{[A-Za-z0-9_]+\}\}|%[A-Za-z0-9_]+%)/g;
    for (const cmdField of ['command', 'cleanup_command', 'steps']) {
        const v = exec[cmdField];
        if (typeof v === 'string' && wrongPlaceholderRe.test(v)) {
            errors.push(`${cmdField} uses non-AT placeholder syntax — use #{name} only.`);
        }
        wrongPlaceholderRe.lastIndex = 0;
    }

    const inputArgs = t.input_arguments && typeof t.input_arguments === 'object' ? t.input_arguments : {};
    const declared = new Set(Object.keys(inputArgs));
    for (const [argName, argDef] of Object.entries(inputArgs)) {
        if (!argDef || typeof argDef !== 'object') {
            errors.push(`input_arguments.${argName} is not an object.`);
            continue;
        }
        if (!argDef.type || !ARG_TYPES.has(argDef.type)) {
            errors.push(`input_arguments.${argName}.type must be one of ${[...ARG_TYPES].join(', ')}.`);
        }
    }

    const referenced = new Set();
    const collect = (s) => {
        if (typeof s !== 'string') return;
        let m;
        const re = new RegExp(PLACEHOLDER_RE.source, 'g');
        while ((m = re.exec(s)) !== null) referenced.add(m[1]);
    };
    collect(exec.command);
    collect(exec.cleanup_command);
    if (Array.isArray(t.dependencies)) {
        for (const d of t.dependencies) {
            collect(d?.prereq_command);
            collect(d?.get_prereq_command);
        }
    }
    for (const ref of referenced) {
        if (!declared.has(ref)) {
            errors.push(`Placeholder #{${ref}} used but not declared in input_arguments.`);
        }
    }
    for (const decl of declared) {
        if (!referenced.has(decl)) {
            warnings.push(`input_arguments.${decl} declared but never referenced.`);
        }
    }

    if (Array.isArray(t.dependencies) && t.dependencies.length > 0) {
        if (!t.dependency_executor_name) {
            errors.push('dependency_executor_name required when dependencies are present.');
        } else if (!EXECUTORS.has(t.dependency_executor_name)) {
            errors.push(`dependency_executor_name must be one of ${[...EXECUTORS].join(', ')}.`);
        }
    }

    if (t.auto_generated_guid && !UUID_RE.test(t.auto_generated_guid)) {
        warnings.push('auto_generated_guid is not a valid UUID v4.');
    }

    return { errors, warnings };
}

export function validateGeneratedTest(payload, knownTechniqueIds) {
    const errors = [];
    const warnings = [];
    const perTest = [];

    if (!payload || typeof payload !== 'object') {
        return { errors: ['Empty AI response.'], warnings, perTest };
    }
    const { attack_technique, display_name, atomic_tests } = payload;

    if (!attack_technique || !TID_RE.test(attack_technique)) {
        errors.push('attack_technique missing or not in T#### / T####.### format.');
    } else if (knownTechniqueIds && knownTechniqueIds.size > 0 && !knownTechniqueIds.has(attack_technique)) {
        warnings.push(`attack_technique ${attack_technique} is not in the atomic-red-team index (may be hallucinated).`);
    }
    if (!display_name || typeof display_name !== 'string') {
        errors.push('display_name missing.');
    }
    if (!Array.isArray(atomic_tests) || atomic_tests.length === 0) {
        errors.push('atomic_tests missing or empty.');
        return { errors, warnings, perTest };
    }

    const guidsSeen = new Set();
    atomic_tests.forEach((t, i) => {
        if (!t || typeof t !== 'object') {
            perTest.push({ errors: [`atomic_tests[${i}] is not an object.`], warnings: [] });
            return;
        }
        const r = validateOneTest(t);
        if (t.auto_generated_guid && UUID_RE.test(t.auto_generated_guid)) {
            if (guidsSeen.has(t.auto_generated_guid)) {
                r.errors.push('auto_generated_guid duplicates another test in this response.');
            }
            guidsSeen.add(t.auto_generated_guid);
        }
        perTest.push(r);
    });

    return { errors, warnings, perTest };
}

export function toAppFormShape(payload, testIndex = 0) {
    const tests = Array.isArray(payload?.atomic_tests) ? payload.atomic_tests : [];
    const t = tests[testIndex];
    if (!t) return null;
    const inputArgsArray = t.input_arguments && typeof t.input_arguments === 'object'
        ? Object.entries(t.input_arguments).map(([name, v]) => ({ name, ...(v || {}) }))
        : [];
    return {
        // Technique-level fields lifted from the wrapper so the form mirrors
        // a complete AT YAML round-trip.
        attack_technique: payload?.attack_technique ?? null,
        display_name: payload?.display_name ?? null,
        auto_generated_guid: t.auto_generated_guid ?? null,
        // Per-test fields
        name: t.name ?? null,
        description: t.description ?? null,
        supported_platforms: Array.isArray(t.supported_platforms) ? t.supported_platforms : [],
        input_arguments: inputArgsArray,
        dependency_executor_name: t.dependency_executor_name ?? '',
        dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
        executor: {
            command: t.executor?.command ?? null,
            cleanup_command: t.executor?.cleanup_command ?? null,
            steps: t.executor?.steps ?? null,
            name: t.executor?.name ?? '',
            elevation_required: Boolean(t.executor?.elevation_required),
        },
    };
}

// Map a parsed atomic-red-team technique YAML (`{attack_technique, display_name,
// atomic_tests:[…]}`) + a single chosen test into the flat form shape.
// Used by the repo loader, upload, and sample paths.
export function mergeTechniqueAndTestIntoForm(parsedWrapper, test) {
    if (!test) return null;
    const inputArgsArray = test.input_arguments && typeof test.input_arguments === 'object'
        ? Object.entries(test.input_arguments).map(([name, v]) => ({ name, ...(v || {}) }))
        : [];
    return {
        attack_technique: parsedWrapper?.attack_technique ?? null,
        display_name: parsedWrapper?.display_name ?? null,
        auto_generated_guid: test.auto_generated_guid ?? null,
        name: test.name ?? null,
        description: test.description ?? null,
        supported_platforms: Array.isArray(test.supported_platforms) ? test.supported_platforms : [],
        input_arguments: inputArgsArray,
        dependency_executor_name: test.dependency_executor_name ?? '',
        dependencies: Array.isArray(test.dependencies) ? test.dependencies : [],
        executor: {
            command: test.executor?.command ?? null,
            cleanup_command: test.executor?.cleanup_command ?? null,
            steps: test.executor?.steps ?? null,
            name: test.executor?.name ?? '',
            elevation_required: Boolean(test.executor?.elevation_required),
        },
    };
}
