/**
 * Percentage normalization (spec §19).
 *
 * The three composition buckets — Grade A / URS / Rejected — MUST always sum to
 * exactly 100% so dashboards, fusion summaries and certificates display a
 * coherent split. We use the largest-remainder method to keep integers exact.
 */
export function normalizePercentages(parts: number[]): number[] {
  const safe = parts.map((p) => (Number.isFinite(p) && p > 0 ? p : 0));
  const total = safe.reduce((a, b) => a + b, 0);

  if (total <= 0) {
    // No composition signal — fall back to a single 100% bucket caller decides.
    return safe.map(() => 0);
  }

  const raw = safe.map((p) => (p / total) * 100);
  const floored = raw.map((r) => Math.floor(r));
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);

  // Hand the leftover units to the largest fractional remainders.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  for (let k = 0; k < order.length && remainder > 0; k += 1) {
    result[order[k].i] += 1;
    remainder -= 1;
  }

  return result;
}

/** Convenience: normalize a grade composition object to a 100% total. */
export function normalizeComposition(input: {
  gradeA: number;
  urs: number;
  rejected: number;
}): { gradeA: number; urs: number; rejected: number } {
  const [gradeA, urs, rejected] = normalizePercentages([
    input.gradeA,
    input.urs,
    input.rejected,
  ]);
  return { gradeA, urs, rejected };
}
