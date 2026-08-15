import assert from 'node:assert/strict';
import test from 'node:test';

import { mockHogWatchRepository } from '@hogwatch/data';

import { createHogWatchToolData } from './tool-data.js';

test('MCP tool data returns the repository-derived Utah HOG Index', async () => {
  const tools = createHogWatchToolData(mockHogWatchRepository);
  const [dashboard, game] = await Promise.all([tools.getSeasonDashboard(), tools.getGameAnalysis('utah')]);

  assert.equal(game?.game.id, 'utah');
  assert.deepEqual(dashboard.hogIndex, game?.hogIndex);
});

test('MCP tool data exposes reports, trends, and game comparisons', async () => {
  const tools = createHogWatchToolData(mockHogWatchRepository);
  const [coach, player, trend, comparison] = await Promise.all([
    tools.getCoachReport('roberts'),
    tools.getPlayerReport('kj-jackson'),
    tools.getMetricTrend('pressure-generated'),
    tools.compareGames('north-alabama', 'utah'),
  ]);

  assert.equal(coach?.coach.name, 'Ron Roberts');
  assert.equal(player?.player.name, 'KJ Jackson');
  assert.deepEqual(trend?.values, [31, 37]);
  assert.equal(comparison?.metricComparisons.length, 8);
});
