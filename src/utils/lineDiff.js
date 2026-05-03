// Tiny LCS-based unified line diff. No dependency, ~O(m*n).
// Intended for short YAML files (<300 lines), which is well within budget.
//
// Returns: [{ type: 'eq' | 'add' | 'del', line: string }]

export function lineDiff(a, b) {
    const aLines = (a || '').split(/\r?\n/);
    const bLines = (b || '').split(/\r?\n/);
    const m = aLines.length;
    const n = bLines.length;

    // dp[i][j] = LCS length of aLines[i..] vs bLines[j..]
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            if (aLines[i] === bLines[j]) {
                dp[i][j] = dp[i + 1][j + 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    const out = [];
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
        if (aLines[i] === bLines[j]) {
            out.push({ type: 'eq', line: aLines[i] });
            i++;
            j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            out.push({ type: 'del', line: aLines[i] });
            i++;
        } else {
            out.push({ type: 'add', line: bLines[j] });
            j++;
        }
    }
    while (i < m) out.push({ type: 'del', line: aLines[i++] });
    while (j < n) out.push({ type: 'add', line: bLines[j++] });
    return out;
}

export function diffStats(diff) {
    let added = 0;
    let removed = 0;
    diff.forEach((d) => {
        if (d.type === 'add') added++;
        else if (d.type === 'del') removed++;
    });
    return { added, removed };
}
