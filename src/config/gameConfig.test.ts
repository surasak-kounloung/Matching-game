import { expect, it } from 'vitest';
import { gameConfig as c } from './gameConfig';

// Only the values drawn into the artwork are pinned. The tunable ones (time, delays,
// decoys) are checked by rule, so tuning them keeps every suite green.

it('keeps the values tied to the artwork', () => {
  expect(c).toMatchObject({
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

it('has exactly 7 distinct two-character decoys, none equal to the target', () => {
  expect(c.decoyValues).toHaveLength(7);
  expect(new Set(c.decoyValues).size).toBe(7);
  for (const v of c.decoyValues) {
    expect(v).toHaveLength(2);
    expect(v).not.toBe(c.targetValue);
  }
});

it('lasts a whole number of seconds from 1 to 99, which the two-digit timer can show', () => {
  expect(Number.isInteger(c.timeLimitMs / 1_000)).toBe(true);
  expect(c.timeLimitMs).toBeGreaterThanOrEqual(1_000);
  expect(c.timeLimitMs).toBeLessThanOrEqual(99_000);
});

it('has delays that are not negative and shorter than the round', () => {
  for (const ms of [c.mismatchMs, c.restartLockMs, c.startLockMs]) {
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(ms).toBeLessThan(c.timeLimitMs);
  }
});
