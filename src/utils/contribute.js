// Open-PR-on-atomic-red-team helpers. Pure client-side: uses GitHub's
// "create new file in fork" / "edit file in fork" deep-link URL pattern,
// which works without auth and without a backend.

import yaml from 'js-yaml';
import { dumpAtomicYaml, cleanObject } from './atomicYaml';

const REPO_OWNER = 'redcanaryco';
const REPO_NAME = 'atomic-red-team';
const REPO_BRANCH = 'master';
const REPO_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/atomics`;
const REPO_HTML_BASE = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

// GitHub silently truncates the `?value=` query past ~8KB on most browsers
// and many corporate proxies. Below this we use the direct deep-link;
// above, we fall back to "open editor + copy YAML manually".
const MAX_URL_VALUE_BYTES = 7500;

export function tidPath(tid) {
    return `atomics/${tid}/${tid}.yaml`;
}

export function browseFileUrl(tid) {
    return `${REPO_HTML_BASE}/blob/${REPO_BRANCH}/${tidPath(tid)}`;
}

export function newFileUrl(tid, yamlContent) {
    const filename = tidPath(tid);
    const encoded = encodeURIComponent(yamlContent);
    if (encoded.length > MAX_URL_VALUE_BYTES) return null;
    return `${REPO_HTML_BASE}/new/${REPO_BRANCH}?filename=${encodeURIComponent(filename)}&value=${encoded}`;
}

export function editFileUrl(tid, yamlContent) {
    const path = tidPath(tid);
    const encoded = encodeURIComponent(yamlContent);
    if (encoded.length > MAX_URL_VALUE_BYTES) return null;
    return `${REPO_HTML_BASE}/edit/${REPO_BRANCH}/${path}?value=${encoded}`;
}

export function newFileFallbackUrl(tid) {
    const filename = tidPath(tid);
    return `${REPO_HTML_BASE}/new/${REPO_BRANCH}?filename=${encodeURIComponent(filename)}`;
}

export function editFileFallbackUrl(tid) {
    return `${REPO_HTML_BASE}/edit/${REPO_BRANCH}/${tidPath(tid)}`;
}

export async function fetchExistingTechnique(tid, signal) {
    const url = `${REPO_RAW_BASE}/${tid}/${tid}.yaml`;
    let res;
    try {
        res = await fetch(url, { signal });
    } catch (e) {
        if (e?.name === 'AbortError') throw e;
        throw new Error(`Could not reach raw.githubusercontent.com to check ${tid}.yaml.`);
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Could not fetch ${tid}.yaml (HTTP ${res.status}).`);
    const text = await res.text();
    let parsed;
    try {
        parsed = yaml.load(text);
    } catch (e) {
        throw new Error(`Existing ${tid}.yaml could not be parsed: ${e.message}`);
    }
    if (!parsed || typeof parsed !== 'object') {
        throw new Error(`Existing ${tid}.yaml is empty or malformed.`);
    }
    return { rawText: text, parsed };
}

// Append a new atomic_test object to existing technique YAML. Returns the
// merged YAML as a string in AT-corpus formatting.
export function mergeTestIntoExisting(existing, newAtomicTest) {
    const wrapper = {
        ...existing.parsed,
        atomic_tests: [
            ...(Array.isArray(existing.parsed.atomic_tests) ? existing.parsed.atomic_tests : []),
            newAtomicTest,
        ],
    };
    return dumpAtomicYaml(cleanObject(wrapper));
}

export function prTitle(tid, displayName, testName) {
    const t = (testName || 'New atomic test').trim();
    const dn = displayName ? ` (${displayName})` : '';
    return `Add atomic test "${t}" to ${tid}${dn}`;
}

export function prBody({ tid, testName, isNew, executor, platforms, guid }) {
    const lines = [];
    lines.push('## Summary');
    lines.push('');
    if (isNew) {
        lines.push(`Adds a new technique folder \`atomics/${tid}/\` with a single atomic test:`);
    } else {
        lines.push(`Adds a new atomic test to the existing \`atomics/${tid}/${tid}.yaml\`:`);
    }
    lines.push(`- **Test:** ${testName || 'New atomic test'}`);
    lines.push(`- **Executor:** ${executor || 'unspecified'}`);
    lines.push(`- **Platforms:** ${platforms || 'unspecified'}`);
    if (guid) lines.push(`- **GUID:** \`${guid}\``);
    lines.push('');
    lines.push('## Checklist');
    lines.push('');
    lines.push(`- [ ] Test runs cleanly with \`Invoke-AtomicTest ${tid}${guid ? ` -TestGuids ${guid}` : ''}\``);
    lines.push('- [ ] Cleanup command leaves no artifacts behind');
    lines.push('- [ ] All `#{argument_name}` placeholders are declared in `input_arguments`');
    lines.push('- [ ] No hardcoded user paths / hostnames / IPs that should be input arguments');
    lines.push('- [ ] GUID is unique (verified against current `Indexes-CSV/index.csv`)');
    lines.push('- [ ] Test name follows AT naming conventions (Title Case, descriptive)');
    lines.push('');
    lines.push('---');
    lines.push('Drafted with [atomicgen.io](https://atomicgen.io).');
    return lines.join('\n');
}
