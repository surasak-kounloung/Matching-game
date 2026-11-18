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
    case 'countdown':
      return toSeconds(config.timeLimitMs);
    case 'playing':
      return state.deadline === null ? 0 : toSeconds(state.deadline - now);
    case 'timeUp':
      return 0;
    case 'won':
      return state.deadline === null || state.endedAt === null ? 0 : toSeconds(state.deadline - state.endedAt);
  }
}

/**
 * What the countdown screen shows: '3', '2', '1' for one second each, then 'เริ่ม!' for the
 * last startCueMs before play begins. Null when no countdown is running.
 */
export function countdownLabel(state: GameState, now: number, config: GameConfig = gameConfig): string | null {
  if (state.phase !== 'countdown' || state.startsAt === null) return null;
  const untilCue = state.startsAt - now - config.startCueMs;
  if (untilCue <= 0) return 'เริ่ม!';
  const most = Math.max(1, Math.ceil(config.countdownMs / 1000));
  return String(Math.min(most, Math.max(1, Math.ceil(untilCue / 1000))));
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
