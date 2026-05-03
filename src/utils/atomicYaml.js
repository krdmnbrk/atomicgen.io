// Shared atomic YAML builders / serializer. Extracted from YamlContent so
// other surfaces (PR contribute wizard, dry-run preview, share-via-URL)
// can reuse the same shape and emission rules.

import yaml from 'js-yaml';

const TECHNIQUE_FIELDS = new Set(['attack_technique', 'display_name', 'auto_generated_guid']);

// Build a single atomic_test object from form inputs. Drops technique-level
// fields — those live on the wrapper.
export function atomicTestFromInputs(inputs) {
    const test = {};
    Object.keys(inputs).forEach((key) => {
        if (TECHNIQUE_FIELDS.has(key)) return;
        if (key === 'input_arguments') {
            test['input_arguments'] = {};
            (inputs.input_arguments || []).forEach((input) => {
                if (!input || !input.name) return;
                test['input_arguments'][input.name] = {
                    type: input.type,
                    default: input.default,
                    description: input.description,
                };
            });
        } else if (key === 'executor') {
            const exec = { ...(inputs.executor || {}) };
            if (exec.name === 'manual') {
                delete exec.command;
                delete exec.cleanup_command;
            } else {
                delete exec.steps;
            }
            test['executor'] = exec;
        } else {
            test[key] = inputs[key];
        }
    });
    if (inputs.auto_generated_guid) {
        test.auto_generated_guid = inputs.auto_generated_guid;
    }
    return test;
}

export function buildTechniqueWrapper(inputs) {
    return {
        attack_technique: inputs.attack_technique || null,
        display_name: inputs.display_name || null,
        atomic_tests: [atomicTestFromInputs(inputs)],
    };
}

// Strip null/undefined and empty containers, preserving intentionally-empty
// strings (AT corpus uses these for input_arguments[*].default = "").
export function cleanObject(obj) {
    if (Array.isArray(obj)) {
        return obj
            .map(cleanObject)
            .filter(
                (item) =>
                    item !== null &&
                    item !== undefined &&
                    !(Array.isArray(item) && item.length === 0)
            );
    } else if (typeof obj === 'object' && obj !== null) {
        const out = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleaned = cleanObject(value);
            if (
                cleaned !== null &&
                cleaned !== undefined &&
                !(Array.isArray(cleaned) && cleaned.length === 0) &&
                !(typeof cleaned === 'object' && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0)
            ) {
                out[key] = cleaned;
            }
        }
        return out;
    }
    return obj === null || obj === undefined ? undefined : obj;
}

const yamlDumpOpts = {
    lineWidth: -1,
    noRefs: true,
    styles: { '!!null': 'empty' },
};

// Force `|` block scalar style for any multi-line string the YAML dumper
// emits — preserves AT-corpus formatting.
function postProcessBlockScalars(text) {
    return text.replace(
        /^( *)([a-z_]+): "((?:[^"\\]|\\.)*\\n(?:[^"\\]|\\.)*)"$/gm,
        (_, indent, key, body) => {
            const decoded = body
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            const inner = decoded
                .split('\n')
                .map((line) => indent + '  ' + line)
                .join('\n');
            return `${indent}${key}: |\n${inner}`;
        }
    );
}

export function dumpAtomicYaml(wrapper) {
    return postProcessBlockScalars(
        yaml.dump(wrapper, { ...yamlDumpOpts, forceQuotes: false, quotingType: '"' })
    );
}

// Build the final cleaned + serialized YAML string for the current form.
export function inputsToYaml(inputs) {
    return dumpAtomicYaml(cleanObject(buildTechniqueWrapper(inputs)));
}

// Produce just the cleaned single atomic_test object (for merging into an
// existing T####.yaml when contributing).
export function inputsToAtomicTestObject(inputs) {
    return cleanObject(atomicTestFromInputs(inputs));
}
