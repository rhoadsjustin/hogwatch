import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenAIWebSearchScheduleProvider } from './openai-web-search.ts';

const payload = {
  output: [{ content: [{
    text: JSON.stringify({ coverage: '2026 official schedule; no games final.', games: [
      { week: 1, date: 'Sep 5', opponent: 'North Alabama', opponentShort: 'UNA', location: 'home', result: null, arkansasScore: null, opponentScore: null },
      { week: 2, date: 'Sep 12', opponent: 'Utah', opponentShort: 'UTAH', location: 'away', result: null, arkansasScore: null, opponentScore: null },
    ] }),
    annotations: [{ type: 'url_citation', title: 'Schedule | Arkansas Razorbacks', url: 'https://arkansasrazorbacks.com/sport/m-footbl/schedule/' }],
  }] }],
};

test('OpenAI web-search schedule provider validates cited live schedule data and caches it', async () => {
  let calls = 0;
  const provider = new OpenAIWebSearchScheduleProvider('test-key', {
    now: () => new Date('2026-08-15T12:00:00.000Z'),
    fetch: async (_input, init) => {
      calls += 1;
      assert.equal(init?.method, 'POST');
      assert.match(String(init?.headers && new Headers(init.headers).get('Authorization')), /^Bearer test-key$/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.tools[0].type, 'web_search');
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });
  const [first, second] = await Promise.all([provider.getSeasonSchedule(), provider.getSeasonSchedule()]);
  assert.equal(calls, 1);
  assert.equal(first.games[1]?.id, 'utah');
  assert.equal(second.provenance.sources?.[0]?.url, 'https://arkansasrazorbacks.com/sport/m-footbl/schedule/');
});

test('OpenAI web-search schedule provider rejects final games without both scores', async () => {
  const invalid = structuredClone(payload);
  const text = invalid.output[0].content[0].text;
  invalid.output[0].content[0].text = JSON.stringify({ ...JSON.parse(text), games: [{ week: 1, date: 'Sep 5', opponent: 'North Alabama', opponentShort: 'UNA', location: 'home', result: 'W', arkansasScore: 41, opponentScore: null }] });
  const provider = new OpenAIWebSearchScheduleProvider('test-key', { fetch: async () => new Response(JSON.stringify(invalid), { status: 200 }) });
  await assert.rejects(provider.getSeasonSchedule(), /final game must include both final scores/i);
});

test('OpenAI web-search schedule provider uses a validated shared cache across instances', async () => {
  const entries = new Map<string, unknown>();
  let calls = 0;
  const cache = {
    get: async (key: string) => entries.get(key),
    set: async (key: string, snapshot: unknown, ttlSeconds: number) => {
      assert.equal(ttlSeconds, 900);
      entries.set(key, snapshot);
    },
  };
  const first = new OpenAIWebSearchScheduleProvider('test-key', {
    cache,
    now: () => new Date('2026-08-15T12:00:00.000Z'),
    fetch: async () => { calls += 1; return new Response(JSON.stringify(payload), { status: 200 }); },
  });
  await first.getSeasonSchedule();

  const second = new OpenAIWebSearchScheduleProvider('test-key', {
    cache,
    fetch: async () => { throw new Error('a shared cache hit must not call OpenAI'); },
  });
  const cached = await second.getSeasonSchedule();
  assert.equal(calls, 1);
  assert.equal(cached.games[0]?.opponent, 'North Alabama');
});

test('OpenAI web-search schedule provider ignores malformed shared cache values', async () => {
  let calls = 0;
  const provider = new OpenAIWebSearchScheduleProvider('test-key', {
    cache: { get: async () => { return { season: 2026, games: [] }; }, set: async () => undefined },
    fetch: async () => { calls += 1; return new Response(JSON.stringify(payload), { status: 200 }); },
  });
  const snapshot = await provider.getSeasonSchedule();
  assert.equal(calls, 1);
  assert.equal(snapshot.provenance.source, 'provider');
});
