import 'fake-indexeddb/auto'

// Minimal Web Storage for the demo backend tests (Node has none).
class MemoryStorage {
  private m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  clear() {
    this.m.clear()
  }
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v))
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
}
for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!(name in globalThis) || !globalThis[name]) Object.defineProperty(globalThis, name, { value: new MemoryStorage(), configurable: true })
}
