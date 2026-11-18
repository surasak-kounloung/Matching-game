import { useEffect, useRef } from 'react';
import { TITLE_HOTSPOT } from '../layout';

/** How long the title must be held before the settings open. */
export const HOLD_MS = 3_000;

/**
 * An invisible area over the title. Holding it for HOLD_MS opens the settings; lifting the
 * finger, sliding off or a cancelled touch stops the wait. Nothing on screen hints at it.
 */
export function SettingsHotspot({ onOpen }: { onOpen: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  return (
    <div
      className="settings-hotspot"
      data-testid="settings-hotspot"
      aria-hidden="true"
      style={TITLE_HOTSPOT}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        stop();
        timer.current = setTimeout(() => {
          timer.current = null;
          onOpen();
        }, HOLD_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    />
  );
}
