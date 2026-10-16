import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const reportRoot = path.resolve(projectRoot, 'target/site/serenity');
if (path.relative(projectRoot, reportRoot).replaceAll('\\', '/') !== 'target/site/serenity') {
  throw new Error('Refusing to clean outside the report directory');
}
rmSync(reportRoot, { recursive: true, force: true });
