// Build draft detection rules from an authored atomic test.
// Pure client-side string construction. Output is a starting point —
// engineers should tune selectors before shipping.

import yaml from 'js-yaml';

// Tools the test commonly invokes via a shell. Treated as the more
// distinctive "image" for detection (vs. the shell itself).
const LOLBINS = [
    'schtasks', 'reg', 'sc', 'wmic', 'rundll32', 'regsvr32', 'mshta',
    'certutil', 'bitsadmin', 'cmstp', 'msbuild', 'installutil', 'msiexec',
    'curl', 'wget', 'whoami', 'net', 'tasklist', 'systeminfo',
    'ipconfig', 'netstat', 'arp', 'route', 'nbtstat', 'ping', 'tracert',
    'nslookup', 'wevtutil', 'fsutil', 'attrib', 'icacls', 'takeown',
    'osascript', 'launchctl', 'plutil', 'security',
    'systemctl', 'crontab', 'systemd-run', 'useradd', 'usermod',
    'powershell', 'pwsh', 'cmd', 'cscript', 'wscript',
];

const SHELL_IMAGE = {
    powershell: 'powershell.exe',
    command_prompt: 'cmd.exe',
    bash: 'bash',
    sh: 'sh',
};

const PLATFORM_PRODUCT = {
    windows: 'windows',
    linux: 'linux',
    macos: 'macos',
};

function stripPlaceholders(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/#\{[^}]+\}/g, ' ');
}

function tokenize(cmd) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(cmd)) !== null) {
        tokens.push(m[1] || m[2] || m[3]);
    }
    return tokens;
}

function findSecondaryImage(cmd) {
    const tokens = tokenize(stripPlaceholders(cmd));
    for (const t of tokens) {
        const bare = t.toLowerCase().replace(/\.(exe|ps1|sh|py|bat|cmd)$/, '');
        if (LOLBINS.includes(bare)) return bare;
    }
    return null;
}

const COMMON_TOKENS = new Set([
    '|', '||', '&&', '&', ';', '>', '>>', '<',
    '-', '--', 'in', 'do', 'if', 'then', 'else', 'fi',
    'echo', 'true', 'false', 'cd', 'cd..',
    'the', 'and', 'or', 'is', 'with', 'from',
]);

function extractKeywords(cmd, max = 5) {
    const cleaned = stripPlaceholders(cmd);
    const tokens = tokenize(cleaned);
    const out = [];
    const seen = new Set();
    for (const t of tokens) {
        if (out.length >= max) break;
        if (COMMON_TOKENS.has(t.toLowerCase())) continue;
        if (t.length < 3) continue;
        if (/^[a-z0-9_]+\.(exe|ps1|sh|py|bat|cmd)$/i.test(t)) continue;
        if (/^[-/]/.test(t)) {
            const key = t.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(t);
            continue;
        }
        if (/^[A-Za-z][A-Za-z0-9_-]{2,}$/.test(t)) {
            const key = t.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(t);
        }
    }
    return out;
}

function uuidV4() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function attackUrl(tid) {
    if (!tid) return null;
    const parts = tid.toUpperCase().split('.');
    return parts[1]
        ? `https://attack.mitre.org/techniques/${parts[0]}/${parts[1]}/`
        : `https://attack.mitre.org/techniques/${parts[0]}/`;
}

function tidTags(tid) {
    if (!tid) return [];
    const lower = tid.toLowerCase();
    if (lower.includes('.')) {
        const [base] = lower.split('.');
        return [`attack.${base}`, `attack.${lower}`];
    }
    return [`attack.${lower}`];
}

export function buildDetectionAst(inputs) {
    const exec = inputs.executor || {};
    const cmd = exec.command || '';
    const platforms = (inputs.supported_platforms || []).filter((p) => PLATFORM_PRODUCT[p]);
    return {
        technique_id: inputs.attack_technique || null,
        display_name: inputs.display_name || null,
        test_name: inputs.name || 'Untitled atomic test',
        description: inputs.description || '',
        platforms,
        primary_image: SHELL_IMAGE[exec.name] || null,
        secondary_image: findSecondaryImage(cmd),
        keywords: extractKeywords(cmd),
        guid: inputs.auto_generated_guid || null,
    };
}

// ─── SIGMA ────────────────────────────────────────────────────────────────
export function renderSigma(ast) {
    const platform = ast.platforms[0] || 'windows';
    const product = PLATFORM_PRODUCT[platform] || 'windows';
    const image = ast.secondary_image || ast.primary_image;

    const detection = { selection: {} };
    if (image) {
        const imageValue = product === 'windows' && !image.includes('/')
            ? `\\${image}${image.endsWith('.exe') ? '' : '.exe'}`
            : image;
        detection.selection['Image|endswith'] = imageValue;
    }
    if (ast.keywords.length > 0) {
        detection.selection['CommandLine|contains|all'] = ast.keywords;
    }
    detection.condition = 'selection';

    const doc = {
        title: `Atomic Red Team — ${ast.test_name}`,
        id: uuidV4(),
        status: 'experimental',
        description:
            (ast.description ||
                'Generated from atomicgen.io — refine selectors and tune for your environment.').trim(),
        references: [
            attackUrl(ast.technique_id),
            'https://github.com/redcanaryco/atomic-red-team',
        ].filter(Boolean),
        author: 'atomicgen.io',
        date: new Date().toISOString().slice(0, 10),
        tags: tidTags(ast.technique_id),
        logsource: { category: 'process_creation', product },
        detection,
        falsepositives: ['Legitimate administrative use — tune selectors before production.'],
        level: 'medium',
    };

    return yaml.dump(doc, { lineWidth: -1, noRefs: true });
}

// ─── KQL (Microsoft Defender ATP / Sentinel) ──────────────────────────────
export function renderKql(ast) {
    const image = ast.secondary_image || ast.primary_image || 'unknown.exe';
    const lines = [
        `// ${ast.test_name} — ${ast.technique_id || 'TXXXX'}`,
        `// Generated from atomicgen.io. Tune image / cmdline filters per environment.`,
        `DeviceProcessEvents`,
        `| where FileName =~ "${image}"`,
    ];
    if (ast.keywords.length > 0) {
        const args = ast.keywords
            .map((k) => `"${k.replace(/"/g, '\\"')}"`)
            .join(', ');
        lines.push(`| where ProcessCommandLine has_all (${args})`);
    }
    lines.push(
        `| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine, InitiatingProcessFileName, InitiatingProcessCommandLine`
    );
    return lines.join('\n');
}

// ─── SPL (Splunk + Sysmon EID 1) ─────────────────────────────────────────
export function renderSpl(ast) {
    const image = ast.secondary_image || ast.primary_image || 'unknown.exe';
    const product = PLATFORM_PRODUCT[ast.platforms[0]] || 'windows';
    const sourceType =
        product === 'windows'
            ? 'sourcetype="WinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1'
            : 'sourcetype="Linux:auditd" type=EXECVE';
    const imageMatch =
        product === 'windows' ? `Image="*\\\\${image}"` : `exe="*${image}*"`;
    const cmdMatches = ast.keywords
        .map((k) => `CommandLine="*${k.replace(/"/g, '\\"')}*"`)
        .join(' ');

    const lines = [
        `\`\`\` ${ast.test_name} — ${ast.technique_id || 'TXXXX'} \`\`\``,
        `\`\`\` Generated from atomicgen.io. Adjust index= and source-types per environment. \`\`\``,
        `index=* ${sourceType}`,
        `  ${imageMatch}${cmdMatches ? ' ' + cmdMatches : ''}`,
        `| table _time, host, User, Image, CommandLine, ParentImage, ParentCommandLine`,
    ];
    return lines.join('\n');
}

// ─── EQL (Elastic) ────────────────────────────────────────────────────────
export function renderEql(ast) {
    const image = ast.secondary_image || ast.primary_image || 'unknown.exe';
    const product = PLATFORM_PRODUCT[ast.platforms[0]] || 'windows';
    const conds = [
        `process.name : "${image}"`,
        ...ast.keywords.map(
            (k) => `process.command_line : "*${k.replace(/"/g, '\\"')}*"`
        ),
    ];
    return [
        `// ${ast.test_name} — ${ast.technique_id || 'TXXXX'} (${product})`,
        `// Generated from atomicgen.io.`,
        `process where event.type == "start" and`,
        `  ${conds.join(' and\n  ')}`,
    ].join('\n');
}

export const DETECTION_FORMATS = [
    { id: 'sigma', label: 'Sigma',  ext: 'yml',  language: 'yaml', render: renderSigma },
    { id: 'kql',   label: 'KQL',    ext: 'kql',  language: 'sh',   render: renderKql   },
    { id: 'spl',   label: 'SPL',    ext: 'spl',  language: 'sh',   render: renderSpl   },
    { id: 'eql',   label: 'EQL',    ext: 'eql',  language: 'sh',   render: renderEql   },
];

export function renderAll(inputs) {
    const ast = buildDetectionAst(inputs);
    return DETECTION_FORMATS.map((f) => ({ ...f, content: f.render(ast) }));
}
