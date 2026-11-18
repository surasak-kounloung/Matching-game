import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { TITLE_HOTSPOT } from '../layout';

/** How long the title must be held before the settings open. */
export const HOLD_MS = 3_000;

/**
 * An invisible area over the title. One finger held on it for HOLD_MS opens the settings.
 * The wait stops when the finger lifts, leaves the area or is cancelled, and when any other
 * finger touches the screen. Nothing on screen hints at it.
 */
export function SettingsHotspot({ onOpen }: { onOpen: () => void }) {
  /** Ends the hold in progress: clears its timer and stops watching the rest of the screen. */
  const endHold = useRef<(() => void) | null>(null);
  const stop = () => {
    endHold.current?.();
    endHold.current = null;
  };
  useEffect(() => stop, []);

  const press = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    stop();
    const screen = event.currentTarget.ownerDocument;
    const holding = event.pointerId;
    const timer = setTimeout(() => {
      stop();
      onOpen();
    }, HOLD_MS);
    // Two fingers on the glass is not a deliberate hold. A second finger never reaches this
    // element, so the whole screen is watched while the wait runs.
    const anotherPress = (other: PointerEvent) => {
      if (other.pointerId !== holding) stop();
    };
    screen.addEventListener('pointerdown', anotherPress, true);
    endHold.current = () => {
      clearTimeout(timer);
      screen.removeEventListener('pointerdown', anotherPress, true);
    };
  };

  // A touch keeps reporting to the element it started on, so a finger that slides away never
  // sends pointerleave here until it lifts. Its position is checked on every move instead.
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const onTitle =
      event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!onTitle) stop();
  };

  return (
    <div
      className="settings-hotspot"
      data-testid="settings-hotspot"
      aria-hidden="true"
      style={TITLE_HOTSPOT}
      onPointerDown={press}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    />
  );
}
