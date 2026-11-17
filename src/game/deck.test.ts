import { describe, expect, it } from 'vitest';
import { testConfig as cfg } from '../test/testConfig';
import { mulberry32 } from '../test/clock';
import { buildDeckValues, createDeck, shuffle } from './deck';

const count = (xs: readonly string[], v: string) => xs.filter((x) => x === v).length;

describe('buildDeckValues', () => {
  it('has 42 cards: fourteen 48s and four of each decoy', () => {
    const d = buildDeckValues(cfg);
    expect(d).toHaveLength(42);
    expect(count(d, '48')).toBe(14);
    for (const v of ['84', '88', '44', '80', '40', '41', '81']) expect(count(d, v)).toBe(4);
  });
  it('lists the 48s first, then each decoy in config order', () => {
    const d = buildDeckValues(cfg);
    expect(d.slice(0, 14)).toEqual(Array(14).fill('48'));
    expect(d.slice(14, 22)).toEqual(['84', '84', '84', '84', '88', '88', '88', '88']);
  });
});

describe('shuffle', () => {
  it('is Fisher–Yates walking from the end: j = floor(rng() * (i + 1))', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
    expect(shuffle([1, 2, 3, 4], () => 0.999999)).toEqual([1, 2, 3, 4]);
  });
  it('does not mutate its input and keeps the same items', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffle(input, mulberry32(3));
    expect(input).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...out].sort()).toEqual(input);
  });
  it('gives every ordering a near-equal chance', () => {
    const rng = mulberry32(48);
    const seen = new Map<string, number>();
    for (let i = 0; i < 6000; i++) {
      const key = shuffle([0, 1, 2], rng).join('');
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    expect(seen.size).toBe(6);
    for (const n of seen.values()) expect(n).toBeGreaterThan(800), expect(n).toBeLessThan(1200);
  });
});

describe('createDeck', () => {
  it('returns a shuffled deck with the same cards as buildDeckValues', () => {
    const d = createDeck(cfg, mulberry32(1));
    expect([...d].sort()).toEqual([...buildDeckValues(cfg)].sort());
    expect(d).not.toEqual(buildDeckValues(cfg));
  });
  it('never returns the layout it was told to avoid', () => {
    const first = createDeck(cfg, mulberry32(9));
    const second = createDeck(cfg, mulberry32(9), first); // seed เดิม: การสุ่มครั้งแรกจะได้ first อีก
    expect(second).not.toEqual(first);
    expect([...second].sort()).toEqual([...first].sort());
  });
});
