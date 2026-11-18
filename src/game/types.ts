export type Phase = 'ready' | 'countdown' | 'playing' | 'timeUp' | 'won';

export interface Card {
  id: number; // 0-41 is the board position, left to right, top to bottom
  value: string;
  matched: boolean;
}

export interface GameState {
  phase: Phase;
  cards: readonly Card[];
  open: readonly number[]; // ids of face-up unmatched cards, 0-2 of them
  pairs: number; // target pairs matched so far
  startsAt: number | null; // when play begins; set only while the countdown is running
  deadline: number | null; // when the round ends, set when play begins
  mismatchUntil: number | null; // when a missed pair flips back
  endedAt: number | null; // when the round really ended (time up = deadline, won = time of last pair)
  readySince: number | null; // when the game returned to ready via restart; null on first load
}

export type GameEvent =
  | { type: 'start'; at: number }
  | { type: 'flip'; at: number; cardId: number }
  | { type: 'tick'; at: number }
  | { type: 'restart'; at: number; deck: readonly string[] };
