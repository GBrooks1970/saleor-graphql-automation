import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildSchema, graphqlSync, getIntrospectionQuery } from 'graphql';
import { runSchemaMonitor, validateEndpoint, type MonitorOptions } from '../../scripts/monitor-schema.js';

const schema = 'directive @doc on FIELD_DEFINITION\ntype Query { shop: String }';
const introspection = (sdl = schema) => graphqlSync({ schema: buildSchema(sdl), source: getIntrospectionQuery() });

async function fixture(run: (options: MonitorOptions, serve: (handler: http.RequestListener) => Promise<string>) => Promise<void>) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'saleor-monitor-'));
  const baselinePath = path.join(directory, 'baseline.graphql');
  fs.writeFileSync(baselinePath, schema);
  const servers: http.Server[] = [];
  try {
    await run({ sourceType: 'introspection', outputDirectory: path.join(directory, 'report'), baselinePath }, async handler => {
      const server = http.createServer(handler);
      servers.push(server);
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      assert(address && typeof address !== 'string');
      return `http://127.0.0.1:${address.port}/graphql/`;
    });
  } finally {
    await Promise.all(servers.map(server => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    })));
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

describe('Upstream schema monitor', () => {
  it('defaults to SDL downloads with a content hash and detects domain changes', async () => fixture(async (options, serve) => {
    let content = schema;
    let method: string | undefined;
    const endpoint = await serve((request, response) => { method = request.method; response.end(content); });
    const run = () => runSchemaMonitor({ ...options, sourceType: undefined, endpoint });
    const compatible = await run();
    assert.equal(compatible.exitCode, 0); assert.equal(method, 'GET');
    assert.equal(compatible.report.sourceType, 'sdl');
    assert.equal(compatible.report.upstreamSha256, createHash('sha256').update(content).digest('hex'));
    content = schema.replace('shop: String', 'shop: String products: [String]');
    const additive = await run(); assert.equal(additive.exitCode, 0); assert.equal(additive.report.changes?.nonBreaking.length, 1);
    content = schema.replace('shop: String', 'products: [String]');
    const breaking = await run(); assert.equal(breaking.exitCode, 1); assert.equal(breaking.report.status, 'breaking');
    assert.equal(fs.readFileSync(options.baselinePath!, 'utf8'), schema);
  }));

  it('fails closed for unavailable, empty, invalid and oversized SDL downloads', async () => fixture(async (options, serve) => {
    let status = 200;
    let content = '';
    const endpoint = await serve((_, response) => { response.statusCode = status; response.end(content); });
    for (const variant of ['', '<html>error</html>', 'type Orphan { name: String }', ' '.repeat(10 * 1024 * 1024 + 1), schema]) {
      content = variant; status = content === schema ? 503 : 200;
      const result = await runSchemaMonitor({ ...options, sourceType: 'sdl', endpoint });
      assert.equal(result.exitCode, 2); assert.equal(result.report.status, 'unavailable');
      assert.equal(result.report.changes, null);
    }
  }));

  it('bounds SDL request duration and rejects unsupported source modes', async () => fixture(async (options, serve) => {
    const endpoint = await serve(() => {});
    const timeout = await runSchemaMonitor({ ...options, sourceType: 'sdl', endpoint, timeoutMs: 40 });
    assert.equal(timeout.exitCode, 2); assert.equal(timeout.report.status, 'unavailable');
    const invalid = await runSchemaMonitor({ ...options, sourceType: 'unknown', endpoint });
    assert.equal(invalid.exitCode, 2); assert.equal(invalid.report.status, 'configuration-error');
    assert.equal(invalid.report.sourceType, null);
  }));

  it('performs read-only introspection and writes provenance without modifying the baseline', async () => fixture(async (options, serve) => {
    let received: { method?: string; query: string } | undefined;
    const endpoint = await serve(async (request, response) => {
      let body = ''; for await (const chunk of request) body += chunk;
      received = { method: request.method, query: JSON.parse(body).query };
      response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(introspection()));
    });
    const before = fs.readFileSync(options.baselinePath!);
    const result = await runSchemaMonitor({ ...options, endpoint, revision: 'a'.repeat(40) });
    assert.equal(result.exitCode, 0);
    assert.equal(result.report.status, 'compatible');
    assert.equal(result.report.changes?.allChangesCount, 0);
    assert.match(result.report.baselineSha256!, /^[a-f0-9]{64}$/);
    assert.equal(received?.method, 'POST');
    assert.match(received!.query, /query IntrospectionQuery/);
    assert.equal(result.report.revision, 'a'.repeat(40));
    assert.deepEqual(fs.readFileSync(options.baselinePath!), before);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(options.outputDirectory, 'report.json'), 'utf8')), result.report);
    assert.match(fs.readFileSync(path.join(options.outputDirectory, 'summary.md'), 'utf8'), /Outcome: \*\*compatible\*\*/);
  }));

  it('reports additive changes without failing domain compatibility', async () => fixture(async (options, serve) => {
    const endpoint = await serve((_, response) => response.end(JSON.stringify(introspection(schema.replace('shop: String', 'shop: String products: [String]')))));
    const { exitCode, report } = await runSchemaMonitor({ ...options, endpoint });
    assert.equal(exitCode, 0);
    assert.equal(report.changes?.domainBreaking.length, 0);
    assert.equal(report.changes?.nonBreaking.length, 1);
  }));

  it('fails on a removed domain field with retained change details', async () => fixture(async (options, serve) => {
    const endpoint = await serve((_, response) => response.end(JSON.stringify(introspection(schema.replace('shop: String', 'products: [String]')))));
    const { exitCode, report } = await runSchemaMonitor({ ...options, endpoint });
    assert.equal(exitCode, 1); assert.equal(report.status, 'breaking');
    assert(report.changes?.domainBreaking.some(change => change.includes('shop')));
    assert(fs.existsSync(path.join(options.outputDirectory, 'summary.md')));
  }));

  it('preserves ADR-010 specification differences while enforcing domain directives', async () => fixture(async (options, serve) => {
    let removed = 'specifiedBy';
    const endpoint = await serve((_, response) => {
      const result = JSON.parse(JSON.stringify(introspection()));
      result.data.__schema.directives = result.data.__schema.directives.filter((directive: { name: string }) => directive.name !== removed);
      response.end(JSON.stringify(result));
    });
    const spec = await runSchemaMonitor({ ...options, endpoint });
    assert.equal(spec.exitCode, 0); assert.equal(spec.report.changes?.directiveSpecDifferences.length, 1);
    removed = 'doc';
    const domain = await runSchemaMonitor({ ...options, endpoint });
    assert.equal(domain.exitCode, 1); assert.equal(domain.report.changes?.domainBreaking.length, 1);
  }));

  it('fails closed for HTTP, GraphQL, invalid JSON and malformed introspection responses', async () => fixture(async (options, serve) => {
    let variant = 0;
    const endpoint = await serve((_, response) => {
      response.statusCode = variant === 0 ? 503 : 200;
      response.end([
        'unavailable', JSON.stringify({ errors: [{ message: 'Introspection disabled' }] }),
        'not json', JSON.stringify({ data: { __schema: {} } }),
      ][variant]);
    });
    for (variant = 0; variant < 4; variant++) {
      const { exitCode, report } = await runSchemaMonitor({ ...options, endpoint });
      assert.equal(exitCode, 2); assert.equal(report.status, 'unavailable'); assert.equal(report.changes, null);
    }
  }));

  it('bounds a non-responsive endpoint and reports connection refusal', async () => fixture(async (options, serve) => {
    const endpoint = await serve(() => {});
    const timeout = await runSchemaMonitor({ ...options, endpoint, timeoutMs: 40 });
    assert.equal(timeout.exitCode, 2); assert.equal(timeout.report.status, 'unavailable');
    const refused = await runSchemaMonitor({ ...options, endpoint: 'http://127.0.0.1:1/graphql/' });
    assert.equal(refused.exitCode, 2); assert.equal(refused.report.status, 'unavailable');
  }));

  it('requires an explicit target and never stores credentials from rejected URLs', async () => fixture(async options => {
    for (const endpoint of [undefined, '', 'not-a-url', 'file:///schema', 'https://user:secret@example.com/graphql/', 'https://example.com/graphql/?token=secret', 'https://example.com/graphql/#secret']) {
      const { exitCode, report } = await runSchemaMonitor({ ...options, endpoint });
      assert.equal(exitCode, 2); assert.equal(report.status, 'configuration-error'); assert.equal(report.endpoint, null);
      assert(!fs.readFileSync(path.join(options.outputDirectory, 'report.json'), 'utf8').includes('secret'));
    }
    assert.equal(validateEndpoint('https://example.com/graphql/'), 'https://example.com/graphql/');
  }));

  it('replaces a previous successful report when configuration or baseline fails', async () => fixture(async (options, serve) => {
    const endpoint = await serve((_, response) => response.end(JSON.stringify(introspection())));
    assert.equal((await runSchemaMonitor({ ...options, endpoint })).exitCode, 0);
    const result = await runSchemaMonitor({ ...options, endpoint, baselinePath: `${options.baselinePath}.missing` });
    assert.equal(result.exitCode, 2); assert.equal(result.report.status, 'configuration-error');
    assert.equal(JSON.parse(fs.readFileSync(path.join(options.outputDirectory, 'report.json'), 'utf8')).status, 'configuration-error');
  }));

  it('returns a non-zero CLI exit with no target even when the general Saleor endpoint is configured', async () => {
    const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
    const status = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/monitor-schema.ts'], {
        cwd: projectRoot,
        env: { ...process.env, SALEOR_SCHEMA_MONITOR_SOURCE: 'introspection', SALEOR_SCHEMA_MONITOR_URL: '', SALEOR_GRAPHQL_URL: 'http://127.0.0.1:1/graphql/' },
        stdio: 'ignore',
      });
      child.once('error', reject); child.once('exit', resolve);
    });
    assert.equal(status, 2);
  });
});
