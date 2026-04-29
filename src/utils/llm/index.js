import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';

export const PROVIDERS = {
    [anthropicProvider.id]: anthropicProvider,
    [openaiProvider.id]: openaiProvider,
};

export const PROVIDER_LIST = [anthropicProvider, openaiProvider];

export const DEFAULT_PROVIDER_ID = anthropicProvider.id;

export function getProvider(id) {
    return PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER_ID];
}
