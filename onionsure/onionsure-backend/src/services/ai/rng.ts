/**
 * Deterministic pseudo-random helpers for the Mock analyzers.
 *
 * Seeding from the inspection id means the Mock provider returns *stable*
 * results for the same inspection — important for reproducible demos and tests
 * without a real model backend.
 */

/** FNV-1a 32-bit string hash. */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — small, fast, good enough for synthetic data. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a seeded RNG from any string key. */
export function seededRng(key: string): () => number {
  return mulberry32(hashSeed(key));
}
