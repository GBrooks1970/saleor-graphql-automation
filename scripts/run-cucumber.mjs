import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const [suite, ...args] = process.argv.slice(2);
const profiles = { default: 'default', smoke: 'smoke', api: 'api', checkout: 'api' };
if (!Object.hasOwn(profiles, suite ?? '')) {
  throw new Error('Expected report suite: default, smoke, api or checkout');
}

const reportRoot = path.resolve(projectRoot, 'target/site/serenity');
const outputDirectory = path.resolve(reportRoot, suite);
if (path.dirname(outputDirectory) !== reportRoot) {
  throw new Error('Report directory must be a direct child of the project report root');
}
rmSync(outputDirectory, { recursive: true, force: true });

const result = spawnSync(process.execPath, [
  '--import', 'tsx',
  path.resolve(projectRoot, 'node_modules/@cucumber/cucumber/bin/cucumber.js'),
  '--profile', profiles[suite], ...args,
], {
  cwd: projectRoot,
  env: { ...process.env, SERENITY_REPORT_SUITE: suite },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
