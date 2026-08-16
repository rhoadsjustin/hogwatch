import assert from 'node:assert/strict';
import test from 'node:test';

import worker from './worker.ts';

test('Worker exposes health and a stateless Streamable HTTP MCP endpoint', async () => {
  const health = await worker.fetch(new Request('https://hogwatch.test/health'), {});
  assert.deepEqual(await health.json(), { status: 'ok', service: 'hogwatch-mcp' });

  const response = await worker.fetch(new Request('https://hogwatch.test/mcp', {
    method: 'POST',
    headers: { Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'worker-test', version: '1.0.0' } },
    }),
  }), {});
  assert.equal(response.status, 200);
  const body = await response.json() as { result?: { serverInfo?: { name?: string } } };
  assert.equal(body.result?.serverInfo?.name, 'hogwatch');
});
