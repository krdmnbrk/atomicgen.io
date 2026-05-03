// Lookup helpers for the curated ATT&CK detection-guidance dataset.
// The dataset itself lives in src/data/attackGuidance.json and is shipped
// with the bundle (no runtime fetch). Curated, intentionally-narrow:
// covers the most-tested techniques in atomic-red-team.

import data from '../data/attackGuidance.json';

export function getGuidanceFor(tid) {
    if (!tid) return null;
    const upper = tid.trim().toUpperCase();
    const direct = data.techniques[upper];
    if (direct) return { tid: upper, ...direct, exact: true };
    // Fall back to the parent technique if a sub-technique was requested.
    const parent = upper.split('.')[0];
    if (parent !== upper && data.techniques[parent]) {
        return { tid: parent, ...data.techniques[parent], exact: false };
    }
    return null;
}

export function attackUrlFor(tid) {
    if (!tid) return null;
    const parts = tid.toUpperCase().split('.');
    return parts[1]
        ? `https://attack.mitre.org/techniques/${parts[0]}/${parts[1]}/`
        : `https://attack.mitre.org/techniques/${parts[0]}/`;
}

export const GUIDANCE_TECHNIQUE_COUNT = Object.keys(data.techniques).length;
