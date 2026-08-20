import assert from 'node:assert/strict';
import test from 'node:test';

import { ArkansasOfficialScheduleProvider } from './arkansas-official-schedule.ts';

const scheduleHtml = `
  <section class="events">
    <div class="item">
      <div class="type home">Home</div>
      <span class="month">Sat. <strong>Sep. 5</strong></span>
      <div class="opponent"><span>North Alabama</span></div>
      <div class="results-container"></div>
    </div>
    <div class="item">
      <div class="type away">Away</div>
      <span class="month">Sat. <strong>Sep. 12</strong></span>
      <div class="opponent"><span>at Utah</span></div>
      <div class="results-container"><a class="results win">W, 31-24</a></div>
    </div>
    <div class="item">
      <div class="type away">Away</div>
      <span class="month">Sat. <strong>Oct. 3</strong></span>
      <div class="opponent"><span>at Texas A&amp;M</span></div>
      <div class="results-container"></div>
    </div>
  </section>`;

test('official Arkansas schedule provider normalizes schedule entries and final scores', async () => {
  let calls = 0;
  const provider = new ArkansasOfficialScheduleProvider({
    now: () => new Date('2026-09-12T23:00:00.000Z'),
    fetch: async (input) => {
      calls += 1;
      assert.equal(input, 'https://arkansasrazorbacks.com/sport/m-footbl/schedule/');
      return new Response(scheduleHtml, { status: 200 });
    },
  });
  const snapshot = await provider.getSeasonSchedule();
  assert.equal(calls, 1);
  assert.equal(snapshot.provenance.provider, 'Arkansas Razorbacks official athletics');
  assert.deepEqual(snapshot.games.map((game) => ({ opponent: game.opponent, result: game.result, arkansasScore: game.arkansasScore, opponentScore: game.opponentScore })), [
    { opponent: 'North Alabama', result: undefined, arkansasScore: undefined, opponentScore: undefined },
    { opponent: 'Utah', result: 'W', arkansasScore: 31, opponentScore: 24 },
    { opponent: 'Texas A&M', result: undefined, arkansasScore: undefined, opponentScore: undefined },
  ]);
});

test('the live schedule emits the same canonical IDs the fixture repository uses', async () => {
  const provider = new ArkansasOfficialScheduleProvider({
    now: () => new Date('2026-09-12T23:00:00.000Z'),
    fetch: async () => new Response(scheduleHtml, { status: 200 }),
  });

  const snapshot = await provider.getSeasonSchedule();

  // 'Texas A&M' previously slugged to 'texas-a-m' here and 'texas-am' in the
  // fixtures, which silently dropped the game's preview.
  assert.deepEqual(snapshot.games.map((game) => game.id), ['north-alabama', 'utah', 'texas-am']);
});

test('official Arkansas schedule provider uses the shared KV-compatible cache before fetching', async () => {
  const entries = new Map<string, unknown>();
  const cache = {
    get: async (key: string) => entries.get(key),
    set: async (key: string, snapshot: unknown, ttlSeconds: number) => {
      assert.equal(ttlSeconds, 900);
      entries.set(key, snapshot);
    },
  };
  const first = new ArkansasOfficialScheduleProvider({ cache, fetch: async () => new Response(scheduleHtml, { status: 200 }) });
  await first.getSeasonSchedule();
  const second = new ArkansasOfficialScheduleProvider({
    cache,
    fetch: async () => { throw new Error('a KV cache hit must not fetch the official source'); },
  });
  assert.equal((await second.getSeasonSchedule()).games.length, 3);
});
