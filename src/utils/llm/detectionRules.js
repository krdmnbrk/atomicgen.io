// Generate Sigma + Splunk detection rules from the current atomic test
// via the configured BYOK LLM. Output is a starting point — the modal
// always shows an "AI-generated, customize for your environment" banner.

const TOOL_NAME = 'submit_detection_rules';
const TOOL_DESCRIPTION =
    'Submit a Sigma rule and a Splunk SPL search that detect the attack described in the input atomic test. Always call this tool exactly once.';

const TOOL_INPUT_SCHEMA = {
    type: 'object',
    properties: {
        action: {
            type: 'string',
            enum: ['generate', 'refuse'],
            description: 'generate to return rules, refuse to politely decline.',
        },
        reason: {
            type: 'string',
            description: 'When action=refuse, a one-sentence polite reason.',
        },
        sigma: {
            type: 'string',
            description:
                'A complete, parse-clean Sigma rule YAML document. Must include at minimum: title, id (uuid), status, description, references, tags (with attack.t####), logsource, detection (with selection + condition), falsepositives, level. Output the YAML directly, no markdown fencing or explanation.',
        },
        splunk: {
            type: 'string',
            description:
                'A Splunk SPL search query that catches the same attack. Target the right sourcetype (Sysmon EID 1 for Windows process creation, auditd / Sysmon-for-Linux for Linux/macOS, etc.). Output the SPL directly, no markdown fencing or explanation.',
        },
        sigma_logsource: {
            type: 'string',
            description:
                'The Sigma logsource category you chose (e.g. "process_creation", "registry_event", "file_event", "network_connection"). Helps the UI badge the rule.',
        },
        sigma_level: {
            type: 'string',
            enum: ['informational', 'low', 'medium', 'high', 'critical'],
            description: 'Sigma severity level you set — must match the level field inside sigma.',
        },
    },
    required: ['action'],
};

const SYSTEM_PROMPT = `You are a senior SIEM detection engineer. Given an Atomic Red Team test (the attack), output TWO high-quality detection rules that would catch this attack in production telemetry. These are DETECTION rules, NOT additional attack code.

OUTPUT 1 — SIGMA RULE (valid Sigma YAML)

- Follow the Sigma spec strictly: https://github.com/SigmaHQ/sigma-specification
- Pick the correct logsource category for what the attack ACTUALLY produces:
    process_creation       — new process events (the most common; covers most LOLBin / shell-based tests)
    registry_event         — registry create / set / delete (use Sysmon EID 12/13/14 semantics)
    file_event             — file create / modify / delete on disk
    network_connection     — outbound TCP/UDP / DNS / HTTP from a process
    image_load             — DLL / image load events
    ps_script              — PowerShell script-block content (EID 4104)
- Use Sigma's standard Windows taxonomy field names ONLY:
    Image, OriginalFileName, CommandLine, ParentImage, ParentCommandLine,
    TargetFilename, TargetObject, Details, DestinationIp, DestinationHostname,
    DestinationPort, User, IntegrityLevel, ScriptBlockText, ProcessName, etc.
- Use the correct field modifiers: |endswith for image paths (\\\\schtasks.exe),
    |contains for substrings, |contains|all for AND-of-substrings,
    |startswith, |re for regex. Don't use undefined modifiers.
- Anchor on at least ONE specific high-fidelity selector (image path, registry
    key path, process+arg combo). Never write a rule whose selection is just a
    generic image with no cmdline qualifier — that's noise.
- Include condition (e.g. "selection", "selection and not filter").
- Include tags as ["attack.t####", "attack.t####.###"] (lowercased).
- Include realistic falsepositives entries — the actual benign sources for the
    technique (e.g. "Software updaters using BITS", "GPO-deployed scheduled
    tasks") — never just "Unknown".
- Include level: informational | low | medium | high | critical based on
    selector specificity (broad = low; multiple high-fidelity anchors = high).
- Include id (random UUID v4), status: experimental, description, references
    (attack.mitre.org/techniques/... and the atomic-red-team URL), author:
    "atomicgen.io", date (today, YYYY-MM-DD).
- Output the YAML directly, no \`\`\` fencing, no prose around it.

OUTPUT 2 — SPLUNK SPL SEARCH

- Target the correct source-type for the attack:
    Windows process     →  sourcetype="WinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1
    Windows registry    →  same sourcetype, EventCode=12 (create), 13 (set), 14 (rename)
    Windows network     →  same sourcetype, EventCode=3
    Linux process       →  sourcetype="Linux:auditd" type=EXECVE   OR   Sysmon-for-Linux EventCode=1
    macOS process       →  ESF / Sysmon-for-Mac equivalent
- Use Sysmon's exact field names: Image, CommandLine, ParentImage, ParentCommandLine,
    TargetObject, Details, TargetFilename, DestinationIp, etc. (NOT generic
    "command", "file", etc.)
- Match windows path-style with "*\\\\binary.exe" patterns; case-insensitive matches
    via lower(field).
- Pipeline shape:
    index=* <sourcetype clause>
       <field>="*pattern*" <field>="*pattern2*"
    | table _time, host, User, Image, CommandLine, ParentImage, ParentCommandLine
- Use \`\`\` ... \`\`\` for SPL comments at the top (description + technique).
- Output the SPL directly, no markdown fencing or explanation.

CRITICAL RULES

- These are DETECTION rules — output the SIEM query, never attack scripts.
- Use the ACTUAL artifacts from the test (real image, real cmdline keywords,
    real registry path), not generic placeholders.
- If the test command contains #{name} placeholders, treat them as variable
    user-supplied values — substitute conservatively (e.g. * for "any value")
    or omit from the selector if too variable. NEVER write the literal #{name}
    into the SIEM rule.
- Both rules must be VALID and parse-clean. The Sigma rule must roundtrip
    through a YAML parser. The SPL must be syntactically correct.
- Do NOT include any explanation, prose, or markdown around the rules. The
    submit_detection_rules tool fields receive the raw rule strings only.
- If the input atomic test is unsafe to detect-engineer for, ambiguous, or
    you cannot produce useful rules, call action="refuse" with a one-sentence
    reason.`;

function buildUserPrompt(inputs) {
    const t = inputs || {};
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
        'Generate Sigma + Splunk detection rules for the following atomic test.',
        'Use the actual command, image names, and arguments below as your selector anchors.',
        '',
        '```json',
        JSON.stringify(ctx, null, 2),
        '```',
    ].join('\n');
}

async function callAnthropic({ apiKey, model, userPrompt, signal }) {
    const body = {
        model,
        max_tokens: 4096,
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
        throw new Error(parseError('Anthropic', res.status, text));
    }
    const data = await res.json();
    if (data.stop_reason === 'max_tokens') {
        throw new Error('Detection-rule response truncated — try again.');
    }
    const toolUse = (data.content || []).find((c) => c.type === 'tool_use');
    if (!toolUse || !toolUse.input) throw new Error('No tool_use returned for detection rules.');
    return toolUse.input;
}

async function callOpenai({ apiKey, model, userPrompt, signal }) {
    const body = {
        model,
        max_tokens: 4096,
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
        throw new Error(parseError('OpenAI', res.status, text));
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length') {
        throw new Error('Detection-rule response truncated — try again.');
    }
    const toolCall = choice?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
        throw new Error('No tool_call returned for detection rules.');
    }
    try {
        return JSON.parse(toolCall.function.arguments);
    } catch {
        throw new Error('Detection-rule tool arguments were malformed JSON — try again.');
    }
}

function parseError(provider, status, text) {
    let msg = '';
    try {
        const j = JSON.parse(text);
        msg = j?.error?.message || j?.message || '';
    } catch {
        msg = text;
    }
    if (status === 401) return `Invalid ${provider} API key.`;
    if (status === 429) return `${provider} rate limit reached. Try again in a moment.`;
    if (status >= 500) return `${provider} service error (${status}). ${msg}`.trim();
    return msg ? `${provider} error: ${msg}` : `${provider} request failed (${status}).`;
}

export async function generateDetectionRules({ providerId, apiKey, model, currentInputs, signal }) {
    if (!currentInputs || !currentInputs.attack_technique) {
        throw new Error('Set ATT&CK technique and an attack command first.');
    }
    if (!currentInputs.executor || !currentInputs.executor.command) {
        const isManual = currentInputs.executor && currentInputs.executor.name === 'manual';
        if (!isManual || !currentInputs.executor.steps) {
            throw new Error('Add an attack command (or manual steps) first — detection rules need a target.');
        }
    }
    const userPrompt = buildUserPrompt(currentInputs);
    if (providerId === 'openai') {
        return callOpenai({ apiKey, model, userPrompt, signal });
    }
    return callAnthropic({ apiKey, model, userPrompt, signal });
}
