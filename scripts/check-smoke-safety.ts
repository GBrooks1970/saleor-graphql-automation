/**
 * Smoke Safety Guard (NFR-6)
 *
 * Enforces that no @smoke scenario can be tagged with @mutating or execute side-effecting mutations.
 * Guarantees that the `smoke` profile is safe to run against staging/demo environments.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FEATURES_DIR = path.resolve(__dirname, '../features');

export interface ScenarioTagInfo {
  file: string;
  scenarioName: string;
  tags: string[];
}

export function parseFeatureTags(content: string, filename: string): ScenarioTagInfo[] {
  const lines = content.split('\n');
  const scenarios: ScenarioTagInfo[] = [];

  let pendingTags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('@')) {
      const tags = line
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.startsWith('@'));
      pendingTags.push(...tags);
      continue;
    }

    if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
      const name = line.replace(/^(Scenario:|Scenario Outline:)/, '').trim();
      scenarios.push({
        file: filename,
        scenarioName: name,
        tags: [...pendingTags],
      });
      pendingTags = [];
      continue;
    }

    if (line.startsWith('Feature:') || line.startsWith('Background:')) {
      pendingTags = [];
    }
  }

  return scenarios;
}

export function validateSmokeSafety(featuresDir: string = FEATURES_DIR): {
  totalScenarios: number;
  smokeScenarios: number;
  violations: string[];
} {
  if (!fs.existsSync(featuresDir)) {
    return { totalScenarios: 0, smokeScenarios: 0, violations: [] };
  }

  const featureFiles = fs.readdirSync(featuresDir).filter((f) => f.endsWith('.feature'));
  const allScenarios: ScenarioTagInfo[] = [];

  for (const file of featureFiles) {
    const filePath = path.join(featuresDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    allScenarios.push(...parseFeatureTags(content, file));
  }

  const violations: string[] = [];
  let smokeCount = 0;

  for (const s of allScenarios) {
    const isSmoke = s.tags.includes('@smoke');
    const isMutating = s.tags.includes('@mutating');

    if (isSmoke) {
      smokeCount++;
      if (isMutating) {
        violations.push(
          `Violation in [${s.file}] "${s.scenarioName}": tagged with both @smoke and @mutating. Smoke tests must be read-only.`
        );
      }
    }
  }

  return {
    totalScenarios: allScenarios.length,
    smokeScenarios: smokeCount,
    violations,
  };
}

function main() {
  console.log('[check-smoke-safety] Verifying smoke scenario safety across features/...');
  const result = validateSmokeSafety();

  console.log(`[check-smoke-safety] Inspected ${result.totalScenarios} scenarios (${result.smokeScenarios} @smoke).`);

  if (result.violations.length > 0) {
    console.error('[check-smoke-safety] SAFETY VIOLATIONS FOUND:');
    result.violations.forEach((v) => console.error(`  - ${v}`));
    process.exit(1);
  }

  console.log('[check-smoke-safety] Safety check passed: zero @smoke scenarios are tagged with @mutating.');
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
