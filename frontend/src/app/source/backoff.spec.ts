import { reconnectDelay } from './backoff';

describe('reconnectDelay', () => {
  it('doubles from 1,000 ms up to 30,000 ms with a random value of 1', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((attempt) => reconnectDelay(attempt, 1))).toEqual([
      1000, 2000, 4000, 8000, 16_000, 30_000, 30_000,
    ]);
  });

  it('halves the delay with a random value of 0', () => {
    expect(reconnectDelay(0, 0)).toBe(500);
    expect(reconnectDelay(6, 0)).toBe(15_000);
  });

  it('gives 3,000 ms for attempt 2 with a random value of 0.5', () => {
    expect(reconnectDelay(2, 0.5)).toBe(3000);
  });
});
