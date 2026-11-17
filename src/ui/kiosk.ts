const ZOOM_KEYS = new Set(['+', '=', '-', '0']);
/** Key positions, for layouts such as Thai where the zoom keys type other characters. */
const ZOOM_CODES = new Set(['Minus', 'Equal', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0']);

/** Block accidental page zoom, context menu and dragging on the kiosk. Returns a remover. */
export function installKioskGuards(doc: Document = document): () => void {
  const block = (e: Event) => e.preventDefault();
  const onWheel = (e: Event) => {
    if ((e as Partial<WheelEvent>).ctrlKey) e.preventDefault();
  };
  const onTouchMove = (e: Event) => {
    const touches = (e as Partial<TouchEvent>).touches;
    if (touches && touches.length > 1) e.preventDefault();
  };
  const onKeyDown = (e: Event) => {
    const { ctrlKey, key, code } = e as Partial<KeyboardEvent>;
    if (!ctrlKey) return;
    if ((key !== undefined && ZOOM_KEYS.has(key)) || (code !== undefined && ZOOM_CODES.has(code))) e.preventDefault();
  };
  const passiveOff = { passive: false } as const;

  doc.addEventListener('contextmenu', block);
  doc.addEventListener('dragstart', block);
  doc.addEventListener('wheel', onWheel, passiveOff);
  doc.addEventListener('touchmove', onTouchMove, passiveOff);
  doc.addEventListener('keydown', onKeyDown);

  return () => {
    doc.removeEventListener('contextmenu', block);
    doc.removeEventListener('dragstart', block);
    doc.removeEventListener('wheel', onWheel);
    doc.removeEventListener('touchmove', onTouchMove);
    doc.removeEventListener('keydown', onKeyDown);
  };
}

/** Request a screen wake lock, and again whenever the page becomes visible. Returns a canceller. */
export function keepScreenAwake(doc: Document = document, nav: Navigator = navigator): () => void {
  const warn = (error: unknown) => console.warn('wake lock failed', error);
  const request = () => {
    try {
      nav.wakeLock?.request('screen')?.catch(warn);
    } catch (error) {
      warn(error);
    }
  };
  const onVisible = () => {
    if (doc.visibilityState === 'visible') request();
  };

  request();
  doc.addEventListener('visibilitychange', onVisible);
  return () => doc.removeEventListener('visibilitychange', onVisible);
}
