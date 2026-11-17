import type { GameConfig } from '../config/gameConfig';

/**
 * The game settings the rule and component tests are written against, spelled out
 * literally so that tuning src/config/gameConfig.ts never changes what they expect.
 */
export const testConfig: GameConfig = {
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
};
