import { isPin, readSettings, sameSettings, type Settings } from './settings';

/** The part of the browser's Storage this module uses; tests hand in one that lives in memory. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SETTINGS_KEY = 'vsq-matching-game:settings';
export const PIN_KEY = 'vsq-matching-game:pin';
const PROBE_KEY = 'vsq-matching-game:probe';

/*
 * Every call into a store is guarded. A browser may refuse storage outright (site data
 * blocked), and a refusal must never stop the game: reading then gives the defaults and
 * writing does nothing. storeWorks() tells the settings screen so it can warn staff.
 */

/** This page's localStorage, or null when the browser will not hand it over. */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Whether values written to the store can be expected to stay. */
export function storeWorks(store: KeyValueStore | null): boolean {
  if (store === null) return false;
  try {
    store.setItem(PROBE_KEY, '1');
    store.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

function read(store: KeyValueStore | null, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(store: KeyValueStore | null, key: string, value: string | null): void {
  try {
    if (value === null) store?.removeItem(key);
    else store?.setItem(key, value);
  } catch {
    // the values still apply until the page closes; see storeWorks()
  }
}

export function loadSettings(store: KeyValueStore | null, defaults: Settings): Settings {
  const text = read(store, SETTINGS_KEY);
  if (text === null) return { ...defaults };
  try {
    return readSettings(JSON.parse(text), defaults);
  } catch {
    return { ...defaults };
  }
}

/** Keeps the values, or forgets them when they equal the build's defaults. */
export function saveSettings(store: KeyValueStore | null, settings: Settings, defaults: Settings): void {
  const same = sameSettings(settings, defaults);
  // through readSettings, so only the four known fields, each inside its range, are ever written
  write(store, SETTINGS_KEY, same ? null : JSON.stringify(readSettings(settings, defaults)));
}

export function loadPin(store: KeyValueStore | null): string | null {
  const text = read(store, PIN_KEY);
  return isPin(text) ? text : null;
}

export function savePin(store: KeyValueStore | null, pin: string): void {
  write(store, PIN_KEY, pin);
}
