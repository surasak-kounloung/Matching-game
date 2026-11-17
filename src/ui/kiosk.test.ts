import { describe, expect, it, vi } from 'vitest';
import { installKioskGuards, keepScreenAwake } from './kiosk';

const fire = (type: string, init: Record<string, unknown> = {}) => {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, init);
  document.dispatchEvent(e);
  return e.defaultPrevented;
};

describe('installKioskGuards', () => {
  it('blocks the context menu, dragging, pinch and keyboard or wheel zoom', () => {
    const remove = installKioskGuards();
    expect(fire('contextmenu')).toBe(true);
    expect(fire('dragstart')).toBe(true);
    expect(fire('wheel', { ctrlKey: true })).toBe(true);
    expect(fire('touchmove', { touches: [{}, {}] })).toBe(true);
    for (const key of ['+', '=', '-', '0']) expect(fire('keydown', { ctrlKey: true, key })).toBe(true);
    remove();
  });
  it('leaves ordinary input alone', () => {
    const remove = installKioskGuards();
    expect(fire('wheel', { ctrlKey: false })).toBe(false);
    expect(fire('touchmove', { touches: [{}] })).toBe(false);
    expect(fire('keydown', { ctrlKey: false, key: '+' })).toBe(false);
    remove();
  });
  it('stops blocking once removed', () => {
    installKioskGuards()();
    expect(fire('contextmenu')).toBe(false);
  });
});

describe('keepScreenAwake', () => {
  const visible = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  it('requests a screen wake lock now and again whenever the page becomes visible', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() });
    const stop = keepScreenAwake(document, { wakeLock: { request } } as unknown as Navigator);
    expect(request).toHaveBeenCalledExactlyOnceWith('screen');
    visible('hidden');
    visible('visible');
    expect(request).toHaveBeenCalledTimes(2);
    stop();
    visible('visible');
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('stays silent when wake lock is unsupported, and logs a warning when the request is refused', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => keepScreenAwake(document, {} as Navigator)()).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
    const error = new Error('denied');
    const request = vi.fn().mockRejectedValue(error);
    const stop = keepScreenAwake(document, { wakeLock: { request } } as unknown as Navigator);
    await Promise.resolve();
    await Promise.resolve();
    expect(request).toHaveBeenCalledExactlyOnceWith('screen');
    expect(warn).toHaveBeenCalledExactlyOnceWith('wake lock failed', error);
    stop();
  });
});
