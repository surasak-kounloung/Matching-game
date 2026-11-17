import { expect, it } from 'vitest';
import { gameConfig as c } from './gameConfig';

it('holds the values agreed in the spec', () => {
  expect(c).toEqual({
    timeLimitMs: 20_000,
    mismatchMs: 500,
    restartLockMs: 1_000,
    startLockMs: 500,
    decoyValues: ['84', '88', '44', '80', '40', '41', '81'],
    targetValue: '48',
    targetPairs: 7,
    decoyPairsEach: 2,
    smallPrizePairs: 4,
    columns: 7,
    rows: 6,
  });
});

it('produces exactly as many cards as the board has cells', () => {
  const cards = c.targetPairs * 2 + c.decoyValues.length * c.decoyPairsEach * 2;
  expect(cards).toBe(c.columns * c.rows);
});
