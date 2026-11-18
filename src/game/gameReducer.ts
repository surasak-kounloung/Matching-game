import { gameConfig } from '../config/gameConfig';
import type { GameConfig } from '../config/gameConfig';
import type { GameEvent, GameState } from './types';

export function initialState(deck: readonly string[], readySince: number | null = null): GameState {
  return {
    phase: 'ready',
    cards: deck.map((value, id) => ({ id, value, matched: false })),
    open: [],
    pairs: 0,
    startsAt: null,
    deadline: null,
    mismatchUntil: null,
    endedAt: null,
    readySince,
  };
}

/**
 * Applies everything that is due by `at`: the end of the countdown, the deadline and a
 * pending flip-back. Returns the same object when nothing is due.
 */
function catchUp(state: GameState, at: number, config: GameConfig): GameState {
  let current = state;
  if (current.phase === 'countdown') {
    if (current.startsAt === null || at < current.startsAt) return current;
    // The round runs from the moment the countdown was due to end, not from this event,
    // so a late tick neither shortens nor lengthens it.
    current = { ...current, phase: 'playing', deadline: current.startsAt + config.timeLimitMs, startsAt: null };
  }
  if (current.phase !== 'playing') return current;
  if (current.deadline !== null && at >= current.deadline) {
    return { ...current, phase: 'timeUp', endedAt: current.deadline, open: [], mismatchUntil: null };
  }
  if (current.mismatchUntil !== null && at >= current.mismatchUntil) {
    return { ...current, open: [], mismatchUntil: null };
  }
  return current;
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
      const lead = config.countdownMs + config.startCueMs;
      if (lead <= 0) return { ...state, phase: 'playing', deadline: event.at + config.timeLimitMs };
      return { ...state, phase: 'countdown', startsAt: event.at + lead };
    }
    case 'tick':
      return catchUp(state, event.at, config);
    case 'flip': {
      const current = catchUp(state, event.at, config);
      return flipCard(current, event.at, event.cardId, config);
    }
    case 'restart': {
      if (state.phase === 'ready') return state;
      const current = catchUp(state, event.at, config);
      // The dark countdown screen covers every button; nothing cancels a countdown.
      if (current.phase === 'countdown') return current;
      // The second tap of a double tap on start lands on the restart button that replaces it,
      // so restart is ignored for startLockMs after the round started (deadline - timeLimitMs).
      if (
        current.phase === 'playing' &&
        current.deadline !== null &&
        event.at < current.deadline - config.timeLimitMs + config.startLockMs
      ) {
        return current;
      }
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
