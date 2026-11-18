import { useCallback, useMemo, useState } from 'react';
import type { GameConfig } from '../config/gameConfig';
import { settingsOf, type Settings } from './settings';
import { browserStore, loadPin, loadSettings, savePin, saveSettings, storeWorks, type KeyValueStore } from './settingsStore';

export interface SettingsControl {
  /** The build's config with this machine's values laid over it. The same object until they change. */
  config: GameConfig;
  /** The values in use now. */
  settings: Settings;
  /** The values of the build, which "คืนค่าเริ่มต้น" goes back to. */
  defaults: Settings;
  /** The PIN that opens the settings, or null when none has been set on this machine. */
  pin: string | null;
  /** False when the browser will not keep values after the game closes. */
  persistent: boolean;
  saveSettings: (next: Settings) => void;
  savePin: (pin: string) => void;
}

/**
 * The values booth staff changed on this machine. They live in React state, so they apply
 * at once and keep working even when the browser refuses to store anything; the store is
 * only where they are kept for the next time the game opens.
 *
 * `storage` is for tests. Left out, the browser's localStorage is used.
 */
export function useSettings(base: GameConfig, storage?: KeyValueStore | null): SettingsControl {
  const [store] = useState(() => (storage === undefined ? browserStore() : storage));
  const [persistent] = useState(() => storeWorks(store));
  const defaults = useMemo(() => settingsOf(base), [base]);
  const [settings, setSettings] = useState(() => loadSettings(store, defaults));
  const [pin, setPin] = useState(() => loadPin(store));
  const config = useMemo(() => ({ ...base, ...settings }), [base, settings]);

  const keepSettings = useCallback(
    (next: Settings) => {
      setSettings(next);
      saveSettings(store, next, defaults);
    },
    [store, defaults],
  );
  const keepPin = useCallback(
    (next: string) => {
      setPin(next);
      savePin(store, next);
    },
    [store],
  );

  return { config, settings, defaults, pin, persistent, saveSettings: keepSettings, savePin: keepPin };
}
