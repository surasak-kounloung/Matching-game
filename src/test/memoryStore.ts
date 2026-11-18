import type { KeyValueStore } from '../settings/settingsStore';

/** A store that lives in memory, standing in for the browser's localStorage in tests. */
export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
    dump: () => Object.fromEntries(items),
  };
}

/** A store whose every call throws, like a browser that blocks site data. */
export function brokenStore(): KeyValueStore {
  const refuse = (): never => {
    throw new Error('storage is blocked');
  };
  return { getItem: refuse, setItem: refuse, removeItem: refuse };
}
