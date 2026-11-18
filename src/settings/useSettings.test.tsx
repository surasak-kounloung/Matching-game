import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { brokenStore, memoryStore } from '../test/memoryStore';
import { testConfig } from '../test/testConfig';
import { PIN_KEY, SETTINGS_KEY } from './settingsStore';
import { useSettings } from './useSettings';

const defaults = { timeLimitMs: 20_000, countdownMs: 0, startCueMs: 0, mismatchMs: 500 };

it('starts from the build values when the machine has kept nothing', () => {
  const { result } = renderHook(() => useSettings(testConfig, memoryStore()));
  expect(result.current.config).toEqual(testConfig);
  expect(result.current.settings).toEqual(defaults);
  expect(result.current.defaults).toEqual(defaults);
  expect(result.current.pin).toBeNull();
  expect(result.current.persistent).toBe(true);
});

it('lays the kept values over the build values and leaves the rest of the config alone', () => {
  const store = memoryStore({ [SETTINGS_KEY]: JSON.stringify({ ...defaults, timeLimitMs: 40_000 }), [PIN_KEY]: '9090' });
  const { result } = renderHook(() => useSettings(testConfig, store));
  expect(result.current.config).toEqual({ ...testConfig, timeLimitMs: 40_000 });
  expect(result.current.defaults).toEqual(defaults);
  expect(result.current.pin).toBe('9090');
});

it('hands out the same config object until the values change', () => {
  const { result, rerender } = renderHook(() => useSettings(testConfig, memoryStore()));
  const first = result.current;
  rerender();
  expect(result.current.config).toBe(first.config);
  expect(result.current.saveSettings).toBe(first.saveSettings);
  expect(result.current.savePin).toBe(first.savePin);
  act(() => first.saveSettings({ ...defaults, mismatchMs: 900 }));
  expect(result.current.config).not.toBe(first.config);
  expect(result.current.config.mismatchMs).toBe(900);
  expect(result.current.saveSettings).toBe(first.saveSettings);
});

it('keeps saved values and the PIN on the machine', () => {
  const store = memoryStore();
  const { result } = renderHook(() => useSettings(testConfig, store));
  act(() => result.current.saveSettings({ ...defaults, countdownMs: 5_000 }));
  act(() => result.current.savePin('2580'));
  expect(result.current.pin).toBe('2580');
  expect(JSON.parse(store.dump()[SETTINGS_KEY]!)).toEqual({ ...defaults, countdownMs: 5_000 });
  expect(store.dump()[PIN_KEY]).toBe('2580');
  // a second game opened on the same machine sees them
  const again = renderHook(() => useSettings(testConfig, store));
  expect(again.result.current.config.countdownMs).toBe(5_000);
  expect(again.result.current.pin).toBe('2580');
});

it('saving the build values again forgets the kept ones', () => {
  const store = memoryStore({ [SETTINGS_KEY]: JSON.stringify({ ...defaults, timeLimitMs: 40_000 }) });
  const { result } = renderHook(() => useSettings(testConfig, store));
  act(() => result.current.saveSettings(defaults));
  expect(result.current.config).toEqual(testConfig);
  expect(store.dump()).toEqual({});
});

it('works for the session when the machine cannot keep anything, and says so', () => {
  for (const store of [brokenStore(), null]) {
    const { result } = renderHook(() => useSettings(testConfig, store));
    expect(result.current.persistent).toBe(false);
    expect(result.current.config).toEqual(testConfig);
    act(() => result.current.saveSettings({ ...defaults, timeLimitMs: 33_000 }));
    act(() => result.current.savePin('1212'));
    expect(result.current.config.timeLimitMs).toBe(33_000);
    expect(result.current.pin).toBe('1212');
  }
});
