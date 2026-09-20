// Node 22+ exposes an experimental native `globalThis.localStorage` / `sessionStorage`
// that throws on every call unless the process is started with `--localstorage-file`.
// Vitest's jsdom environment only installs jsdom's own (working) Storage
// implementation for keys that are *not already present* on the Node global object;
// since Node pre-registers `localStorage`/`sessionStorage` before jsdom ever runs,
// jsdom's copy is skipped and the broken native stub wins. The result: every
// `setItem` silently no-ops (caught by the app's own try/catch as "private mode"),
// so a `write...(); expect(read...()).toBe(...)` round trip fails even though the
// application code is correct. This reproduces on a clean checkout with zero other
// changes, purely as a function of the Node version running the tests.
//
// Install a minimal, spec-compliant in-memory Storage so behavior is deterministic
// regardless of which global happened to be installed first.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installWorkingStorage(name: 'localStorage' | 'sessionStorage'): void {
  const current = (globalThis as Record<string, unknown>)[name] as Storage | undefined;
  try {
    current?.setItem('__storage_probe__', '1');
    if (current?.getItem('__storage_probe__') === '1') {
      current.removeItem('__storage_probe__');
      return; // already working (e.g. real jsdom Storage) — leave it alone
    }
  } catch {
    /* broken — fall through to replace it */
  }
  Object.defineProperty(globalThis, name, {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

if (typeof globalThis !== 'undefined') {
  installWorkingStorage('localStorage');
  installWorkingStorage('sessionStorage');
}

import '@testing-library/jest-dom';
