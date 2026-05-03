// Generate a Sigma rule for the current atomic test via the configured
// BYOK LLM. Output is a starting point — the modal always shows an
// "AI-generated, customize for your environment" banner, plus a deep link
// to sigconverter.io so the user can convert to any SIEM backend.

const TOOL_NAME = 'submit_sigma_rule';
const TOOL_DESCRIPTION =
    'Submit a Sigma rule that detects the attack described in the input atomic test. Always call this tool exactly once.';

const TOOL_INPUT_SCHEMA = {
    type: 'object',
    properties: {
        action: {
            type: 'string',
            enum: ['generate', 'refuse'],
            description: 'generate to return a rule, refuse to politely decline.',
        },
        reason: {
            type: 'string',
            description: 'When action=refuse, a one-sentence polite reason.',
        },
        sigma: {
            type: 'string',
            description:
                'A complete, parse-clean, sigconverter-compatible Sigma rule YAML document. MUST include all of: title, id (UUID v4), status, description, references (array), author, date (YYYY-MM-DD), tags (array with attack.t#### entries), logsource (with category and/or product), detection (with at least one selection map and a condition string), falsepositives (array of realistic strings), level (informational | low | medium | high | critical). Output the YAML directly with NO markdown fencing and NO prose around it. Use 4-space indentation. Strings with special characters MUST be quoted. Multi-line strings should use the | block scalar.',
        },
        sigma_logsource: {
            type: 'string',
            description: 'The Sigma logsource category you chose (e.g. "process_creation"). Helps the UI label the rule.',
        },
        sigma_level: {
            type: 'string',
            enum: ['informational', 'low', 'medium', 'high', 'critical'],
            description: 'Sigma severity level you set — must match the level field inside sigma.',
        },
    },
    required: ['action'],
};

const SYSTEM_PROMPT = `You are a senior SIEM detection engineer. Given an Atomic Red Team test (the attack), output ONE high-quality Sigma rule that would catch this attack in production telemetry. This is a DETECTION rule, NOT additional attack code.

═══════════════════════════════════════════════════════════════════
SIGMA SPEC COMPLIANCE — your output MUST be a valid Sigma YAML document
═══════════════════════════════════════════════════════════════════

Reference: https://github.com/SigmaHQ/sigma-specification/blob/main/specification/sigma-rules-specification.md

REQUIRED top-level keys (every rule must have ALL of these):
  title           : string, single line, descriptive ("Detects ..." or "<Action> via <method>")
  id              : UUID v4 (lowercase, with hyphens) — generate a fresh one
  status          : "test" or "experimental" (use "test" by default)
  description     : 1–3 sentence prose describing what the rule catches
  references      : array of strings (URLs only). MUST include attack.mitre.org link for the technique + atomic-red-team URL
  author          : string — use "atomicgen.io"
  date            : today's date in YYYY-MM-DD
  tags            : array of strings — MUST include lowercase ["attack.t####", "attack.t####.###"] for the technique. Tactic tags optional ("attack.persistence" etc).
  logsource       : object with at minimum a "category" key. Pick from:
                      process_creation       — new process events (default for shell / LOLBin tests)
                      registry_event         — registry create/set/delete (Sysmon EID 12/13/14)
                      file_event             — file create/modify/delete
                      network_connection     — outbound TCP/UDP/DNS/HTTP from a process
                      image_load             — DLL/image load events
                      ps_script              — PowerShell script-block content (EID 4104)
                      ps_module              — PowerShell module load
                    Add "product" (windows / linux / macos) when the rule is OS-specific.
  detection       : object with at least one named selection map + a "condition" string.
                    Selection examples:
                      selection:
                          Image|endswith: '\\\\schtasks.exe'
                          CommandLine|contains|all:
                              - '/Create'
                              - '/SC'
                    condition: selection
                    OR multiple selections with filters:
                      condition: selection and not filter_legitimate
  falsepositives  : array of REALISTIC strings — actual benign sources for this technique. NEVER write "Unknown".
                    Examples: "Software updaters using BITS", "GPO-deployed scheduled tasks", "Backup software interacting with VSS".
  level           : exactly one of: informational | low | medium | high | critical

VALID Sigma standard taxonomy field names (Windows process_creation):
  Image, OriginalFileName, CommandLine, ParentImage, ParentCommandLine,
  ParentProcessId, ProcessId, User, IntegrityLevel, CurrentDirectory,
  Hashes, ImageLoaded, TargetFilename, TargetObject, Details,
  DestinationIp, DestinationHostname, DestinationPort, SourceIp, SourcePort,
  ScriptBlockText, ContextInfo, Payload

VALID field modifiers:
  |contains, |contains|all, |contains|any, |startswith, |endswith,
  |re, |re|i, |cidr, |gt, |gte, |lt, |lte, |all
  Do NOT invent modifiers. Do NOT use undefined ones.

ANCHORING (critical for rule quality):
  - Anchor on at LEAST one specific selector — image path AND a cmdline keyword,
    or registry path AND value pattern. NEVER write a selection that is just an
    image with no cmdline qualifier (would generate massive FP).
  - Use the ACTUAL command, image, paths, and arguments from the input test.
  - If the test command contains #{name} placeholders, treat them as variable
    user-supplied values: substitute conservatively (e.g. * or omit from selector
    if too variable). NEVER write the literal "#{name}" into the rule.

YAML FORMATTING (sigconverter.io must parse this):
  - 4-space indentation, NO tabs.
  - Strings with special chars (\\ : * ? & |) MUST be single-quoted.
  - Multi-line strings use | block scalar.
  - References array uses dash-list style:
        references:
            - https://attack.mitre.org/techniques/T####/###/
            - https://github.com/redcanaryco/atomic-red-team
  - Output the YAML DIRECTLY. NO triple-backtick fencing. NO prose before or after.

═══════════════════════════════════════════════════════════════════
WHAT TO RETURN
═══════════════════════════════════════════════════════════════════
Call submit_sigma_rule exactly once with:
  - action: "generate"
  - sigma: the full YAML rule (raw, no fencing)
  - sigma_logsource: the category you chose (e.g. "process_creation")
  - sigma_level: the level you set inside the rule

If the input test is unsafe to detect-engineer for, ambiguous, or you cannot
produce a useful rule, call action="refuse" with a one-sentence reason.`;

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
        'Generate a Sigma rule for the following atomic test.',
        'Use the actual command, image names, and arguments below as your selector anchors.',
        `Today's date: ${new Date().toISOString().slice(0, 10)}`,
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
        throw new Error('Sigma rule response truncated — try again.');
    }
    const toolUse = (data.content || []).find((c) => c.type === 'tool_use');
    if (!toolUse || !toolUse.input) throw new Error('No tool_use returned for Sigma rule.');
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
        throw new Error('Sigma rule response truncated — try again.');
    }
    const toolCall = choice?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
        throw new Error('No tool_call returned for Sigma rule.');
    }
    try {
        return JSON.parse(toolCall.function.arguments);
    } catch {
        throw new Error('Sigma rule tool arguments were malformed JSON — try again.');
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

// Strip a leading ```yaml / ``` fence if the model added one despite the
// system prompt asking it not to. Idempotent — returns the YAML body only.
export function stripCodeFence(s) {
    if (typeof s !== 'string') return s;
    const trimmed = s.trim();
    const m = trimmed.match(/^```(?:ya?ml)?\s*\n([\s\S]*?)\n```\s*$/i);
    return m ? m[1] : s;
}

// Light client-side sanity check — surface obvious issues to the user
// without rejecting the rule. Returns { ok, issues: [string] }.
export function quickValidateSigma(yamlStr, yamlLib) {
    const issues = [];
    if (!yamlStr || typeof yamlStr !== 'string') {
        return { ok: false, issues: ['empty rule'] };
    }
    let doc;
    try {
        doc = yamlLib.load(yamlStr);
    } catch (e) {
        return { ok: false, issues: [`YAML parse error: ${e.message || e}`] };
    }
    if (!doc || typeof doc !== 'object') return { ok: false, issues: ['rule did not parse to an object'] };
    const required = ['title', 'id', 'status', 'description', 'logsource', 'detection', 'level'];
    required.forEach((k) => {
        if (!doc[k]) issues.push(`missing "${k}"`);
    });
    if (doc.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doc.id)) {
        issues.push('id is not a valid UUID v4');
    }
    if (doc.detection && typeof doc.detection === 'object' && !doc.detection.condition) {
        issues.push('detection block is missing "condition"');
    }
    if (doc.logsource && typeof doc.logsource === 'object' && !doc.logsource.category && !doc.logsource.product) {
        issues.push('logsource needs at least "category" or "product"');
    }
    return { ok: issues.length === 0, issues };
}

export async function generateSigmaRule({ providerId, apiKey, model, currentInputs, signal }) {
    if (!currentInputs || !currentInputs.attack_technique) {
        throw new Error('Set ATT&CK technique and an attack command first.');
    }
    if (!currentInputs.executor || !currentInputs.executor.command) {
        const isManual = currentInputs.executor && currentInputs.executor.name === 'manual';
        if (!isManual || !currentInputs.executor.steps) {
            throw new Error('Add an attack command (or manual steps) first — Sigma needs a target.');
        }
    }
    const userPrompt = buildUserPrompt(currentInputs);
    const result = providerId === 'openai'
        ? await callOpenai({ apiKey, model, userPrompt, signal })
        : await callAnthropic({ apiKey, model, userPrompt, signal });
    if (result && typeof result.sigma === 'string') {
        result.sigma = stripCodeFence(result.sigma);
    }
    return result;
}

// Backwards-compat shim — earlier callers used `generateDetectionRules`.
export const generateDetectionRules = generateSigmaRule;
