import { gameConfig, type GameConfig } from './config/gameConfig';
import { useGame, type GameDeps } from './game/useGame';
import { ActionButton } from './ui/ActionButton';
import { Board } from './ui/Board';
import { Counter } from './ui/Counter';
import { PrizeBoxes } from './ui/PrizeBoxes';
import { ResultPopup } from './ui/ResultPopup';
import { Stage } from './ui/Stage';
import { StartCountdown } from './ui/StartCountdown';
import { Timer } from './ui/Timer';
import './ui/card.css';
import './ui/countdown.css';
import './ui/hud.css';
import './ui/popup.css';

interface AppProps {
  /** Must be a stable module constant, never an object created during render. */
  config?: GameConfig;
  deps?: Partial<GameDeps>;
}

export function App({ config = gameConfig, deps }: AppProps) {
  const game = useGame(config, deps);
  const ready = game.phase === 'ready';
  // Before play begins (ready, and the countdown after it) no card may show its face or turn.
  const beforePlay = ready || game.phase === 'countdown';
  return (
    <Stage>
      <PrizeBoxes prize1={game.prize1} prize2={game.prize2} />
      <Counter pairs={game.pairs} total={config.targetPairs} />
      <Timer seconds={game.secondsLeft} expired={game.phase === 'timeUp'} />
      <ActionButton mode={ready ? 'start' : 'restart'} onPress={ready ? game.start : game.restart} />
      <Board cards={game.cards} disabled={game.phase !== 'playing'} concealed={beforePlay} onFlip={game.flip} />
      {(game.phase === 'timeUp' || game.phase === 'won') && (
        <ResultPopup variant={game.phase} pairs={game.pairs} onRestart={game.restart} />
      )}
      {game.countdown !== null && <StartCountdown label={game.countdown} />}
    </Stage>
  );
}
