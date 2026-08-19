import assert from 'node:assert/strict';
import test from 'node:test';

import { mockHogWatchRepository } from '@hogwatch/data';

import { createHogWatchChat, HogWatchChatNotFoundError, HogWatchChatUnavailableError } from './hogwatch-chat.ts';

test('grounded chat sends only the selected report to the server-side Responses API', async () => {
  let request: RequestInit | undefined;
  const chat = createHogWatchChat(mockHogWatchRepository, {
    apiKey: 'server-only-test-key',
    model: 'gpt-test',
    fetcher: async (_input, init) => {
      request = init;
      return Response.json({ output_text: 'Fixture evidence says the pressure rate improved, but it is still fixture-backed.' });
    },
  });
  const result = await chat.ask({ entity: 'game', id: 'utah', metricIds: ['pressure-generated', 'not-a-metric'] });
  assert.equal(result.reportKind, 'game');
  assert.equal(result.provenance.source, 'mock');
  assert.match(result.answer, /fixture-backed/);
  assert.equal(request?.headers && new Headers(request.headers).get('authorization'), 'Bearer server-only-test-key');
  const payload = JSON.parse(String(request?.body)) as { model?: string; input?: string };
  assert.equal(payload.model, 'gpt-test');
  assert.match(payload.input ?? '', /pressure-generated/);
  assert.doesNotMatch(payload.input ?? '', /not-a-metric/);
  assert.match(payload.input ?? '', /Utah/);
});

test('grounded chat is explicit when it is not configured or a report is missing', async () => {
  const withoutKey = createHogWatchChat(mockHogWatchRepository, {});
  await assert.rejects(() => withoutKey.ask({ entity: 'season', id: 'arkansas' }), HogWatchChatUnavailableError);
  const withKey = createHogWatchChat(mockHogWatchRepository, {
    apiKey: 'test-key', fetcher: async () => Response.json({ output_text: 'unused' }),
  });
  await assert.rejects(() => withKey.ask({ entity: 'game', id: 'missing-game' }), HogWatchChatNotFoundError);
});
