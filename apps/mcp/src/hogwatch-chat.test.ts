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

test('grounded chat returns highlightable references and follow-ups from a JSON reply', async () => {
  let payload: Record<string, unknown> = {};
  const chat = createHogWatchChat(mockHogWatchRepository, {
    apiKey: 'test-key',
    fetcher: async (_input, init) => {
      payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        output_text: JSON.stringify({
          answer: 'The four-man pressure jump is the real signal, though the report is fixture-backed.',
          references: [
            { label: 'Four-man pressure, Week 2', metricId: 'four-man-pressure', week: 2, value: 28 },
            { label: 'Not a canonical metric', metricId: 'made-up-metric' },
          ],
          followUps: ['Did protection hold up?', 'How did the run game travel?', 'What changed at halftime?', 'A fourth question'],
        }),
      });
    },
  });

  const result = await chat.ask({
    entity: 'matchup',
    id: 'georgia',
    question: 'Where does Arkansas actually have an edge?',
    view: { metricId: 'four-man-pressure', weeks: [1, 2], screen: 'matchup' },
    history: [{ role: 'user', content: 'Give me the short version.' }],
  });

  assert.match(result.answer, /four-man pressure jump/);
  assert.equal(result.references.length, 2);
  assert.equal(result.references[0]?.metricId, 'four-man-pressure');
  // An unknown metric ID is dropped rather than passed through to the client.
  assert.equal(result.references[1]?.metricId, undefined);
  assert.equal(result.followUps.length, 3);
  assert.equal(result.reportKind, 'matchup');
  assert.match(String(payload.input), /Where does Arkansas actually have an edge\?/);
  assert.match(String(payload.input), /four-man-pressure/);
});

test('grounded chat still answers when the model replies with plain prose', async () => {
  const chat = createHogWatchChat(mockHogWatchRepository, {
    apiKey: 'test-key',
    fetcher: async () => Response.json({ output_text: 'Arkansas improved its protection, on fixture-backed data.' }),
  });

  const result = await chat.ask({ entity: 'season', id: 'arkansas-2026' });

  assert.match(result.answer, /improved its protection/);
  assert.deepEqual(result.references, []);
  assert.deepEqual(result.followUps, []);
});
