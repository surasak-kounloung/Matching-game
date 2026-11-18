import { expect, it } from 'vitest';
import { brokenStore, memoryStore } from '../test/memoryStore';
import type { Settings } from './settings';
import { PIN_KEY, SETTINGS_KEY, loadPin, loadSettings, savePin, saveSettings, storeWorks } from './settingsStore';

const defaults: Settings = { timeLimitMs: 20_000, countdownMs: 3_000, startCueMs: 700, mismatchMs: 500 };
const changed: Settings = { timeLimitMs: 45_000, countdownMs: 0, startCueMs: 0, mismatchMs: 800 };

it('loads the defaults from an empty store', () => {
  expect(loadSettings(memoryStore(), defaults)).toEqual(defaults);
});

it('saves the values and loads them back', () => {
  const store = memoryStore();
  saveSettings(store, changed, defaults);
  expect(JSON.parse(store.dump()[SETTINGS_KEY]!)).toEqual(changed);
  expect(loadSettings(store, defaults)).toEqual(changed);
});

it('saving the defaults removes the stored values, so the machine follows the build again', () => {
  const store = memoryStore();
  saveSettings(store, changed, defaults);
  saveSettings(store, { ...defaults }, defaults);
  expect(store.dump()).toEqual({});
  expect(loadSettings(store, { ...defaults, timeLimitMs: 30_000 })).toEqual({ ...defaults, timeLimitMs: 30_000 });
});

it('damaged stored data loads as the defaults', () => {
  for (const text of ['{', '', 'null', '[1]', '"45"', 'undefined']) {
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: text }), defaults)).toEqual(defaults);
  }
});

it('a bad stored field falls back alone', () => {
  const store = memoryStore({ [SETTINGS_KEY]: JSON.stringify({ ...changed, timeLimitMs: 1e9 }) });
  expect(loadSettings(store, defaults)).toEqual({ ...changed, timeLimitMs: defaults.timeLimitMs });
});

it('a store that throws loads the defaults, and saving to it does not throw', () => {
  const store = brokenStore();
  expect(loadSettings(store, defaults)).toEqual(defaults);
  expect(loadPin(store)).toBeNull();
  expect(() => saveSettings(store, changed, defaults)).not.toThrow();
  expect(() => saveSettings(store, defaults, defaults)).not.toThrow();
  expect(() => savePin(store, '1234')).not.toThrow();
});

it('no store at all behaves the same', () => {
  expect(loadSettings(null, defaults)).toEqual(defaults);
  expect(loadPin(null)).toBeNull();
  expect(() => saveSettings(null, changed, defaults)).not.toThrow();
  expect(() => savePin(null, '1234')).not.toThrow();
});

it('the PIN is stored and read back', () => {
  const store = memoryStore();
  expect(loadPin(store)).toBeNull();
  savePin(store, '0412');
  expect(store.dump()).toEqual({ [PIN_KEY]: '0412' });
  expect(loadPin(store)).toBe('0412');
});

it('a malformed stored PIN reads as no PIN', () => {
  for (const text of ['12', 'abcd', '12345', '']) {
    expect(loadPin(memoryStore({ [PIN_KEY]: text }))).toBeNull();
  }
});

it('storeWorks is true for a working store, false for a broken or missing one, and leaves nothing behind', () => {
  const store = memoryStore({ [PIN_KEY]: '1111' });
  expect(storeWorks(store)).toBe(true);
  expect(store.dump()).toEqual({ [PIN_KEY]: '1111' });
  expect(storeWorks(brokenStore())).toBe(false);
  expect(storeWorks(null)).toBe(false);
});

it('the two keys are named after the game, so they cannot clash with another page on the same host', () => {
  expect(SETTINGS_KEY).toBe('vsq-matching-game:settings');
  expect(PIN_KEY).toBe('vsq-matching-game:pin');
});
