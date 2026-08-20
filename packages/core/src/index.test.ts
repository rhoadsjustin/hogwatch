import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateGamePrediction,
  calculateHogIndex,
  calculateOpponentAdjustedMetric,
  calculateRollingAverage,
  HOG_INDEX_WEIGHTS,
  isMetricId,
  METRIC_METADATA,
} from './index.ts';

test('HOG Index retains the documented 30/30/25/15 component weights', () => {
  assert.deepEqual(HOG_INDEX_WEIGHTS, {
    offense: 0.3,
    defense: 0.3,
    coaching: 0.25,
    development: 0.15,
  });
  assert.equal(Object.values(HOG_INDEX_WEIGHTS).reduce((sum, weight) => sum + weight, 0), 1);
});

test('calculateHogIndex applies each component weight and rounds the total', () => {
  const hogIndex = calculateHogIndex({
    offense: 83,
    defense: 71,
    coaching: 88,
    development: 64,
  });

  assert.deepEqual(hogIndex, {
    offense: 83,
    defense: 71,
    coaching: 88,
    development: 64,
    total: 78,
  });
});

test('a perfect score produces a 100-point HOG Index', () => {
  assert.equal(
    calculateHogIndex({ offense: 100, defense: 100, coaching: 100, development: 100 }).total,
    100,
  );
});

test('pregame prediction keeps camp, form, comparison, and location inputs transparent', () => {
  const home = calculateGamePrediction({
    currentHogIndex: 71,
    campReadiness: 77,
    opponentComparisonRating: 62,
    location: 'home',
    matchupAdjustment: 1,
  });
  const road = calculateGamePrediction({
    currentHogIndex: 71,
    campReadiness: 77,
    opponentComparisonRating: 62,
    location: 'away',
    matchupAdjustment: 1,
  });

  assert.deepEqual(home, {
    winProbability: 86,
    projectedArkansasScore: 34,
    projectedOpponentScore: 19,
    projectedMargin: 14.3,
    confidence: 'early',
  });
  assert.equal(home.projectedMargin - road.projectedMargin, 5);
  assert.ok(home.winProbability > road.winProbability);
});

test('canonical metric metadata includes every documented advanced input', () => {
  assert.equal(isMetricId('four-man-pressure'), true);
  assert.equal(isMetricId('turnover-worthy-play-rate'), true);
  assert.equal(isMetricId('not-a-hogwatch-metric'), false);
  assert.equal(METRIC_METADATA['yards-before-contact'].valueKind, 'yards');
  assert.equal(METRIC_METADATA['pre-snap-penalty-rate'].goodDirection, 'down');
});

test('opponent adjustment preserves units and gives credit for a difficult baseline', () => {
  const adjusted = calculateOpponentAdjustedMetric(29, {
    opponentAverage: 37,
    leagueAverage: 32,
    sampleSize: 8,
  });

  assert.deepEqual(adjusted, {
    rawValue: 29,
    adjustment: -5,
    adjustedValue: 24,
    baseline: { opponentAverage: 37, leagueAverage: 32, sampleSize: 8 },
  });
});

test('rolling averages use the available early-season games and validate their window', () => {
  assert.deepEqual(calculateRollingAverage([44, 46, 52, 48], 3), [44, 45, 47.333, 48.667]);
  assert.throws(() => calculateRollingAverage([1], 0), /positive integer/);
});
