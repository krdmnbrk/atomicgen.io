import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_INPUT_SCHEMA } from './toolSchema';

export const anthropicProvider = {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-6',
    models: [
        { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (recommended)' },
        { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
        { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    ],
    apiKeyHint: 'sk-ant-...',
    apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    endpointHost: 'api.anthropic.com',

    async generate({ apiKey, model, systemPrompt, indexBlock, userPrompt, signal }) {
        if (!apiKey) throw new Error('Missing Anthropic API key.');

        const system = [
            { type: 'text', text: systemPrompt },
            ...(indexBlock
                ? [{ type: 'text', text: indexBlock, cache_control: { type: 'ephemeral' } }]
                : []),
        ];

        const body = {
            model: model || this.defaultModel,
            max_tokens: 2048,
            system,
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

        let res;
        try {
            res = await fetch('https://api.anthropic.com/v1/messages', {
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
        } catch (e) {
            if (e?.name === 'AbortError') throw e;
            const err = new Error(`Could not reach ${this.name}. The API endpoint is unreachable.`);
            err.code = 'NETWORK_BLOCKED';
            err.providerName = this.name;
            err.endpointHost = this.endpointHost;
            throw err;
        }

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(parseAnthropicError(res.status, text));
        }

        const data = await res.json();
        const toolUse = (data.content || []).find((c) => c.type === 'tool_use');
        if (!toolUse || !toolUse.input) {
            throw new Error('Provider returned no tool call. Try rephrasing your request.');
        }
        return toolUse.input;
    },
};

function parseAnthropicError(status, text) {
    let message = '';
    try {
        const j = JSON.parse(text);
        message = j?.error?.message || j?.message || '';
    } catch {
        message = text;
    }
    if (status === 401) return 'Invalid Anthropic API key.';
    if (status === 429) return 'Anthropic rate limit reached. Try again in a moment.';
    if (status === 529) return 'Anthropic is temporarily overloaded. Try again shortly.';
    if (status >= 500) return `Anthropic service error (${status}). ${message}`.trim();
    return message ? `Anthropic error: ${message}` : `Anthropic request failed (${status}).`;
}
