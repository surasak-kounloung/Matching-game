import { gameConfig } from './config/gameConfig';
import { useGame, type GameDeps } from './game/useGame';
import { ActionButton } from './ui/ActionButton';
import { Board } from './ui/Board';
import { Counter } from './ui/Counter';
import { PrizeBoxes } from './ui/PrizeBoxes';
import { ResultPopup } from './ui/ResultPopup';
import { Stage } from './ui/Stage';
import { Timer } from './ui/Timer';
import './ui/card.css';
import './ui/hud.css';
import './ui/popup.css';

export function App({ deps }: { deps?: Partial<GameDeps> }) {
  const game = useGame(gameConfig, deps);
  const ready = game.phase === 'ready';
  return (
    <Stage>
      <PrizeBoxes prize1={game.prize1} prize2={game.prize2} />
      <Counter pairs={game.pairs} total={gameConfig.targetPairs} />
      <Timer seconds={game.secondsLeft} expired={game.phase === 'timeUp'} />
      <ActionButton mode={ready ? 'start' : 'restart'} onPress={ready ? game.start : game.restart} />
      <Board cards={game.cards} disabled={game.phase !== 'playing'} concealed={ready} onFlip={game.flip} />
      {(game.phase === 'timeUp' || game.phase === 'won') && (
        <ResultPopup variant={game.phase} pairs={game.pairs} onRestart={game.restart} />
      )}
    </Stage>
  );
}
