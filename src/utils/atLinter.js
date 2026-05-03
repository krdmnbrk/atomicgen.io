// AT-spec linter — checks an authored atomic test for issues that would
// typically be flagged in an atomic-red-team contribution review, plus
// detection-engineering best-practice hints. Pure client-side.
//
// Returns an array of findings: { severity, code, message, field? }
// severity: 'error' | 'warning' | 'info'

const PLACEHOLDER_RE = /#\{([A-Za-z0-9_]+)\}/g;
const WRONG_PLACEHOLDER_RE = /(\$\{[A-Za-z0-9_]+\}|\{\{[A-Za-z0-9_]+\}\}|%[A-Za-z0-9_]+%)/g;
const TID_RE = /^T\d{4}(\.\d{3})?$/i;
const WINDOWS_EXEC = new Set(['powershell', 'command_prompt']);
const POSIX_EXEC = new Set(['bash', 'sh']);

// Heuristic: command produces a persistence artifact / file / scheduled job
// without an obvious cleanup. Used to recommend a cleanup_command.
const PERSISTENCE_PATTERNS = [
    { re: /\bschtasks\s+\/?[Cc]reate\b/, label: 'schtasks /create' },
    { re: /\bNew-ScheduledTask\b/i, label: 'New-ScheduledTask' },
    { re: /\bSet-ItemProperty.*Run\b/i, label: 'Run-key registry write' },
    { re: /\bNew-Item.*Startup\b/i, label: 'Startup folder write' },
    { re: /\bNew-Service\b/i, label: 'New-Service' },
    { re: /\bsc\.exe\s+create\b/i, label: 'sc.exe create' },
    { re: /\breg(\.exe)?\s+add\b/, label: 'reg add' },
    { re: /\bcrontab\s+-?[el]?/, label: 'crontab' },
    { re: /\bsystemctl\s+enable\b/, label: 'systemctl enable' },
    { re: /\blaunchctl\s+load\b/, label: 'launchctl load' },
    { re: /\b(echo|cat)\s+.+>>\s*~?\/?\.(?:bashrc|zshrc|profile|bash_profile)\b/, label: 'shell rc append' },
];

// Heuristic: command suggestions where IOCs would be sensitive to hardcoded
// values that ought to be input_arguments instead.
const HARDCODED_PATH_HINTS = [
    /C:\\Users\\[A-Za-z0-9_.-]+\\/i,
    /\/Users\/[a-z0-9_.-]+\//i,
    /\/home\/[a-z0-9_.-]+\//i,
];

function findAll(re, text) {
    const out = [];
    if (typeof text !== 'string') return out;
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    while ((m = r.exec(text)) !== null) out.push(m);
    return out;
}

// Map App.jsx validation strings → field + code so they show up in the
// unified lint panel (alongside structural lint findings).
const REQUIRED_FIELD_MAP = {
    'MITRE ATT&CK technique (T####)': { field: 'attack_technique', code: 'AT-REQ-001' },
    'Technique display name':         { field: 'display_name',     code: 'AT-REQ-002' },
    'Test name':                      { field: 'name',             code: 'AT-REQ-003' },
    'Test description':               { field: 'description',      code: 'AT-REQ-004' },
    'Supported platforms':            { field: 'supported-platforms', code: 'AT-REQ-005' },
    'Attack command':                 { field: 'attack-command-editor', code: 'AT-REQ-006' },
    'Attack executor name':           { field: 'attack_executor_select', code: 'AT-REQ-007' },
    'Input type':                     { field: 'input_arguments',  code: 'AT-REQ-008' },
    'Input name':                     { field: 'input_arguments',  code: 'AT-REQ-009' },
    'Dependency description':         { field: 'dependencies',     code: 'AT-REQ-010' },
    'Dependency check command':       { field: 'dependencies',     code: 'AT-REQ-011' },
};

export function validationErrorsToFindings(validationErrors = []) {
    const seen = new Set();
    return validationErrors
        .filter((m) => (seen.has(m) ? false : (seen.add(m), true)))
        .map((msg) => {
            const meta = REQUIRED_FIELD_MAP[msg] || { field: null, code: 'AT-REQ' };
            return {
                severity: 'error',
                code: meta.code,
                message: `Required: ${msg}.`,
                field: meta.field,
            };
        });
}

export function lintAtomic(inputs, atomicIndex = null, opts = {}) {
    const findings = [];
    if (!inputs) return findings;
    const originalGuid = opts.originalGuid || null;

    const exec = inputs.executor || {};
    const command = exec.command || '';
    const cleanup = exec.cleanup_command || '';
    const steps = exec.steps || '';
    const platforms = Array.isArray(inputs.supported_platforms) ? inputs.supported_platforms : [];

    const declared = new Set(
        (Array.isArray(inputs.input_arguments) ? inputs.input_arguments : [])
            .map((a) => a && a.name)
            .filter(Boolean)
    );
    const referenced = new Set();
    const refSources = [command, cleanup, steps];
    if (Array.isArray(inputs.dependencies)) {
        inputs.dependencies.forEach((d) => {
            if (!d) return;
            refSources.push(d.prereq_command || '', d.get_prereq_command || '');
        });
    }
    refSources.forEach((s) => {
        findAll(PLACEHOLDER_RE, s).forEach((m) => referenced.add(m[1]));
    });

    // AT001 — placeholder used but not declared
    referenced.forEach((name) => {
        if (!declared.has(name)) {
            findings.push({
                severity: 'error',
                code: 'AT001',
                message: `Placeholder #{${name}} is used in a command but not declared in Input arguments.`,
                field: 'input_arguments',
            });
        }
    });

    // AT002 — declared but never referenced
    declared.forEach((name) => {
        if (!referenced.has(name)) {
            findings.push({
                severity: 'warning',
                code: 'AT002',
                message: `Input argument "${name}" is declared but never referenced via #{${name}}.`,
                field: 'input_arguments',
            });
        }
    });

    // AT003 — executor / platform mismatch
    if (exec.name && platforms.length) {
        if (WINDOWS_EXEC.has(exec.name) && !platforms.includes('windows')) {
            findings.push({
                severity: 'error',
                code: 'AT003',
                message: `Executor "${exec.name}" requires "windows" in Supported platforms.`,
                field: 'supported-platforms',
            });
        }
        if (POSIX_EXEC.has(exec.name) && platforms.includes('windows')) {
            findings.push({
                severity: 'error',
                code: 'AT003',
                message: `Executor "${exec.name}" is not compatible with "windows" in Supported platforms.`,
                field: 'supported-platforms',
            });
        }
    }

    // AT004 — non-AT placeholder syntax
    [
        ['command', command],
        ['cleanup_command', cleanup],
        ['steps', steps],
    ].forEach(([field, text]) => {
        const wrong = findAll(WRONG_PLACEHOLDER_RE, text);
        const seen = new Set();
        wrong.forEach((m) => {
            if (seen.has(m[0])) return;
            seen.add(m[0]);
            findings.push({
                severity: 'error',
                code: 'AT004',
                message: `${field} uses non-AT placeholder syntax "${m[0]}". Use #{name} only.`,
                field: 'input_arguments',
            });
        });
    });

    // AT010 — cleanup empty but command appears to create persistence
    if (command && !cleanup.trim()) {
        const hit = PERSISTENCE_PATTERNS.find((p) => p.re.test(command));
        if (hit) {
            findings.push({
                severity: 'warning',
                code: 'AT010',
                message: `Command appears to create persistence/artifacts (matched: ${hit.label}) but no cleanup_command was provided.`,
                field: 'cleanup_command',
            });
        }
    }

    // AT011 — GUID collision against existing AT index. Skip when the current
    // GUID is the one we loaded the test with (loading from the repo
    // legitimately reuses an indexed GUID — that's not a collision).
    if (
        inputs.auto_generated_guid &&
        atomicIndex &&
        Array.isArray(atomicIndex.tests) &&
        (!originalGuid || inputs.auto_generated_guid.toLowerCase() !== originalGuid.toLowerCase())
    ) {
        const guid = inputs.auto_generated_guid.toLowerCase();
        const collision = atomicIndex.tests.find((t) => t.guid && t.guid.toLowerCase() === guid);
        if (collision) {
            findings.push({
                severity: 'error',
                code: 'AT011',
                message: `GUID collision — already used by ${collision.tid} test "${collision.testName}". Regenerate the GUID.`,
                field: 'auto_generated_guid',
            });
        }
    }

    // AT012 — elevation_required on non-elevatable platforms only
    if (exec.elevation_required && platforms.length) {
        const elevatable = ['windows', 'linux', 'macos'];
        const hasElevatable = platforms.some((p) => elevatable.includes(p));
        if (!hasElevatable) {
            findings.push({
                severity: 'warning',
                code: 'AT012',
                message: `elevation_required is set but no Windows/Linux/macOS platform is targeted. SaaS/IaaS targets don't honor this flag.`,
                field: 'attack_executor_select',
            });
        }
    }

    // AT013 — test name capitalization
    if (inputs.name) {
        const name = inputs.name.trim();
        if (name && /^[a-z]/.test(name)) {
            findings.push({
                severity: 'info',
                code: 'AT013',
                message: `Test name should start with an uppercase letter (Title Case is the AT convention).`,
                field: 'name',
            });
        }
    }

    // AT014 — description quality
    if (inputs.description) {
        const desc = inputs.description.trim();
        if (desc.length > 0 && desc.length < 30) {
            findings.push({
                severity: 'info',
                code: 'AT014',
                message: `Description is short (${desc.length} chars). Add more detail about adversary intent and the expected artifact.`,
                field: 'description',
            });
        }
        if (
            desc.length >= 30 &&
            !/\b(verify|verif|check|expected|upon execution|after execution|will create|creates|leaves|results in)/i.test(desc)
        ) {
            findings.push({
                severity: 'info',
                code: 'AT014',
                message: `Add a verification cue (e.g. "Upon execution, …", "Verify with …") so defenders can confirm the test ran.`,
                field: 'description',
            });
        }
    }

    // AT015 — TID format
    if (inputs.attack_technique && !TID_RE.test(inputs.attack_technique.trim())) {
        findings.push({
            severity: 'error',
            code: 'AT015',
            message: `attack_technique must match T#### or T####.### format (got "${inputs.attack_technique}").`,
            field: 'attack_technique',
        });
    }

    // AT016 — TID not in atomic-red-team index (custom/new — informational)
    if (
        inputs.attack_technique &&
        atomicIndex &&
        Array.isArray(atomicIndex.techniques) &&
        TID_RE.test(inputs.attack_technique)
    ) {
        const tid = inputs.attack_technique.toUpperCase();
        const exists = atomicIndex.techniques.some((t) => t.id.toUpperCase() === tid);
        if (!exists) {
            findings.push({
                severity: 'info',
                code: 'AT016',
                message: `Technique ${tid} is not yet in the atomic-red-team repo — your contribution will create a new technique folder.`,
                field: 'attack_technique',
            });
        }
    }

    // AT017 — dependencies present but dependency_executor_name missing
    if (
        Array.isArray(inputs.dependencies) &&
        inputs.dependencies.length > 0 &&
        !inputs.dependency_executor_name
    ) {
        findings.push({
            severity: 'error',
            code: 'AT017',
            message: `Dependencies are defined but dependency_executor_name is not set.`,
            field: 'dependencies',
        });
    }

    // AT020 — hardcoded user paths that should be input_arguments
    HARDCODED_PATH_HINTS.forEach((re) => {
        const m = command.match(re);
        if (m) {
            findings.push({
                severity: 'info',
                code: 'AT020',
                message: `Command contains a user-specific path "${m[0]}" — consider exposing it as an input_argument instead.`,
                field: 'input_arguments',
            });
        }
    });

    return findings;
}

export function summarizeFindings(findings) {
    const counts = { error: 0, warning: 0, info: 0 };
    findings.forEach((f) => {
        if (counts[f.severity] !== undefined) counts[f.severity]++;
    });
    return counts;
}
