import { gameConfig } from '../config/gameConfig';
import type { GameConfig } from '../config/gameConfig';
import type { GameEvent, GameState } from './types';

export function initialState(deck: readonly string[], readySince: number | null = null): GameState {
  return {
    phase: 'ready',
    cards: deck.map((value, id) => ({ id, value, matched: false })),
    open: [],
    pairs: 0,
    deadline: null,
    mismatchUntil: null,
    endedAt: null,
    readySince,
  };
}

/** Applies the deadline and a pending flip-back. Returns the same object when nothing is due. */
function catchUp(state: GameState, at: number): GameState {
  if (state.phase !== 'playing') return state;
  if (state.deadline !== null && at >= state.deadline) {
    return { ...state, phase: 'timeUp', endedAt: state.deadline, open: [], mismatchUntil: null };
  }
  if (state.mismatchUntil !== null && at >= state.mismatchUntil) {
    return { ...state, open: [], mismatchUntil: null };
  }
  return state;
}

function flipCard(state: GameState, at: number, cardId: number, config: GameConfig): GameState {
  if (state.phase !== 'playing' || state.mismatchUntil !== null) return state;
  const card = state.cards[cardId];
  if (!card || card.matched || state.open.includes(cardId)) return state;

  const first = state.open[0];
  if (first === undefined) return { ...state, open: [cardId] };

  const firstCard = state.cards[first];
  if (firstCard && firstCard.value === config.targetValue && card.value === config.targetValue) {
    const pairs = state.pairs + 1;
    const won = pairs >= config.targetPairs;
    return {
      ...state,
      phase: won ? 'won' : state.phase,
      cards: state.cards.map((c) => (c.id === first || c.id === cardId ? { ...c, matched: true } : c)),
      open: [],
      pairs,
      endedAt: won ? at : state.endedAt,
    };
  }
  return { ...state, open: [first, cardId], mismatchUntil: at + config.mismatchMs };
}

export function gameReducer(
  state: GameState,
  event: GameEvent,
  config: GameConfig = gameConfig,
): GameState {
  switch (event.type) {
    case 'start': {
      if (state.phase !== 'ready') return state;
      if (state.readySince !== null && event.at < state.readySince + config.startLockMs) return state;
      return { ...state, phase: 'playing', deadline: event.at + config.timeLimitMs };
    }
    case 'tick':
      return catchUp(state, event.at);
    case 'flip': {
      const current = catchUp(state, event.at);
      return flipCard(current, event.at, event.cardId, config);
    }
    case 'restart': {
      if (state.phase === 'ready') return state;
      const current = catchUp(state, event.at);
      if (
        (current.phase === 'timeUp' || current.phase === 'won') &&
        current.endedAt !== null &&
        event.at < current.endedAt + config.restartLockMs
      ) {
        return current;
      }
      return initialState(event.deck, event.at);
    }
  }
}
