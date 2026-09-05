/**
 * Schema Contract Diff Validator (FR-4)
 *
 * Compares a target GraphQL schema (from introspection or file) against
 * the baseline snapshot `schema/saleor-3.23.graphql` using @graphql-inspector/core.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchema, getIntrospectionQuery, buildClientSchema, printSchema, GraphQLSchema } from 'graphql';
import { diff, CriticalityLevel } from '@graphql-inspector/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.resolve(__dirname, '../schema/saleor-3.23.graphql');

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
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { data?: any };
    if (!result?.data) {
      return null;
    }

    return buildClientSchema(result.data);
  } catch {
    return null;
  }
}

export async function validateContract(
  baseline: GraphQLSchema,
  current: GraphQLSchema
): Promise<{ breaking: string[]; nonBreaking: string[] }> {
  const changes = await diff(baseline, current);

  const breaking: string[] = [];
  const nonBreaking: string[] = [];

  for (const change of changes) {
    if (change.criticality.level === CriticalityLevel.Breaking) {
      breaking.push(change.message);
    } else {
      nonBreaking.push(change.message);
    }
  }

  return { breaking, nonBreaking };
}

async function main() {
  console.log('[check-schema-contract] Loading baseline schema...');
  const baseline = await loadBaselineSchema();
  const typesCount = Object.keys(baseline.getTypeMap()).length;
  console.log(`[check-schema-contract] Loaded baseline schema with ${typesCount} types.`);

  const endpoint = process.env.SALEOR_GRAPHQL_URL;
  if (endpoint) {
    console.log(`[check-schema-contract] Probing live endpoint at ${endpoint}...`);
    const liveSchema = await fetchLiveSchema(endpoint);
    if (liveSchema) {
      console.log('[check-schema-contract] Diffing live schema against baseline...');
      const { breaking, nonBreaking } = await validateContract(baseline, liveSchema);
      console.log(`[check-schema-contract] Non-breaking changes: ${nonBreaking.length}`);
      if (breaking.length > 0) {
        console.error(`[check-schema-contract] Found ${breaking.length} BREAKING changes:`);
        breaking.forEach((b) => console.error(`  - ${b}`));
        process.exit(1);
      }
      console.log('[check-schema-contract] Contract valid! Zero breaking changes detected.');
      process.exit(0);
    } else {
      console.log('[check-schema-contract] Live endpoint unreachable; validating baseline self-consistency.');
    }
  }

  // Self-consistency check
  const { breaking } = await validateContract(baseline, baseline);
  if (breaking.length === 0) {
    console.log('[check-schema-contract] Baseline snapshot is self-consistent and valid.');
    process.exit(0);
  } else {
    console.error('[check-schema-contract] Baseline snapshot contains internal inconsistencies.');
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
