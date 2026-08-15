import assert from 'node:assert/strict';
import test from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createHogWatchServer } from './server.js';
import { SEASON_DASHBOARD_RESOURCE_URI } from './season-dashboard-widget.js';

test('MCP server advertises a read-only dashboard renderer and MCP Apps resource', async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createHogWatchServer();
  const client = new Client({ name: 'hogwatch-test-client', version: '1.0.0' });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const { tools } = await client.listTools();
    const renderTool = tools.find((tool) => tool.name === 'render_season_dashboard');
    assert.equal(renderTool?.annotations?.readOnlyHint, true);
    assert.equal(renderTool?._meta?.['openai/outputTemplate'], SEASON_DASHBOARD_RESOURCE_URI);

    const { resources } = await client.listResources();
    assert.ok(resources.some((resource) => resource.uri === SEASON_DASHBOARD_RESOURCE_URI));

    const resource = await client.readResource({ uri: SEASON_DASHBOARD_RESOURCE_URI });
    assert.match(resource.contents[0]?.mimeType ?? '', /text\/html;profile=mcp-app/);

    const result = await client.callTool({ name: 'render_season_dashboard', arguments: {} });
    assert.deepEqual(result.structuredContent, {
      dashboard: await (await import('@hogwatch/data')).mockHogWatchRepository.getSeasonDashboard(),
    });
  } finally {
    await client.close();
    await server.close();
  }
});
