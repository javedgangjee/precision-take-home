/** The spread of a list of times in ms. Each value is null when the list is empty. */
export interface LatencyStats {
  p50: number | null;
  p95: number | null;
  p99: number | null;
  max: number | null;
}

/**
 * Returns the p50, the p95, the p99, and the max by the nearest rank method.
 * The p99 of 100 values is the 99th value in sorted order, so each result is a
 * value from the list.
 */
export function latencyStats(values: readonly number[]): LatencyStats {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (percent: number) =>
    sorted.length === 0 ? null : sorted[Math.ceil((percent * sorted.length) / 100) - 1];
  return { p50: rank(50), p95: rank(95), p99: rank(99), max: rank(100) };
}
