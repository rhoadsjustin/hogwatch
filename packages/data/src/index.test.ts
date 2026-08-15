import assert from 'node:assert/strict';
import test from 'node:test';

import { mockHogWatchRepository, normalizeMetricValues } from './index.ts';

test('season dashboard uses the latest game analysis rather than a separate score fixture', async () => {
  const [dashboard, gameAnalysis] = await Promise.all([mockHogWatchRepository.getSeasonDashboard(), mockHogWatchRepository.getGameAnalysis('utah')]);
  assert.equal(dashboard.latestGame?.id, 'utah');
  assert.deepEqual(dashboard.hogIndex, gameAnalysis?.hogIndex);
  assert.equal(dashboard.hogIndex?.total, 74);
});

test('metric trends and comparisons are derived from the same completed games', async () => {
  const [trend, comparison] = await Promise.all([mockHogWatchRepository.getMetricTrend({ metricId: 'pressure-allowed' }), mockHogWatchRepository.compareGames('north-alabama', 'utah')]);
  assert.deepEqual(trend?.values, [34, 29]);
  assert.deepEqual(comparison?.metricComparisons.find((metric) => metric.metricId === 'pressure-allowed'), { metricId: 'pressure-allowed', label: 'Pressure allowed', gameA: 34, gameB: 29, delta: -5, goodDirection: 'down' });
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
