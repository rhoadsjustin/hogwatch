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

test('Worker limits tool calls before they reach the MCP server', async () => {
  let limitCalls = 0;
  const response = await worker.fetch(new Request('https://hogwatch.test/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.4' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'get_season_dashboard', arguments: {} } }),
  }), {
    MCP_TOOL_RATE_LIMITER: {
      limit: async ({ key }) => {
        limitCalls += 1;
        assert.equal(key, 'mcp-tools:203.0.113.4');
        return { success: false };
      },
    },
  });
  assert.equal(limitCalls, 1);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  const body = await response.json() as { id?: number; error?: { code?: number } };
  assert.equal(body.id, 7);
  assert.equal(body.error?.code, -32029);
});

test('Worker leaves the ChatGPT initialization handshake outside the tool-call limit', async () => {
  let limitCalls = 0;
  const response = await worker.fetch(new Request('https://hogwatch.test/mcp', {
    method: 'POST', headers: { Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 8, method: 'initialize',
      params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'worker-test', version: '1.0.0' } },
    }),
  }), { MCP_TOOL_RATE_LIMITER: { limit: async () => { limitCalls += 1; return { success: false }; } } });
  assert.equal(response.status, 200);
  assert.equal(limitCalls, 0);
});

test('Worker exposes the same read-only analytics reports for the native app', async () => {
  const dashboard = await worker.fetch(new Request('https://hogwatch.test/api/season-dashboard'), {});
  assert.equal(dashboard.status, 200);
  const dashboardBody = await dashboard.json() as { data?: { provenance?: { source?: string } } };
  assert.equal(dashboardBody.data?.provenance?.source, 'mock');

  const game = await worker.fetch(new Request('https://hogwatch.test/api/games/missing-game'), {});
  assert.equal(game.status, 404);
  const gameBody = await game.json() as { error?: string };
  assert.equal(gameBody.error, 'not_found');
});

test('Worker makes live chat explicit when no server-side OpenAI key is configured', async () => {
  const response = await worker.fetch(new Request('https://hogwatch.test/api/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity: 'game', id: 'utah', metricIds: ['pressure-generated'] }),
  }), {});
  assert.equal(response.status, 503);
  const body = await response.json() as { error?: string };
  assert.equal(body.error, 'chat_unavailable');
});

test('Worker limits expensive live chat requests independently from MCP tools', async () => {
  let limitCalls = 0;
  const response = await worker.fetch(new Request('https://hogwatch.test/api/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.4' },
    body: JSON.stringify({ entity: 'season', id: 'arkansas' }),
  }), {
    HOGWATCH_ASK_RATE_LIMITER: {
      limit: async ({ key }) => {
        limitCalls += 1;
        assert.equal(key, 'hogwatch-ask:203.0.113.4');
        return { success: false };
      },
    },
  });
  assert.equal(limitCalls, 1);
  assert.equal(response.status, 429);
  const body = await response.json() as { error?: string };
  assert.equal(body.error, 'rate_limited');
});

test('Worker serves the matchup preview and the prediction record over the JSON API', async () => {
  const [preview, record, missing] = await Promise.all([
    worker.fetch(new Request('https://hogwatch.test/api/matchups/georgia'), {}),
    worker.fetch(new Request('https://hogwatch.test/api/prediction-record'), {}),
    worker.fetch(new Request('https://hogwatch.test/api/matchups/not-a-game'), {}),
  ]);

  assert.equal(preview.status, 200);
  const previewBody = await preview.json() as { data?: { opponent?: { name?: string }; edges?: unknown[] } };
  assert.equal(previewBody.data?.opponent?.name, 'Georgia');
  assert.ok((previewBody.data?.edges?.length ?? 0) >= 4);

  assert.equal(record.status, 200);
  const recordBody = await record.json() as { data?: { gamesScored?: number } };
  assert.equal(recordBody.data?.gamesScored, 2);

  assert.equal(missing.status, 404);
});
