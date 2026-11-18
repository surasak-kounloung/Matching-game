import { useCallback, useState } from 'react';
import { gameConfig, type GameConfig } from './config/gameConfig';
import { useGame, type GameDeps } from './game/useGame';
import type { KeyValueStore } from './settings/settingsStore';
import { useSettings } from './settings/useSettings';
import { ActionButton } from './ui/ActionButton';
import { AdminOverlay } from './ui/admin/AdminOverlay';
import { SettingsHotspot } from './ui/admin/SettingsHotspot';
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
import './ui/admin/admin.css';

interface AppProps {
  /**
   * The build's values, which the booth machine's own settings are laid over.
   * Must be a stable module constant, never an object created during render.
   */
  config?: GameConfig;
  deps?: Partial<GameDeps>;
  /** Where the machine's settings and PIN are kept. For tests; left out, the browser's localStorage. */
  storage?: KeyValueStore | null;
}

const ignore = () => {};

export function App({ config: base = gameConfig, deps, storage }: AppProps) {
  const machine = useSettings(base, storage);
  const config = machine.config;
  const game = useGame(config, deps);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const ready = game.phase === 'ready';
  // Before play begins (ready, and the countdown after it) no card may show its face or turn.
  const beforePlay = ready || game.phase === 'countdown';
  // The settings open only from the ready screen, and nothing under them may start a round.
  const barPress = settingsOpen ? ignore : ready ? game.start : game.restart;
  return (
    <Stage>
      <PrizeBoxes prize1={game.prize1} prize2={game.prize2} />
      <Counter pairs={game.pairs} total={config.targetPairs} />
      <Timer seconds={game.secondsLeft} expired={game.phase === 'timeUp'} />
      <ActionButton mode={ready ? 'start' : 'restart'} onPress={barPress} />
      <Board cards={game.cards} disabled={game.phase !== 'playing'} concealed={beforePlay} onFlip={game.flip} />
      {(game.phase === 'timeUp' || game.phase === 'won') && (
        <ResultPopup variant={game.phase} pairs={game.pairs} onRestart={game.restart} />
      )}
      {game.countdown !== null && <StartCountdown label={game.countdown} />}
      {ready && !settingsOpen && <SettingsHotspot onOpen={openSettings} />}
      {settingsOpen && (
        <AdminOverlay
          pin={machine.pin}
          settings={machine.settings}
          defaults={machine.defaults}
          persistent={machine.persistent}
          onSavePin={machine.savePin}
          onSaveSettings={machine.saveSettings}
          onClose={closeSettings}
        />
      )}
    </Stage>
  );
}
