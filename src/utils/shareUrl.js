// Encode/decode the entire form state in the URL hash so users can share
// in-progress drafts via plain link (no backend, no account, no service).
// lz-string keeps the URL short — ~3-5x smaller than raw JSON for typical
// atomic-test forms.

import LZString from 'lz-string';

const SHARE_PARAM = 'share';

export function encodeStateToUrl(inputs) {
    const json = JSON.stringify(inputs);
    const compressed = LZString.compressToEncodedURIComponent(json);
    const base = window.location.origin + window.location.pathname + window.location.search;
    return `${base}#${SHARE_PARAM}=${compressed}`;
}

export function decodeStateFromHash(hashStr) {
    if (typeof hashStr !== 'string' || hashStr.length === 0) return null;
    const stripped = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
    const params = new URLSearchParams(stripped);
    const value = params.get(SHARE_PARAM);
    if (!value) return null;
    try {
        const json = LZString.decompressFromEncodedURIComponent(value);
        if (!json) return null;
        const parsed = JSON.parse(json);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearShareHash() {
    try {
        const url = new URL(window.location.href);
        url.hash = '';
        window.history.replaceState({}, document.title, url.pathname + url.search);
    } catch {
        /* noop */
    }
}
