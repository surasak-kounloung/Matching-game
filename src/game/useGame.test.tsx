import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameConfig as cfg } from '../config/gameConfig';
import { createTestClock, mulberry32 } from '../test/clock';
import { useGame } from './useGame';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = (seed = 1) => {
  const clock = createTestClock();
  const hook = renderHook(() => useGame(cfg, { now: clock.now, rng: mulberry32(seed) }));
  const view = () => hook.result.current;
  const ids = (value: string) => view().cards.filter((c) => c.value === value).map((c) => c.id);
  const tap = (id: number) => act(() => view().flip(id));
  return { clock, hook, view, ids, tap };
};

describe('useGame', () => {
  it('starts ready with a shuffled, face-down board', () => {
    const { view } = setup();
    expect(view()).toMatchObject({ phase: 'ready', pairs: 0, secondsLeft: 20, prize1: false, prize2: false });
    expect(view().cards).toHaveLength(42);
    expect(view().cards.every((c) => c.face === 'down')).toBe(true);
    expect(view().cards.slice(0, 14).some((c) => c.value !== '48')).toBe(true);
  });
  it('counts down once started', () => {
    const { view, clock } = setup();
    act(() => view().start());
    clock.advance(1_000);
    expect(view()).toMatchObject({ phase: 'playing', secondsLeft: 19 });
  });
  it('matches a pair of 48s and flips a missed pair back after 500 ms', () => {
    const { view, clock, ids, tap } = setup();
    act(() => view().start());
    const [a, b, c] = ids('48');
    const [d] = ids('84');
    tap(a!), tap(b!);
    expect(view().pairs).toBe(1);
    tap(c!), tap(d!);
    expect(view().cards[c!]?.face).toBe('up');
    clock.advance(500);
    expect(view().cards[c!]?.face).toBe('down');
    expect(view().cards[d!]?.face).toBe('down');
  });
  it('ends the round at 20 seconds and reveals every card', () => {
    const { view, clock } = setup();
    act(() => view().start());
    clock.advance(20_000);
    expect(view()).toMatchObject({ phase: 'timeUp', secondsLeft: 0 });
    expect(view().cards.every((c) => c.face === 'up')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('late tick: after a long stall the round is over and the time shown is 0, not negative', () => {
    const { view, clock } = setup();
    act(() => view().start());
    clock.stall(60_000);
    expect(view()).toMatchObject({ phase: 'timeUp', secondsLeft: 0 });
  });
  it('restart gives a different layout and a face-down board', () => {
    const { view, clock } = setup();
    const before = view().cards.map((c) => c.value);
    act(() => view().start());
    clock.advance(21_000);
    act(() => view().restart());
    expect(view()).toMatchObject({ phase: 'ready', pairs: 0, secondsLeft: 20 });
    expect(view().cards.map((c) => c.value)).not.toEqual(before);
    expect(view().cards.every((c) => c.face === 'down')).toBe(true);
  });
  it('keeps the same action functions between renders and stops its timer on unmount', () => {
    const { view, hook } = setup();
    const { start, flip, restart } = view();
    act(() => view().start());
    expect(view().start).toBe(start);
    expect(view().flip).toBe(flip);
    expect(view().restart).toBe(restart);
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
