import type { GameConfig } from '../config/gameConfig';

/** Returns a number in [0, 1). */
export type Rng = () => number;

export function buildDeckValues(config: GameConfig): string[] {
  const values: string[] = Array<string>(config.targetPairs * 2).fill(config.targetValue);
  for (const decoy of config.decoyValues) {
    for (let i = 0; i < config.decoyPairsEach * 2; i++) values.push(decoy);
  }
  return values;
}

/** Fisher–Yates from the end; returns a copy. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

const sameLayout = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export function createDeck(
  config: GameConfig,
  rng: Rng = Math.random,
  avoid?: readonly string[],
): string[] {
  const base = buildDeckValues(config);
  let deck = shuffle(base, rng);
  while (avoid && sameLayout(deck, avoid)) deck = shuffle(base, rng);
  return deck;
}
