import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_PROVIDER_ID, getProvider, PROVIDERS } from '../utils/llm';

const PROVIDER_KEY = 'atomicgen.ai.provider';
const apiKeyKey = (id) => `atomicgen.ai.${id}.apiKey`;
const modelKey = (id) => `atomicgen.ai.${id}.model`;

function readSafe(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

function writeSafe(key, val) {
    try {
        if (val === null || val === undefined || val === '') localStorage.removeItem(key);
        else localStorage.setItem(key, val);
    } catch { /* ignore */ }
}

export default function useLlmSettings() {
    const [providerId, setProviderIdState] = useState(
        () => readSafe(PROVIDER_KEY) || DEFAULT_PROVIDER_ID
    );
    const [apiKey, setApiKeyState] = useState(() => readSafe(apiKeyKey(providerId)) || '');
    const [model, setModelState] = useState(() => {
        const stored = readSafe(modelKey(providerId));
        return stored || getProvider(providerId).defaultModel;
    });

    useEffect(() => {
        setApiKeyState(readSafe(apiKeyKey(providerId)) || '');
        setModelState(readSafe(modelKey(providerId)) || getProvider(providerId).defaultModel);
    }, [providerId]);

    const setProviderId = useCallback((id) => {
        if (!PROVIDERS[id]) return;
        writeSafe(PROVIDER_KEY, id);
        setProviderIdState(id);
    }, []);

    const setApiKey = useCallback(
        (val) => {
            writeSafe(apiKeyKey(providerId), val);
            setApiKeyState(val);
        },
        [providerId]
    );

    const setModel = useCallback(
        (val) => {
            writeSafe(modelKey(providerId), val);
            setModelState(val);
        },
        [providerId]
    );

    const clearKey = useCallback(() => {
        writeSafe(apiKeyKey(providerId), '');
        setApiKeyState('');
    }, [providerId]);

    return {
        providerId,
        provider: getProvider(providerId),
        apiKey,
        model,
        setProviderId,
        setApiKey,
        setModel,
        clearKey,
        hasKey: Boolean(apiKey),
    };
}
