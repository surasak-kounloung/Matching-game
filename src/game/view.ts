import { gameConfig } from '../config/gameConfig';
import type { GameConfig } from '../config/gameConfig';
import type { Card, GameState } from './types';

export type Face = 'down' | 'up' | 'matched';
export interface CardView {
  id: number;
  value: string;
  face: Face;
}

export function faceOf(state: GameState, card: Card): Face {
  if (card.matched) return 'matched';
  if (state.open.includes(card.id)) return 'up';
  if (state.phase === 'timeUp' || state.phase === 'won') return 'up';
  return 'down';
}

export function secondsLeft(state: GameState, now: number, config: GameConfig = gameConfig): number {
  const toSeconds = (ms: number) => Math.max(0, Math.ceil(ms / 1000));
  switch (state.phase) {
    case 'ready':
      return toSeconds(config.timeLimitMs);
    case 'playing':
      return state.deadline === null ? 0 : toSeconds(state.deadline - now);
    case 'timeUp':
      return 0;
    case 'won':
      return state.deadline === null || state.endedAt === null ? 0 : toSeconds(state.deadline - state.endedAt);
  }
}

export function formatSeconds(seconds: number): string {
  return String(seconds).padStart(2, '0');
}

export function prizeFlags(
  state: GameState,
  config: GameConfig = gameConfig,
): { prize1: boolean; prize2: boolean } {
  return {
    prize1: state.pairs >= config.smallPrizePairs,
    prize2: state.pairs >= config.targetPairs,
  };
}
