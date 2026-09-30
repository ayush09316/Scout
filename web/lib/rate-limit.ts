const WINDOW_MS = 60_000;
const LIMIT = 5;
const store = (globalThis as unknown as { __scoutRl?: Map<string, number[]> }).__scoutRl ?? new Map<string, number[]>();
(globalThis as unknown as { __scoutRl?: Map<string, number[]> }).__scoutRl = store;

function recent(key: string, now: number, windowMs = WINDOW_MS) {
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length) store.set(key, hits);
  else store.delete(key);
  return hits;
}

export function isLimited(key: string, now = Date.now()) {
  return recent(key, now).length >= LIMIT;
}

export function recordFailure(key: string, now = Date.now()) {
  store.set(key, [...recent(key, now), now]);
}

export function clearFailures(key: string) {
  store.delete(key);
}

export function take(key: string, limit: number, windowMs: number, now = Date.now()) {
  const hits = recent(key, now, windowMs);
  if (hits.length >= limit) return false;
  store.set(key, [...hits, now]);
  return true;
}
