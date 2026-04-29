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

function fetchIndex() {
    if (cache) return Promise.resolve(cache);
    if (!inflight) {
        inflight = fetch(INDEX_URL)
            .then((r) => {
                if (!r.ok) throw new Error(`Index fetch failed: ${r.status}`);
                return r.text();
            })
            .then((t) => {
                cache = parse(t);
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
