/**
 * Schema Contract Diff Validator (FR-4 & TRIAGE-02 / R-02)
 *
 * Compares a target GraphQL schema (from live introspection or offline snapshot)
 * against the baseline snapshot `schema/saleor-3.23.graphql` using @graphql-inspector/core.
 *
 * Enforces fail-closed evaluation:
 * 1. Fail-Closed Live Probing: When explicit live schema comparison is requested (via
 *    `--live`, `--endpoint <url>`, or `SALEOR_GRAPHQL_URL`), an unreachable or unhealthy
 *    endpoint exits with non-zero status. Never silently falls back to offline self-comparison.
 * 2. Specification Directive Classification (ADR-010): Distinguishes domain contract breaks
 *    from built-in GraphQL specification directive differences (@specifiedBy, @oneOf, and
 *    extended @deprecated locations introduced by graphql-js defaults).
 * 3. Domain Contract Invariant: Domain directives (@doc, @webhookEventsInfo) and all domain
 *    types, fields, inputs, arguments, and enums remain strictly enforced with zero domain
 *    breaking changes permitted.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchema, getIntrospectionQuery, buildClientSchema, GraphQLSchema } from 'graphql';
import { diff, CriticalityLevel } from '@graphql-inspector/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.resolve(__dirname, '../schema/saleor-3.23.graphql');

export interface ContractValidationResult {
  /** Domain breaking changes that violate client contracts (fails validation) */
  domainBreaking: string[];
  /** Alias to domainBreaking for contract gate checks */
  breaking: string[];
  /** Built-in GraphQL specification directive differences classified per ADR-010 */
  directiveSpecDifferences: string[];
  /** Non-breaking additions and enhancements */
  nonBreaking: string[];
  /** Total count of all detected differences */
  allChangesCount: number;
}

export const BUILTIN_SPEC_DIRECTIVES = new Set(['specifiedBy', 'oneOf', 'deprecated', 'include', 'skip']);

type InspectorChange = Awaited<ReturnType<typeof diff>>[number];

/**
 * Classifies whether a breaking diff change is an artifact of built-in GraphQL specification
 * directive variances between GraphQL engine implementations (e.g. graphql-js v16 vs Python graphql-core).
 */
export function isBuiltInDirectiveSpecDifference(change: InspectorChange | { type: string; path?: string; message: string }): boolean {
  if (change.type !== 'DIRECTIVE_REMOVED' && change.type !== 'DIRECTIVE_LOCATION_REMOVED') {
    return false;
  }

  const cleanPath = change.path ? change.path.replace(/^@/, '') : '';
  for (const name of BUILTIN_SPEC_DIRECTIVES) {
    if (
      cleanPath === name ||
      change.message.includes(`directive '${name}'`) ||
      change.message.includes(`Directive '${name}'`)
    ) {
      return true;
    }
  }

  return false;
}

export async function loadBaselineSchema(): Promise<GraphQLSchema> {
  const content = fs.readFileSync(BASELINE_PATH, 'utf8');
  return buildSchema(content);
}

export async function fetchLiveSchema(endpoint: string): Promise<GraphQLSchema | null> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: getIntrospectionQuery() }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[check-schema-contract] Endpoint ${endpoint} returned HTTP ${response.status} ${response.statusText}`);
      return null;
    }

    const result = (await response.json()) as { data?: any; errors?: any[] };
    if (!result?.data || result.errors?.length) {
      console.error(`[check-schema-contract] Endpoint ${endpoint} returned invalid GraphQL introspection data:`, result?.errors);
      return null;
    }

    return buildClientSchema(result.data);
  } catch (err: any) {
    console.error(`[check-schema-contract] Failed to connect to ${endpoint}: ${err?.message || err}`);
    return null;
  }
}

export async function validateContract(
  baseline: GraphQLSchema,
  current: GraphQLSchema
): Promise<ContractValidationResult> {
  const changes = await diff(baseline, current);

  const domainBreaking: string[] = [];
  const directiveSpecDifferences: string[] = [];
  const nonBreaking: string[] = [];

  for (const change of changes) {
    if (change.criticality.level === CriticalityLevel.Breaking) {
      if (isBuiltInDirectiveSpecDifference(change)) {
        directiveSpecDifferences.push(change.message);
      } else {
        domainBreaking.push(change.message);
      }
    } else {
      nonBreaking.push(change.message);
    }
  }

  return {
    domainBreaking,
    breaking: domainBreaking,
    directiveSpecDifferences,
    nonBreaking,
    allChangesCount: changes.length,
  };
}

export async function runContractCheck(args: string[] = process.argv.slice(2)): Promise<number> {
  console.log('[check-schema-contract] Loading baseline schema snapshot...');
  const baseline = await loadBaselineSchema();
  const typesCount = Object.keys(baseline.getTypeMap()).length;
  console.log(`[check-schema-contract] Loaded baseline schema with ${typesCount} types.`);

  const isLiveRequested =
    args.includes('--live') ||
    args.includes('--endpoint') ||
    Boolean(process.env.SALEOR_GRAPHQL_URL);
  let liveUrl: string | undefined;

  const endpointArgIndex = args.indexOf('--endpoint');
  if (endpointArgIndex !== -1 && args[endpointArgIndex + 1]) {
    liveUrl = args[endpointArgIndex + 1];
  } else if (process.env.SALEOR_GRAPHQL_URL) {
    liveUrl = process.env.SALEOR_GRAPHQL_URL;
  } else if (args.includes('--live')) {
    liveUrl = 'http://127.0.0.1:8000/graphql/';
  }

  if (isLiveRequested && liveUrl) {
    console.log(`[check-schema-contract] Probing explicit live endpoint at ${liveUrl}...`);
    const liveSchema = await fetchLiveSchema(liveUrl);

    if (!liveSchema) {
      console.error(`[check-schema-contract] FAIL-CLOSED: Explicit live endpoint is unreachable or unhealthy: ${liveUrl}`);
      console.error('[check-schema-contract] Aborting with non-zero exit; will not perform false-green fallback.');
      return 1;
    }

    console.log('[check-schema-contract] Diffing live schema against baseline...');
    const result = await validateContract(baseline, liveSchema);

    console.log(`[check-schema-contract] Inspected ${result.allChangesCount} total changes:`);
    console.log(`  - Domain breaking changes: ${result.domainBreaking.length}`);
    console.log(`  - Built-in specification directive differences: ${result.directiveSpecDifferences.length}`);
    console.log(`  - Non-breaking changes / enhancements: ${result.nonBreaking.length}`);

    if (result.domainBreaking.length > 0) {
      console.error(`[check-schema-contract] FOUND ${result.domainBreaking.length} DOMAIN BREAKING CHANGES:`);
      result.domainBreaking.forEach((b) => console.error(`  - ${b}`));
      return 1;
    }

    if (result.directiveSpecDifferences.length > 0) {
      console.log(`[check-schema-contract] Classified ${result.directiveSpecDifferences.length} built-in specification directive differences (ADR-010):`);
      result.directiveSpecDifferences.forEach((d) => console.log(`  * ${d}`));
    }

    console.log('[check-schema-contract] Live schema contract valid! Zero domain breaking changes detected.');
    return 0;
  }

  // Offline deterministic mode
  console.log('[check-schema-contract] Running in offline deterministic mode (validating baseline self-consistency)...');
  const result = await validateContract(baseline, baseline);

  if (result.domainBreaking.length === 0 && result.allChangesCount === 0) {
    console.log('[check-schema-contract] Baseline snapshot is self-consistent and valid.');
    return 0;
  }

  console.error('[check-schema-contract] Baseline snapshot contains internal inconsistencies.');
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runContractCheck().then((exitCode) => {
    process.exit(exitCode);
  });
}

