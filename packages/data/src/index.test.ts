import assert from 'node:assert/strict';
import test from 'node:test';

import { toHogWatchId } from '@hogwatch/core';
import { mockHogWatchRepository, normalizeMetricValues } from './index.ts';

test('season dashboard uses the latest game analysis rather than a separate score fixture', async () => {
  const [dashboard, gameAnalysis] = await Promise.all([mockHogWatchRepository.getSeasonDashboard(), mockHogWatchRepository.getGameAnalysis('utah')]);
  assert.equal(dashboard.latestGame?.id, 'utah');
  assert.deepEqual(dashboard.hogIndex, gameAnalysis?.hogIndex);
  assert.equal(dashboard.hogIndex?.total, 74);
});

test('every scheduled game gets a preview, so none is silently dropped', async () => {
  const games = await mockHogWatchRepository.listGames();

  assert.equal(games.length, 12);
  const missing = games.filter((game) => !game.prediction).map((game) => game.id);
  assert.deepEqual(missing, [], `every game needs a preview; missing: ${missing.join(', ')}`);
});

test('game IDs come from the canonical function every provider shares', async () => {
  const games = await mockHogWatchRepository.listGames();

  for (const game of games) {
    assert.equal(game.id, toHogWatchId(game.opponent), `${game.opponent} must use the canonical ID`);
  }
  assert.ok(games.some((game) => game.id === 'texas-am'), 'Texas A&M must resolve to a single ID');
});

test('predictions survive kickoff and are scored against the result', async () => {
  const games = await mockHogWatchRepository.listGames();
  const utah = games.find((game) => game.id === 'utah');

  assert.ok(utah?.prediction, 'a completed game keeps the call that preceded it');
  assert.equal(utah.prediction.outcome?.actualMargin, -3);
  assert.equal(typeof utah.prediction.outcome?.brierScore, 'number');
  // An upcoming game has a prediction but no outcome yet.
  assert.equal(games.find((game) => game.id === 'georgia')?.prediction?.outcome, undefined);
});

test('a prediction cannot see the game it is predicting', async () => {
  const games = await mockHogWatchRepository.listGames();
  const opener = games.find((game) => game.id === 'north-alabama');
  const utah = games.find((game) => game.id === 'utah');

  // Week 1 has no completed games behind it, so it can only use camp inputs.
  assert.equal(opener?.prediction?.confidence, 'preseason');
  assert.equal(utah?.prediction?.confidence, 'early');
});

test('projections are denominated in points and their totals move with the matchup', async () => {
  const games = await mockHogWatchRepository.listGames();
  const totals = new Set(games.flatMap((game) => (game.prediction
    ? [game.prediction.projectedArkansasScore + game.prediction.projectedOpponentScore]
    : [])));

  assert.ok(totals.size > 1, 'every projected total must not be the same number');
  for (const game of games) {
    const prediction = game.prediction;
    if (!prediction) continue;
    assert.ok(prediction.likelyMargin.low < prediction.projectedMargin);
    assert.ok(prediction.likelyMargin.high > prediction.projectedMargin);
  }
});

test('the model keeps a public record instead of erasing its calls', async () => {
  const record = await mockHogWatchRepository.getPredictionRecord();

  assert.equal(record.gamesScored, 2);
  assert.deepEqual(record.entries.map((entry) => entry.gameId), ['north-alabama', 'utah']);
  assert.ok(record.brierScore >= 0 && record.brierScore <= 1);
  assert.equal(record.coinFlipBrierScore, 0.25);
  assert.match(record.note, /coin flip/i);
});

test('the projected record is derived from win probabilities, not hardcoded', async () => {
  const [dashboard, games] = await Promise.all([
    mockHogWatchRepository.getSeasonDashboard(),
    mockHogWatchRepository.listGames(),
  ]);
  const wins = games.filter((game) => game.result === 'W').length;
  const expected = Math.round(wins + games
    .filter((game) => !game.result)
    .reduce((total, game) => total + (game.prediction?.winProbability ?? 0) / 100, 0));

  assert.equal(dashboard.projectedRecord, `${expected}-${games.length - expected}`);
});

test('a matchup preview puts both teams in the same metric vocabulary', async () => {
  const preview = await mockHogWatchRepository.getMatchupPreview('georgia');

  assert.ok(preview);
  assert.equal(preview.opponent.name, 'Georgia');
  assert.equal(preview.arkansas.teamId, 'arkansas');
  assert.ok(preview.edges.length >= 4, 'a preview needs several unit collisions');
  assert.equal(preview.swingFactors.length, 3);
  for (const edge of preview.edges) {
    assert.ok(edge.arkansas.percentile >= 1 && edge.arkansas.percentile <= 99);
    assert.ok(edge.opponent.percentile >= 1 && edge.opponent.percentile <= 99);
    assert.equal(edge.gap, edge.arkansas.percentile - edge.opponent.percentile);
  }
  // Modelled opponent values must say so, and the coverage note must repeat it.
  assert.ok(preview.opponent.metrics.every((metric) => metric.basis === 'modelled'));
  assert.match(preview.provenance.coverage, /modelled/i);
});

test('a matchup preview is unavailable rather than silently empty for an unknown opponent', async () => {
  assert.equal(await mockHogWatchRepository.getMatchupPreview('not-on-the-schedule'), undefined);
});

test('metric trends and comparisons are derived from the same completed games', async () => {
  const [trend, comparison] = await Promise.all([mockHogWatchRepository.getMetricTrend({ metricId: 'pressure-allowed' }), mockHogWatchRepository.compareGames('north-alabama', 'utah')]);
  assert.deepEqual(trend?.values, [34, 29]);
  assert.deepEqual(comparison?.metricComparisons.find((metric) => metric.metricId === 'pressure-allowed'), {
    metricId: 'pressure-allowed', label: 'Pressure allowed', gameA: 34, gameB: 29, delta: -5, goodDirection: 'down',
    gameAPercentile: 37, gameBPercentile: 69,
  });
});

test('game comparison is gated on measured metrics, not on a final score', async () => {
  const [scheduled, sameGame] = await Promise.all([
    mockHogWatchRepository.compareGames('north-alabama', 'georgia'),
    mockHogWatchRepository.compareGames('utah', 'utah'),
  ]);

  // Georgia has no measured metrics yet, so there is nothing to compare.
  assert.equal(scheduled, undefined);
  assert.equal(sameGame, undefined);
  const graded = await mockHogWatchRepository.compareGames('north-alabama', 'utah');
  assert.match(graded?.summary ?? '', /shared metrics/);
});

test('the repository applies its explicit rolling and opponent-adjusted trend options', async () => {
  const trend = await mockHogWatchRepository.getMetricTrend({
    metricId: 'pressure-allowed',
    adjustment: 'opponent-adjusted',
    rollingWindow: 2,
  });

  assert.deepEqual(trend?.values, [38, 31]);
  assert.deepEqual(trend?.weeks, [1, 2]);
});

test('pregame copy is written from the game rather than fixed to one week', async () => {
  const [georgia, lsu] = await Promise.all([
    mockHogWatchRepository.getGameAnalysis('georgia'),
    mockHogWatchRepository.getGameAnalysis('lsu'),
  ]);

  assert.match(georgia?.story ?? '', /Georgia/);
  assert.match(lsu?.story ?? '', /LSU/);
  assert.notEqual(georgia?.story, lsu?.story);
});

test('provider adapters normalize named canonical metrics before repositories consume them', () => {
  assert.deepEqual(normalizeMetricValues([
    { metricId: 'four-man-pressure', value: 28, sourceField: 'pass_rush.four_man_pressure_rate' },
    { metricId: 'turnover-worthy-play-rate', value: 1.8, sourceField: 'passing.twp_rate' },
  ]), {
    'four-man-pressure': 28,
    'turnover-worthy-play-rate': 1.8,
  });
  assert.throws(() => normalizeMetricValues([
    { metricId: 'success-rate', value: 46, sourceField: 'offense.success_rate' },
    { metricId: 'success-rate', value: 47, sourceField: 'offense.success_rate_alt' },
  ]), /duplicate metric value/);
});
