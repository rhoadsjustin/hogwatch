import assert from 'node:assert/strict';
import test from 'node:test';

import { mockHogWatchRepository } from './index.ts';

test('season dashboard uses the latest game analysis rather than a separate score fixture', async () => {
  const [dashboard, gameAnalysis] = await Promise.all([mockHogWatchRepository.getSeasonDashboard(), mockHogWatchRepository.getGameAnalysis('utah')]);
  assert.equal(dashboard.latestGame?.id, 'utah');
  assert.deepEqual(dashboard.hogIndex, gameAnalysis?.hogIndex);
  assert.equal(dashboard.hogIndex?.total, 74);
});

test('metric trends and comparisons are derived from the same completed games', async () => {
  const [trend, comparison] = await Promise.all([mockHogWatchRepository.getMetricTrend('pressure-allowed'), mockHogWatchRepository.compareGames('north-alabama', 'utah')]);
  assert.deepEqual(trend?.values, [34, 29]);
  assert.deepEqual(comparison?.metricComparisons.find((metric) => metric.metricId === 'pressure-allowed'), { metricId: 'pressure-allowed', label: 'Pressure allowed', gameA: 34, gameB: 29, delta: -5, goodDirection: 'down' });
});
