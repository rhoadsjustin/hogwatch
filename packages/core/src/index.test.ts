import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateGamePrediction,
  calculateHogIndex,
  calculateMatchupEdges,
  calculateOpponentAdjustedMetric,
  calculateRollingAverage,
  HOG_INDEX_WEIGHTS,
  isMetricId,
  METRIC_METADATA,
  metricChartDomain,
  metricPercentile,
  metricValueFromUnitGrade,
  POWER_RATING,
  ratingFromHogIndex,
  scorePrediction,
  standardNormalCdf,
  summarizePredictionRecord,
  teamMetricProfile,
  toHogWatchId,
  type TeamProfile,
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

test('canonical IDs collapse punctuation so every provider resolves the same opponent', () => {
  assert.equal(toHogWatchId('Texas A&M'), 'texas-am');
  assert.equal(toHogWatchId('South Carolina'), 'south-carolina');
  assert.equal(toHogWatchId('LSU'), 'lsu');
  assert.equal(toHogWatchId('North Alabama'), 'north-alabama');
});

test('standardNormalCdf is centred and symmetric', () => {
  assert.ok(Math.abs(standardNormalCdf(0) - 0.5) < 1e-7);
  assert.ok(Math.abs(standardNormalCdf(1) - 0.8413) < 0.0005);
  assert.ok(Math.abs(standardNormalCdf(-1.5) + standardNormalCdf(1.5) - 1) < 1e-6);
});

test('HOG Index grades convert to point-denominated ratings', () => {
  assert.deepEqual(ratingFromHogIndex({ total: 71, offense: 72, defense: 76 }), {
    power: 7.4,
    offense: 7.7,
    defense: 9.1,
  });
  assert.deepEqual(ratingFromHogIndex({ total: 50, offense: 50, defense: 50 }), {
    power: 0,
    offense: 0,
    defense: 0,
  });
});

test('a prediction margin is denominated in points and answers to home field', () => {
  const arkansas = ratingFromHogIndex({ total: 71, offense: 72, defense: 76 });
  const georgia = { power: 14, offense: 10, defense: 8 };
  const home = calculateGamePrediction({ arkansas, opponent: georgia, location: 'home', confidence: 'early' });
  const road = calculateGamePrediction({ arkansas, opponent: georgia, location: 'away', confidence: 'early' });

  assert.equal(home.projectedMargin, -4.1);
  assert.equal(home.projectedMargin - road.projectedMargin, POWER_RATING.homeFieldPoints * 2);
  assert.equal(home.confidence, 'early');
  assert.equal(home.marginStandardDeviation, POWER_RATING.marginStandardDeviation);
});

test('win probability is the same distribution that produces the reported range', () => {
  const arkansas = ratingFromHogIndex({ total: 71, offense: 72, defense: 76 });
  const prediction = calculateGamePrediction({
    arkansas,
    opponent: { power: 14, offense: 10, defense: 8 },
    location: 'home',
    confidence: 'early',
  });

  assert.equal(
    prediction.winProbability,
    Math.round(standardNormalCdf(prediction.projectedMargin / prediction.marginStandardDeviation) * 100),
  );
  assert.ok(prediction.likelyMargin.low < prediction.projectedMargin);
  assert.ok(prediction.likelyMargin.high > prediction.projectedMargin);
  const reportedWidth = prediction.likelyMargin.high - prediction.likelyMargin.low;
  const modelledWidth = 2 * POWER_RATING.likelyRangeZ * POWER_RATING.marginStandardDeviation;
  assert.ok(Math.abs(reportedWidth - modelledWidth) <= 0.1, `range width ${reportedWidth} should match ${modelledWidth}`);
});

test('projected totals move with the matchup instead of summing to a constant', () => {
  const arkansas = ratingFromHogIndex({ total: 71, offense: 72, defense: 76 });
  const shootout = calculateGamePrediction({
    arkansas,
    opponent: { power: 6, offense: 12, defense: -6 },
    location: 'home',
    confidence: 'early',
  });
  const rockFight = calculateGamePrediction({
    arkansas,
    opponent: { power: 6, offense: -6, defense: 12 },
    location: 'home',
    confidence: 'early',
  });

  const shootoutTotal = shootout.projectedArkansasScore + shootout.projectedOpponentScore;
  const rockFightTotal = rockFight.projectedArkansasScore + rockFight.projectedOpponentScore;
  assert.ok(shootoutTotal > rockFightTotal, 'a weak defence should raise the projected total');
  assert.equal(shootout.projectedMargin, rockFight.projectedMargin, 'the same power gap keeps the same margin');
});

test('a finished game scores the prediction that preceded it', () => {
  const outcome = scorePrediction({ winProbability: 40, projectedMargin: -4.1 }, {
    arkansasScore: 24,
    opponentScore: 27,
  });

  assert.deepEqual(outcome, {
    actualMargin: -3,
    marginError: -1.1,
    calledWinnerCorrectly: true,
    brierScore: 0.16,
  });
  assert.equal(
    scorePrediction({ winProbability: 86, projectedMargin: 14 }, { arkansasScore: 10, opponentScore: 31 }).calledWinnerCorrectly,
    false,
  );
});

test('the prediction record summarises calibration against a coin flip', () => {
  const summary = summarizePredictionRecord([
    { gameId: 'a', week: 1, opponent: 'A', winProbability: 90, projectedMargin: 20, actualMargin: 31, calledWinnerCorrectly: true, brierScore: 0.01 },
    { gameId: 'b', week: 2, opponent: 'B', winProbability: 40, projectedMargin: -4, actualMargin: -3, calledWinnerCorrectly: true, brierScore: 0.16 },
  ]);

  assert.equal(summary.gamesScored, 2);
  assert.equal(summary.correctCalls, 2);
  assert.equal(summary.meanAbsoluteMarginError, 6);
  assert.equal(summary.brierScore, 0.085);
  assert.equal(summary.coinFlipBrierScore, 0.25);
  assert.deepEqual(summarizePredictionRecord([]), {
    gamesScored: 0, correctCalls: 0, meanAbsoluteMarginError: 0, brierScore: 0, coinFlipBrierScore: 0.25,
  });
});

test('percentiles read as football, not as raw direction', () => {
  assert.equal(metricPercentile('success-rate', 43), 50);
  assert.ok(metricPercentile('success-rate', 48) > 50);
  // Lower pressure allowed is better, so a low raw number must score high.
  assert.ok(metricPercentile('pressure-allowed', 26) > 50);
  assert.ok(metricPercentile('pressure-allowed', 38) < 50);
  assert.equal(metricPercentile('pressure-allowed', 32), 50);
});

test('chart domains are fixed per metric and stay inside the metric unit', () => {
  const successRate = metricChartDomain('success-rate');
  assert.deepEqual(successRate, { min: 30.5, max: 55.5, reference: 43 });

  const explosives = metricChartDomain('explosives');
  assert.equal(explosives.min, 0.8);
  assert.equal(explosives.reference, 7);

  // A percentage can never exceed 100 even when the distribution is wide.
  assert.ok(metricChartDomain('red-zone-touchdown-rate').max <= 100);
});

test('a unit grade models a metric value in the right direction and stays in units', () => {
  // An average grade lands on the league average, whichever way the metric runs.
  assert.equal(metricValueFromUnitGrade('success-rate', 50), 43);
  assert.equal(metricValueFromUnitGrade('pressure-allowed', 50), 32);
  // A strong grade means more offensive success but *less* pressure allowed.
  assert.ok(metricValueFromUnitGrade('success-rate', 80) > 43);
  assert.ok(metricValueFromUnitGrade('pressure-allowed', 80) < 32);
  // Percentages stay inside 0–100 and counts never go negative.
  assert.ok(metricValueFromUnitGrade('red-zone-touchdown-rate', 100) <= 100);
  assert.ok(metricValueFromUnitGrade('explosives', 0) >= 0);
  // Modelled values must be labelled as such.
  assert.equal(teamMetricProfile({ 'success-rate': 43 }, 'modelled')[0]?.basis, 'modelled');
  assert.equal(teamMetricProfile({ 'success-rate': 43 })[0]?.basis, 'observed');
});

test('matchup edges pair opposing units and call close ones even', () => {
  const arkansas: TeamProfile = {
    teamId: 'arkansas', name: 'Arkansas', shortName: 'ARK',
    rating: { power: 7.4, offense: 7.7, defense: 9.1 },
    metrics: teamMetricProfile({ 'pressure-allowed': 29, 'pressure-generated': 37, 'rush-success': 48, 'success-rate': 46, explosives: 7 }),
  };
  const opponent: TeamProfile = {
    teamId: 'georgia', name: 'Georgia', shortName: 'UGA',
    rating: { power: 14, offense: 10, defense: 8 },
    metrics: teamMetricProfile({ 'pressure-generated': 41, 'pressure-allowed': 24, 'defensive-success-rate': 36, 'explosives-allowed': 5 }),
  };

  const edges = calculateMatchupEdges(arkansas, opponent);
  const protection = edges.find((edge) => edge.id === 'protection');

  assert.ok(protection, 'protection collision should resolve');
  assert.equal(protection.arkansas.metricId, 'pressure-allowed');
  assert.equal(protection.opponent.metricId, 'pressure-generated');
  assert.equal(protection.edge, 'opponent');
  assert.equal(protection.gap, protection.arkansas.percentile - protection.opponent.percentile);
  // Every collision must find both halves or be dropped entirely.
  assert.ok(edges.every((edge) => edge.arkansas && edge.opponent));
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
