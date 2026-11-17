import { describe, expect, it } from 'vitest';
import { testConfig as cfg } from '../test/testConfig';
import { buildDeckValues } from './deck';
import { gameReducer, initialState } from './gameReducer';
import type { GameEvent, GameState } from './types';

// สำรับไม่สุ่ม: id 0–13 คือ '48', 14–17 คือ '84', 18–21 คือ '88'
const deck = buildDeckValues(cfg);
const T0 = 1_000;
const DEADLINE = T0 + 20_000;

const run = (events: GameEvent[], from: GameState = initialState(deck)) =>
  events.reduce((s, e) => gameReducer(s, e, cfg), from);
const start: GameEvent = { type: 'start', at: T0 };
const flip = (cardId: number, at = T0 + 100): GameEvent => ({ type: 'flip', at, cardId });
const tick = (at: number): GameEvent => ({ type: 'tick', at });
const restart = (at: number): GameEvent => ({ type: 'restart', at, deck: [...deck].reverse() });
const sevenPairs = (at = T0 + 100) => Array.from({ length: 14 }, (_, id) => flip(id, at));
const ignored = (state: GameState, e: GameEvent) => expect(gameReducer(state, e, cfg)).toBe(state);

describe('initial state and start', () => {
  it('1. starts ready with 42 face-down cards', () => {
    const s = initialState(deck);
    expect(s).toMatchObject({ phase: 'ready', open: [], pairs: 0, deadline: null, mismatchUntil: null, endedAt: null, readySince: null });
    expect(s.cards).toHaveLength(42);
    expect(s.cards[0]).toEqual({ id: 0, value: '48', matched: false });
    expect(s.cards[14]).toEqual({ id: 14, value: '84', matched: false });
  });
  it('2. start begins a 20 second round, and a second start is ignored', () => {
    const s = run([start]);
    expect(s).toMatchObject({ phase: 'playing', deadline: DEADLINE });
    ignored(s, { type: 'start', at: T0 + 50 });
  });
  it('3. flips are ignored before the round starts', () => ignored(initialState(deck), flip(0)));
});

describe('flipping and matching', () => {
  it('4. the first flip opens the card', () => expect(run([start, flip(0)]).open).toEqual([0]));
  it('5. flipping the same card again is ignored', () => ignored(run([start, flip(0)]), flip(0)));
  it('6. two 48s match, stay matched and count one pair', () => {
    const s = run([start, flip(0), flip(1)]);
    expect(s).toMatchObject({ open: [], pairs: 1, mismatchUntil: null, phase: 'playing' });
    expect(s.cards[0]?.matched).toBe(true);
    expect(s.cards[1]?.matched).toBe(true);
  });
  it('7. a 48 with a decoy is a miss that flips back after 500 ms', () => {
    const s = run([start, flip(0), flip(14)]);
    expect(s).toMatchObject({ open: [0, 14], pairs: 0, mismatchUntil: T0 + 600 });
  });
  it('8. two identical decoys are also a miss', () => {
    const s = run([start, flip(14), flip(15)]);
    expect(s).toMatchObject({ open: [14, 15], pairs: 0, mismatchUntil: T0 + 600 });
    expect(s.cards[14]?.matched).toBe(false);
  });
  it('9. flips are ignored while a miss is waiting to flip back', () =>
    ignored(run([start, flip(0), flip(14)]), flip(2, T0 + 599)));
  it('10. a tick at the flip-back time closes the missed pair', () =>
    expect(run([start, flip(0), flip(14), tick(T0 + 600)])).toMatchObject({ open: [], mismatchUntil: null }));
  it('11. a flip that arrives after the flip-back time closes the pair, then opens', () =>
    expect(run([start, flip(0), flip(14), flip(2, T0 + 600)])).toMatchObject({ open: [2], mismatchUntil: null }));
  it('12. a matched card cannot be flipped', () => ignored(run([start, flip(0), flip(1)]), flip(0, T0 + 200)));
  it('13. the seventh pair wins and records when', () => {
    const s = run([start, ...sevenPairs(T0 + 7_500)]);
    expect(s).toMatchObject({ phase: 'won', pairs: 7, endedAt: T0 + 7_500, open: [] });
  });
});

describe('time', () => {
  it('14. a tick at the deadline ends the round', () => {
    const s = run([start, flip(0), flip(1), flip(2), tick(DEADLINE)]);
    expect(s).toMatchObject({ phase: 'timeUp', endedAt: DEADLINE, pairs: 1, open: [], mismatchUntil: null });
  });
  it('15. a flip at or after the deadline ends the round instead of opening a card', () => {
    const s = run([start, flip(0), flip(1, DEADLINE)]);
    expect(s).toMatchObject({ phase: 'timeUp', endedAt: DEADLINE, pairs: 0 });
    expect(s.cards[1]?.matched).toBe(false);
  });
  it('16. a very late tick still ends the round at the deadline', () =>
    expect(run([start, tick(DEADLINE + 60_000)])).toMatchObject({ phase: 'timeUp', endedAt: DEADLINE }));
  it('27. a flip one millisecond before the deadline is still accepted', () =>
    expect(run([start, flip(0, DEADLINE - 1)]).open).toEqual([0]));
  it('23. a tick with nothing to do returns the same state object', () => {
    ignored(run([start]), tick(T0 + 50));
    ignored(run([start, flip(0), flip(14)]), tick(T0 + 599));
    ignored(initialState(deck), tick(T0));
    ignored(run([start, tick(DEADLINE)]), tick(DEADLINE + 5));
    ignored(run([start, ...sevenPairs()]), tick(DEADLINE + 5));
  });
});

describe('restart', () => {
  it('17. restart mid-round returns to ready with the new deck', () => {
    const s = run([start, flip(0), flip(1), restart(T0 + 3_000)]);
    expect(s).toEqual(initialState([...deck].reverse(), T0 + 3_000));
  });
  it('18. restart is ignored for 1000 ms after time runs out', () => {
    const ended = run([start, tick(DEADLINE)]);
    ignored(ended, restart(DEADLINE + 999));
    expect(gameReducer(ended, restart(DEADLINE + 1_000), cfg).phase).toBe('ready');
  });
  it('19. restart is ignored for 1000 ms after a win', () => {
    const won = run([start, ...sevenPairs(T0 + 7_500)]);
    ignored(won, restart(T0 + 8_499));
    expect(gameReducer(won, restart(T0 + 8_500), cfg).phase).toBe('ready');
  });
  it('20. start is ignored for 500 ms after a restart, so a double tap cannot start the next round', () => {
    const ready = run([start, restart(T0 + 3_000)]);
    ignored(ready, { type: 'start', at: T0 + 3_499 });
    expect(gameReducer(ready, { type: 'start', at: T0 + 3_500 }, cfg)).toMatchObject({ phase: 'playing', deadline: T0 + 23_500 });
  });
  it('21. restart does nothing while already ready', () => ignored(initialState(deck), restart(T0)));
  it('25. a restart that arrives after the deadline, before any tick, is held by the 1000 ms lock', () => {
    const late = run([start, flip(0), flip(1), restart(DEADLINE + 10)]);
    expect(late).toMatchObject({ phase: 'timeUp', endedAt: DEADLINE, pairs: 1 });
    expect(run([start, restart(DEADLINE + 999)]).phase).toBe('timeUp');
    expect(run([start, restart(DEADLINE + 1_000)]).phase).toBe('ready');
  });
  it('28. restart is ignored for 500 ms after a round starts, so a double tap on start cannot cancel it', () => {
    ignored(run([start]), restart(T0 + 499));
    expect(run([start, restart(T0 + 500)]).phase).toBe('ready');
  });
});

describe('robustness', () => {
  it('22. three simultaneous touches: the third is ignored after a miss, or starts a new pair after a match', () => {
    expect(run([start, flip(0), flip(14), flip(1)]).open).toEqual([0, 14]);
    expect(run([start, flip(0), flip(1), flip(2)])).toMatchObject({ pairs: 1, open: [2] });
  });
  it('26. a flip for a card that does not exist is ignored', () => ignored(run([start]), flip(99)));
  it('24. never mutates the state it is given', () => {
    const freeze = (s: GameState): GameState =>
      Object.freeze({ ...s, cards: Object.freeze(s.cards.map((c) => Object.freeze({ ...c }))), open: Object.freeze([...s.open]) });
    let s = freeze(initialState(deck));
    for (const e of [start, flip(0), flip(14), tick(T0 + 600), flip(0, T0 + 700), flip(1, T0 + 700), tick(DEADLINE)]) {
      s = freeze(gameReducer(s, e, cfg));
    }
    expect(s.phase).toBe('timeUp');
  });
});
