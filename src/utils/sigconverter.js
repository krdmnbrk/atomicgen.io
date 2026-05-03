// Build a sigconverter.io deep-link from a Sigma YAML rule. Mirrors the
// URL structure used by the official site (magicsword-io/sigconverter.io):
//
//   https://sigconverter.io/
//     #version=3.0.2
//     &backend=<pysigma-backend-name>      (e.g. splunk, elasticsearch, microsoft365defender)
//     &format=<backend-specific-format>     (e.g. default, savedsearches, datamodel, lucene, eql, esql, aql)
//     &pipeline=                            (empty by default; user picks on site)
//     &rule=<base64 of the sigma yaml>
//     &pipelineYml=

const SIGCONVERTER_BASE = 'https://sigconverter.io/';
const PYSIGMA_VERSION = '3.0.2';

// UTF-8-safe base64 encoder. plain btoa() chokes on non-ASCII chars (which
// can appear in Sigma YAML — author names, references, descriptions).
function utf8Btoa(str) {
    if (typeof str !== 'string') return '';
    if (typeof TextEncoder !== 'undefined') {
        const bytes = new TextEncoder().encode(str);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }
    // Fallback for older runtimes
    return btoa(unescape(encodeURIComponent(str)));
}

export function buildSigconverterUrl(sigmaYaml, backend = '', format = '') {
    if (!sigmaYaml) return null;
    const b64 = utf8Btoa(sigmaYaml);
    return (
        `${SIGCONVERTER_BASE}#version=${PYSIGMA_VERSION}` +
        `&backend=${encodeURIComponent(backend || '')}` +
        `&format=${encodeURIComponent(format || '')}` +
        `&pipeline=` +
        `&rule=${b64}` +
        `&pipelineYml=`
    );
}

// Curated list of pySigma backends + output formats that sigconverter.io
// supports, grouped by vendor. `backend` and `format` map directly to the
// sigconverter URL params (which proxy pysigma's CLI).
//
// Source: pySigma plugins ecosystem + sigconverter.io's UI options.
// Add / remove entries here when sigconverter publishes new backends.
export const SIGCONVERTER_TARGETS = [
    { section: 'Splunk' },
    { label: 'Splunk — Search',                backend: 'splunk',                  format: 'default'        },
    { label: 'Splunk — Saved Search',          backend: 'splunk',                  format: 'savedsearches'  },
    { label: 'Splunk — Data Model',            backend: 'splunk',                  format: 'data_model'     },

    { section: 'Microsoft' },
    { label: 'Microsoft 365 Defender (KQL)',   backend: 'microsoft365defender',    format: 'default'        },
    { label: 'Microsoft Sentinel (KQL)',       backend: 'kusto',                   format: 'default'        },

    { section: 'Elastic / OpenSearch' },
    { label: 'Elasticsearch — Lucene',         backend: 'elasticsearch',           format: 'lucene'         },
    { label: 'Elasticsearch — EQL',            backend: 'elasticsearch',           format: 'eql'            },
    { label: 'Elasticsearch — ES|QL',          backend: 'elasticsearch',           format: 'esql'           },
    { label: 'Elasticsearch — DSL Lucene',     backend: 'elasticsearch',           format: 'dsl_lucene'     },
    { label: 'OpenSearch — Lucene',            backend: 'opensearch',              format: 'lucene'         },

    { section: 'EDR / XDR' },
    { label: 'CrowdStrike — NG-SIEM',          backend: 'crowdstrike',             format: 'default'        },
    { label: 'CrowdStrike — LogScale',         backend: 'crowdstrike_logscale',    format: 'default'        },
    { label: 'SentinelOne — Deep Visibility',  backend: 'sentinelone',             format: 'default'        },
    { label: 'SentinelOne — PowerQuery',       backend: 'sentinelone_pq',          format: 'default'        },
    { label: 'CarbonBlack',                    backend: 'carbonblack',             format: 'default'        },
    { label: 'Cortex XDR',                     backend: 'cortex_xdr',              format: 'default'        },

    { section: 'SIEM / log platforms' },
    { label: 'IBM QRadar (AQL)',               backend: 'qradar',                  format: 'default'        },
    { label: 'IBM QRadar — Saved Search',      backend: 'qradar',                  format: 'aql'            },
    { label: 'Google SecOps (Chronicle UDM)',  backend: 'secops',                  format: 'default'        },
    { label: 'Securonix',                      backend: 'securonix',               format: 'default'        },
    { label: 'Graylog',                        backend: 'graylog',                 format: 'default'        },
    { label: 'Loki — Ruler',                   backend: 'loki',                    format: 'ruler'          },
    { label: 'Loki — LogQL',                   backend: 'loki',                    format: 'default'        },
    { label: 'Hawk',                           backend: 'hawk',                    format: 'default'        },
    { label: 'Panther',                        backend: 'panther',                 format: 'default'        },
    { label: 'Insight IDR (Rapid7)',           backend: 'insightidr',              format: 'default'        },

    { section: 'Generic' },
    { label: 'Sigma (no conversion — pick on the site)',  backend: '',             format: ''               },
];
