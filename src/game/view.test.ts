import { describe, expect, it } from 'vitest';
import { gameConfig as cfg } from '../config/gameConfig';
import { buildDeckValues } from './deck';
import { gameReducer, initialState } from './gameReducer';
import type { GameEvent } from './types';
import { faceOf, formatSeconds, prizeFlags, secondsLeft } from './view';

const deck = buildDeckValues(cfg);
const T0 = 1_000;
const run = (events: GameEvent[]) => events.reduce((s, e) => gameReducer(s, e, cfg), initialState(deck));
const start: GameEvent = { type: 'start', at: T0 };
const flip = (cardId: number, at = T0 + 100): GameEvent => ({ type: 'flip', at, cardId });
const pairs = (n: number, at = T0 + 100) => Array.from({ length: n * 2 }, (_, id) => flip(id, at));

describe('faceOf', () => {
  it('shows open, matched and face-down cards during play', () => {
    const s = run([start, flip(0), flip(1), flip(2)]);
    expect(faceOf(s, s.cards[0]!)).toBe('matched');
    expect(faceOf(s, s.cards[2]!)).toBe('up');
    expect(faceOf(s, s.cards[3]!)).toBe('down');
  });
  it('reveals every card when the round is over', () => {
    const over = run([start, flip(0), flip(1), { type: 'tick', at: T0 + 20_000 }]);
    expect(faceOf(over, over.cards[0]!)).toBe('matched');
    expect(faceOf(over, over.cards[20]!)).toBe('up');
    const won = run([start, ...pairs(7)]);
    expect(faceOf(won, won.cards[20]!)).toBe('up');
  });
});

describe('secondsLeft', () => {
  it('is the full time before the round starts', () => expect(secondsLeft(initialState(deck), 123, cfg)).toBe(20));
  it('rounds up, so 20 shows for the whole first second and 0 exactly at the deadline', () => {
    const s = run([start]);
    expect(secondsLeft(s, T0, cfg)).toBe(20);
    expect(secondsLeft(s, T0 + 1, cfg)).toBe(20);
    expect(secondsLeft(s, T0 + 1_000, cfg)).toBe(19);
    expect(secondsLeft(s, T0 + 19_001, cfg)).toBe(1);
    expect(secondsLeft(s, T0 + 20_000, cfg)).toBe(0);
  });
  it('never goes below zero', () => expect(secondsLeft(run([start]), T0 + 90_000, cfg)).toBe(0));
  it('is zero after time runs out and frozen after a win', () => {
    expect(secondsLeft(run([start, { type: 'tick', at: T0 + 20_000 }]), T0 + 30_000, cfg)).toBe(0);
    expect(secondsLeft(run([start, ...pairs(7, T0 + 7_500)]), T0 + 30_000, cfg)).toBe(13);
  });
});

it('formatSeconds pads to two digits', () => {
  expect([0, 5, 20].map(formatSeconds)).toEqual(['00', '05', '20']);
});

it('prizeFlags unlock at 4 and 7 pairs', () => {
  expect(prizeFlags(run([start, ...pairs(3)]), cfg)).toEqual({ prize1: false, prize2: false });
  expect(prizeFlags(run([start, ...pairs(4)]), cfg)).toEqual({ prize1: true, prize2: false });
  expect(prizeFlags(run([start, ...pairs(7)]), cfg)).toEqual({ prize1: true, prize2: true });
});
