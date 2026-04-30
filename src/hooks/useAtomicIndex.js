import { useState, useEffect } from 'react';

const INDEX_URL =
    'https://raw.githubusercontent.com/redcanaryco/atomic-red-team/master/atomics/Indexes/Indexes-CSV/index.csv';

let cache = null;
let inflight = null;

function parseCsvRow(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { cur += ch; }
        } else {
            if (ch === ',') { out.push(cur); cur = ''; }
            else if (ch === '"') { inQuotes = true; }
            else { cur += ch; }
        }
    }
    out.push(cur);
    return out;
}

function parse(csvText) {
    const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0);
    const tests = [];
    const techMap = new Map();
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvRow(lines[i]);
        const tactic = cols[0];
        const tid = cols[1];
        const techName = cols[2];
        const testNum = cols[3];
        const testName = cols[4];
        const guid = cols[5];
        const exec = cols[6];
        if (!tid) continue;
        tests.push({ tactic, tid, techName, testNum, testName, guid, exec });
        if (!techMap.has(tid)) {
            techMap.set(tid, { id: tid, name: techName, label: `${tid} - ${techName}` });
        }
    }
    return {
        tests,
        techniques: Array.from(techMap.values()).sort((a, b) => a.id.localeCompare(b.id)),
    };
}

// Headers we expect in the first line of the atomic-red-team CSV.
// Used to detect proxy / captive-portal interception that returns HTTP 200
// with an HTML body instead of the actual CSV.
const REQUIRED_CSV_HEADERS = ['Tactic', 'Technique #', 'Technique Name', 'Test Name'];

function validateCsv(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
        const e = new Error('The atomic-red-team index response was empty.');
        e.code = 'INDEX_EMPTY';
        throw e;
    }
    // Most corporate proxies / captive portals serve an HTML page on block.
    if (/^\s*<(?:!doctype|html|head|body|meta|script|title)\b/i.test(trimmed)) {
        const e = new Error(
            'The atomic-red-team index endpoint returned HTML instead of a CSV — likely your network or proxy is blocking raw.githubusercontent.com.'
        );
        e.code = 'INDEX_NOT_CSV';
        throw e;
    }
    const firstLine = trimmed.split(/\r?\n/, 1)[0];
    const missing = REQUIRED_CSV_HEADERS.filter((h) => !firstLine.includes(h));
    if (missing.length) {
        const e = new Error(
            `The index response did not look like the expected CSV (missing header: ${missing.join(', ')}). Your network may be rewriting the response.`
        );
        e.code = 'INDEX_BAD_HEADER';
        throw e;
    }
}

function fetchIndex() {
    if (cache) return Promise.resolve(cache);
    if (!inflight) {
        inflight = fetch(INDEX_URL)
            .then((r) => {
                if (!r.ok) {
                    const e = new Error(`Atomic-red-team index fetch failed (HTTP ${r.status}).`);
                    e.code = 'INDEX_HTTP_ERROR';
                    throw e;
                }
                return r.text();
            })
            .then((t) => {
                validateCsv(t);
                const parsed = parse(t);
                if (!parsed.tests || parsed.tests.length === 0) {
                    const e = new Error('Index parsed but contained no atomic tests.');
                    e.code = 'INDEX_EMPTY';
                    throw e;
                }
                cache = parsed;
                return cache;
            })
            .catch((e) => {
                inflight = null;
                throw e;
            });
    }
    return inflight;
}

export default function useAtomicIndex() {
    const [data, setData] = useState(cache);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(!cache);

    useEffect(() => {
        if (cache) {
            setData(cache);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        fetchIndex()
            .then((d) => {
                if (!cancelled) {
                    setData(d);
                    setLoading(false);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e);
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, []);

    return { data, loading, error };
}
