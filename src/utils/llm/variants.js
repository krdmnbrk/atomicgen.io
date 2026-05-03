// Variant generation — given a current atomic test, ask the LLM to
// produce 2-3 alternative implementations of the same technique.
// Reuses BYOK provider settings; no new provider plumbing needed.

const TOOL_NAME = 'submit_variants';
const TOOL_DESCRIPTION =
    'Submit 2-3 distinct alternative implementations of the same ATT&CK technique as the input test. Always call this tool exactly once.';

const platformEnum = [
    'windows', 'macos', 'linux', 'office-365', 'azure-ad',
    'google-workspace', 'containers', 'iaas', 'iaas:gcp', 'iaas:aws', 'iaas:azure', 'saas',
];
const executorEnum = ['powershell', 'command_prompt', 'bash', 'sh', 'manual'];
const argTypeEnum = ['string', 'path', 'url', 'integer', 'float'];

const SINGLE_TEST_SCHEMA = {
    type: 'object',
    properties: {
        name: { type: 'string', description: 'Distinctive variant name (Title Case).' },
        description: { type: 'string' },
        supported_platforms: {
            type: 'array',
            items: { type: 'string', enum: platformEnum },
            minItems: 1,
        },
        executor: {
            type: 'object',
            properties: {
                name: { type: 'string', enum: executorEnum },
                command: { type: 'string' },
                cleanup_command: { type: 'string' },
                steps: { type: 'string' },
                elevation_required: { type: 'boolean' },
            },
            required: ['name'],
        },
        input_arguments: {
            type: 'object',
            additionalProperties: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: argTypeEnum },
                    default: {},
                    description: { type: 'string' },
                },
                required: ['type', 'description'],
            },
        },
        dependency_executor_name: { type: 'string', enum: executorEnum },
        dependencies: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    description: { type: 'string' },
                    prereq_command: { type: 'string' },
                    get_prereq_command: { type: 'string' },
                },
                required: ['description', 'prereq_command'],
            },
        },
        variant_kind: {
            type: 'string',
            description: 'Short label for what makes this variant distinct (e.g. "alternate LOLBin", "obfuscated", "macOS port").',
        },
    },
    required: ['name', 'description', 'supported_platforms', 'executor', 'variant_kind'],
};

const TOOL_INPUT_SCHEMA = {
    type: 'object',
    properties: {
        action: { type: 'string', enum: ['generate', 'refuse'] },
        reason: { type: 'string' },
        variants: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: SINGLE_TEST_SCHEMA,
            description:
                'Distinct variants that exercise the SAME attack_technique. Vary on: alternate LOLBin / executor, obfuscation level, alternate platform, alternate parameters.',
        },
    },
    required: ['action'],
};

const SYSTEM_PROMPT = `You are a senior detection-engineering assistant generating Atomic Red Team test VARIANTS.

The user has authored ONE atomic test for a given ATT&CK technique. Your job is to propose 2-3 DISTINCT alternative implementations of the SAME technique, useful for broader detection coverage.

Each variant must:
- Exercise the same attack_technique conceptually
- Be meaningfully different from the input test (alternate LOLBin / shell / obfuscation level / platform / parameters)
- Be a valid Atomic Red Team test definition (see https://github.com/redcanaryco/atomic-red-team/wiki/Sample-Spec)
- Use #{argument_name} for parameterized values
- Include a sensible cleanup_command if persistence/artifacts are created
- Set variant_kind to one short label (e.g. "alternate LOLBin", "obfuscated", "macOS port", "fileless")

Always call submit_variants exactly once. If the user's input is unsafe, ambiguous, or you cannot improve coverage, call with action="refuse" and a one-sentence reason.`;

function buildUserPrompt(currentInputs) {
    const t = currentInputs || {};
    const ia = (t.input_arguments || []).map((a) => ({
        name: a.name,
        type: a.type,
        default: a.default,
        description: a.description,
    }));
    const ctx = {
        attack_technique: t.attack_technique,
        display_name: t.display_name,
        name: t.name,
        description: t.description,
        supported_platforms: t.supported_platforms,
        executor: t.executor,
        input_arguments: ia,
        dependencies: t.dependencies,
        dependency_executor_name: t.dependency_executor_name,
    };
    return [
        'Here is the existing atomic test the user has authored.',
        'Generate 2-3 distinct variants exercising the same ATT&CK technique.',
        '',
        '```json',
        JSON.stringify(ctx, null, 2),
        '```',
    ].join('\n');
}

async function callAnthropic({ apiKey, model, userPrompt, signal }) {
    const body = {
        model,
        max_tokens: 16384,
        system: [{ type: 'text', text: SYSTEM_PROMPT }],
        tools: [
            {
                name: TOOL_NAME,
                description: TOOL_DESCRIPTION,
                input_schema: TOOL_INPUT_SCHEMA,
            },
        ],
        tool_choice: { type: 'tool', name: TOOL_NAME },
        messages: [{ role: 'user', content: userPrompt }],
    };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
        signal,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Anthropic variant request failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    if (data.stop_reason === 'max_tokens') {
        throw new Error('Variant response truncated — try with fewer / shorter input arguments.');
    }
    const toolUse = (data.content || []).find((c) => c.type === 'tool_use');
    if (!toolUse || !toolUse.input) throw new Error('No tool_use returned for variants.');
    return toolUse.input;
}

async function callOpenai({ apiKey, model, userPrompt, signal }) {
    const body = {
        model,
        max_tokens: 16384,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ],
        tools: [
            {
                type: 'function',
                function: {
                    name: TOOL_NAME,
                    description: TOOL_DESCRIPTION,
                    parameters: TOOL_INPUT_SCHEMA,
                },
            },
        ],
        tool_choice: { type: 'function', function: { name: TOOL_NAME } },
    };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenAI variant request failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length') {
        throw new Error('Variant response truncated — try with fewer / shorter input arguments.');
    }
    const toolCall = choice?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
        throw new Error('No tool_call returned for variants.');
    }
    return JSON.parse(toolCall.function.arguments);
}

export async function generateVariants({ providerId, apiKey, model, currentInputs, signal }) {
    if (!currentInputs || !currentInputs.attack_technique) {
        throw new Error('Set ATT&CK technique and an attack command first.');
    }
    if (!currentInputs.executor || !currentInputs.executor.command) {
        throw new Error('Add an attack command first — variants need a baseline.');
    }
    const userPrompt = buildUserPrompt(currentInputs);
    if (providerId === 'openai') {
        return callOpenai({ apiKey, model, userPrompt, signal });
    }
    return callAnthropic({ apiKey, model, userPrompt, signal });
}
