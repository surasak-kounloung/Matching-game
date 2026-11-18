export interface GameConfig {
  timeLimitMs: number;
  mismatchMs: number;
  restartLockMs: number;
  startLockMs: number;
  countdownMs: number;
  startCueMs: number;
  decoyValues: readonly string[];
  targetValue: string;
  targetPairs: number;
  decoyPairsEach: number;
  smallPrizePairs: number;
  columns: number;
  rows: number;
}

export const gameConfig: GameConfig = {
  // Adjustable values (spec 7.3): safe to tune without touching the design.
  // timeLimitMs, mismatchMs, countdownMs and startCueMs are the starting values only: staff
  // can change them on the booth machine from the settings screen (src/settings/settings.ts
  // has the allowed ranges), and a value saved there is used instead of the one here.
  timeLimitMs: 25_000,
  mismatchMs: 500,
  restartLockMs: 1_000,
  startLockMs: 500,
  // After "เริ่มเกม": the dark screen counts 3, 2, 1 for countdownMs, shows "เริ่ม!" for
  // startCueMs, then the round starts. Set both to 0 to turn the countdown off.
  countdownMs: 3_000,
  startCueMs: 700,
  decoyValues: ['84', '88', '44', '80', '40', '41', '81'],

  // Tied to the design (spec 7.3): changing these requires updating the PSD too.
  targetValue: '48',
  targetPairs: 7,
  decoyPairsEach: 2,
  smallPrizePairs: 4,
  columns: 7,
  rows: 6,
};
