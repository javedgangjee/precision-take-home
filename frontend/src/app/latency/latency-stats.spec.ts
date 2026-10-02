import { latencyStats } from './latency-stats';

describe('latencyStats', () => {
  it('gives 50, 95, 99, and 100 for the numbers 1 to 100', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(latencyStats(values)).toEqual({ p50: 50, p95: 95, p99: 99, max: 100 });
  });

  it('gives 5 for all four values for the one number 5', () => {
    expect(latencyStats([5])).toEqual({ p50: 5, p95: 5, p99: 5, max: 5 });
  });

  it('gives 20, 40, 40, and 40 for the numbers 30, 10, 20, and 40', () => {
    expect(latencyStats([30, 10, 20, 40])).toEqual({ p50: 20, p95: 40, p99: 40, max: 40 });
  });

  it('gives no value for an empty list', () => {
    expect(latencyStats([])).toEqual({ p50: null, p95: null, p99: null, max: null });
  });
});
