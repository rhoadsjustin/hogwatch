import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateHogIndex, HOG_INDEX_WEIGHTS } from './index.ts';

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
