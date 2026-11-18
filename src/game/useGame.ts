import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { gameConfig } from '../config/gameConfig';
import type { GameConfig } from '../config/gameConfig';
import { createDeck } from './deck';
import type { Rng } from './deck';
import { gameReducer, initialState } from './gameReducer';
import type { GameEvent, GameState, Phase } from './types';
import { countdownLabel, faceOf, prizeFlags, secondsLeft } from './view';
import type { CardView } from './view';

export const TICK_MS = 50;

/** Everything on screen that changes with the clock alone, as one value to compare. */
function clockDriven(state: GameState, at: number, config: GameConfig): string {
  return `${secondsLeft(state, at, config)}|${countdownLabel(state, at, config) ?? ''}`;
}

export interface GameDeps {
  now: () => number;
  rng: Rng;
}

export interface GameView {
  phase: Phase;
  cards: readonly CardView[];
  pairs: number;
  secondsLeft: number;
  /** '3', '2', '1' or 'เริ่ม!' while the countdown before a round runs; otherwise null. */
  countdown: string | null;
  prize1: boolean;
  prize2: boolean;
  start: () => void;
  flip: (cardId: number) => void;
  restart: () => void;
}

export function useGame(config: GameConfig = gameConfig, deps: Partial<GameDeps> = {}): GameView {
  // deps are read once, on the first render
  const depsRef = useRef<GameDeps | null>(null);
  if (depsRef.current === null) {
    depsRef.current = { now: deps.now ?? (() => performance.now()), rng: deps.rng ?? Math.random };
  }
  const { now, rng } = depsRef.current;

  const [state, dispatch] = useReducer(
    (s: GameState, e: GameEvent) => gameReducer(s, e, config),
    undefined,
    () => initialState(createDeck(config, rng)),
  );
  // Only used to re-render when the displayed second or countdown label changes; both are
  // derived at render time. During the countdown the game state itself does not change.
  const [, setShown] = useState(() => clockDriven(state, now(), config));

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const running = state.phase === 'countdown' || state.phase === 'playing';
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const at = now();
      dispatch({ type: 'tick', at });
      setShown(clockDriven(stateRef.current, at, config));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, now, config]);

  const start = useCallback(() => dispatch({ type: 'start', at: now() }), [now]);
  const flip = useCallback((cardId: number) => dispatch({ type: 'flip', at: now(), cardId }), [now]);
  const restart = useCallback(() => {
    const current = stateRef.current.cards.map((c) => c.value);
    dispatch({ type: 'restart', at: now(), deck: createDeck(config, rng, current) });
  }, [now, rng, config]);

  const cards = useMemo(
    () => state.cards.map((c): CardView => ({ id: c.id, value: c.value, face: faceOf(state, c) })),
    [state],
  );

  return {
    phase: state.phase,
    cards,
    pairs: state.pairs,
    secondsLeft: secondsLeft(state, now(), config),
    countdown: countdownLabel(state, now(), config),
    ...prizeFlags(state, config),
    start,
    flip,
    restart,
  };
}
