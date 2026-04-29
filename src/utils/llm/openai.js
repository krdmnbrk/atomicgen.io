import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_INPUT_SCHEMA } from './toolSchema';

export const openaiProvider = {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: [
        { id: 'gpt-4o', label: 'GPT-4o (recommended)' },
        { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
        { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
    apiKeyHint: 'sk-...',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    endpointHost: 'api.openai.com',

    async generate({ apiKey, model, systemPrompt, indexBlock, userPrompt, signal }) {
        if (!apiKey) throw new Error('Missing OpenAI API key.');

        const fullSystem = indexBlock
            ? `${systemPrompt}\n\n${indexBlock}`
            : systemPrompt;

        const body = {
            model: model || this.defaultModel,
            messages: [
                { role: 'system', content: fullSystem },
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

        let res;
        try {
            res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
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
            throw new Error(parseOpenaiError(res.status, text));
        }

        const data = await res.json();
        const choice = data.choices?.[0];
        const toolCall = choice?.message?.tool_calls?.[0];
        if (!toolCall || !toolCall.function?.arguments) {
            throw new Error('Provider returned no tool call. Try rephrasing your request.');
        }
        try {
            return JSON.parse(toolCall.function.arguments);
        } catch (e) {
            throw new Error('Provider returned malformed JSON.');
        }
    },
};

function parseOpenaiError(status, text) {
    let message = '';
    try {
        const j = JSON.parse(text);
        message = j?.error?.message || j?.message || '';
    } catch {
        message = text;
    }
    if (status === 401) return 'Invalid OpenAI API key.';
    if (status === 429) return 'OpenAI rate limit reached. Try again in a moment.';
    if (status >= 500) return `OpenAI service error (${status}). ${message}`.trim();
    return message ? `OpenAI error: ${message}` : `OpenAI request failed (${status}).`;
}
