import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assertValidSchema, buildSchema, type GraphQLSchema } from 'graphql';
import { BASELINE_PATH, fetchLiveSchema, loadBaselineSchema, validateContract, type ContractValidationResult } from './check-schema-contract.js';

export type MonitorStatus = 'compatible' | 'breaking' | 'unavailable' | 'configuration-error';
export const DEFAULT_SCHEMA_URL = 'https://raw.githubusercontent.com/saleor/saleor/3.23/saleor/graphql/schema.graphql';
export type SourceType = 'sdl' | 'introspection';
export interface MonitorReport {
  version: 1;
  observedAt: string;
  status: MonitorStatus;
  endpoint: string | null;
  sourceType: SourceType | null;
  upstreamSha256: string | null;
  baselineSha256: string | null;
  revision: string | null;
  changes: ContractValidationResult | null;
  problem: string | null;
}

export interface MonitorOptions {
  sourceType?: string;
  endpoint?: string;
  outputDirectory: string;
  baselinePath?: string;
  revision?: string;
  timeoutMs?: number;
}

/** Explicit targets only: no implicit localhost and no secrets in report URLs. */
export function validateEndpoint(value: string | undefined): string {
  if (!value?.trim()) throw new Error('Set SALEOR_SCHEMA_MONITOR_URL to the upstream source URL.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('The monitor endpoint must be an absolute HTTP(S) URL.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTP(S) endpoint without credentials, query parameters or fragments.');
  }
  return url.href;
}

function markdownText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replace(/[\\`*_[\]{}()#!|]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

export function formatMonitorSummary(report: MonitorReport): string {
  const lines = [
    '# Saleor upstream schema monitor', '',
    `- Outcome: **${report.status}**`,
    `- Observed: ${report.observedAt}`,
    `- Endpoint: ${report.endpoint ? markdownText(report.endpoint) : 'not configured'}`,
    `- Source type: ${report.sourceType ?? 'invalid'}`,
    `- Upstream content SHA-256: ${report.upstreamSha256 ?? 'not captured (introspection or failed download)'}`,
    `- Baseline SHA-256: ${report.baselineSha256 ?? 'unavailable'}`,
    `- Revision: ${report.revision ?? 'local working tree'}`, '',
  ];
  if (report.problem) lines.push(markdownText(report.problem), '');
  if (report.changes) {
    for (const [title, changes] of [
      ['Domain breaking changes', report.changes.domainBreaking],
      ['Specification directive differences (ADR-010)', report.changes.directiveSpecDifferences],
      ['Other changes (includes dangerous changes)', report.changes.nonBreaking],
    ] as const) {
      lines.push(`## ${title}: ${changes.length}`, '');
      lines.push(...changes.map(change => `- ${markdownText(change)}`), '');
    }
  }
  lines.push('This compares the selected upstream schema with the committed baseline. SDL mode does not inspect a running deployment. Neither mode runs business journeys or promotes the baseline.', '');
  return lines.join('\n');
}

export async function runSchemaMonitor(options: MonitorOptions): Promise<{ exitCode: number; report: MonitorReport }> {
  const report: MonitorReport = {
    version: 1, observedAt: new Date().toISOString(), status: 'configuration-error',
    endpoint: null, sourceType: null, upstreamSha256: null, baselineSha256: null,
    revision: options.revision && /^[a-f0-9]{40}$/i.test(options.revision) ? options.revision : null,
    changes: null, problem: null,
  };
  try {
    const sourceType = options.sourceType ?? 'sdl';
    if (sourceType !== 'sdl' && sourceType !== 'introspection') throw new Error('Select source type sdl or introspection.');
    report.sourceType = sourceType;
    report.endpoint = validateEndpoint(options.endpoint ?? (sourceType === 'sdl' ? DEFAULT_SCHEMA_URL : undefined));
    const baselinePath = options.baselinePath ?? BASELINE_PATH;
    report.baselineSha256 = createHash('sha256').update(fs.readFileSync(baselinePath)).digest('hex');
    const baseline = await loadBaselineSchema(baselinePath);
    report.status = 'unavailable';
    let live: GraphQLSchema | null;
    if (sourceType === 'sdl') {
      const response = await fetch(report.endpoint, { signal: AbortSignal.timeout(options.timeoutMs ?? 15000) });
      if (!response.ok) throw new Error('Upstream schema download failed.');
      // Bound the decoded download too, including responses without Content-Length.
      if (!response.body) throw new Error('Empty schema response.');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 10 * 1024 * 1024) throw new Error('Schema exceeds 10 MiB limit.');
          chunks.push(value);
        }
      } finally { await reader.cancel(); }
      const bytes = Buffer.concat(chunks);
      report.upstreamSha256 = createHash('sha256').update(bytes).digest('hex');
      live = buildSchema(bytes.toString('utf8'));
      assertValidSchema(live);
    } else {
      live = await fetchLiveSchema(report.endpoint, options.timeoutMs);
    }
    if (!live) {
      report.problem = 'Upstream introspection failed or returned an invalid schema. No offline fallback was used.';
    } else {
      report.changes = await validateContract(baseline, live);
      report.status = report.changes.domainBreaking.length > 0 ? 'breaking' : 'compatible';
    }
  } catch (error: unknown) {
    // Do not persist raw endpoint values or arbitrary server error bodies.
    report.problem = report.endpoint === null && error instanceof Error
      ? error.message
      : report.status === 'unavailable'
        ? 'Unable to download, parse or compare the upstream schema. No fallback was used; check source availability, size and format.'
        : 'Unable to load the baseline; inspect the configuration and retry.';
  }
  fs.mkdirSync(options.outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(options.outputDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(options.outputDirectory, 'summary.md'), formatMonitorSummary(report));
  const exitCode = report.status === 'compatible' ? 0 : report.status === 'breaking' ? 1 : 2;
  console.log(`[monitor-schema] ${report.status}; changes=${report.changes?.allChangesCount ?? 'unknown'}; exit=${exitCode}`);
  return { exitCode, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projectRoot = fileURLToPath(new URL('../', import.meta.url));
  runSchemaMonitor({
    sourceType: process.env.SALEOR_SCHEMA_MONITOR_SOURCE || 'sdl',
    endpoint: process.env.SALEOR_SCHEMA_MONITOR_URL || undefined,
    outputDirectory: path.join(projectRoot, 'target/schema-drift'),
    revision: process.env.GITHUB_SHA,
  }).then(({ exitCode }) => { process.exitCode = exitCode; }).catch(() => {
    console.error('[monitor-schema] Could not write monitor evidence.');
    process.exitCode = 2;
  });
}
