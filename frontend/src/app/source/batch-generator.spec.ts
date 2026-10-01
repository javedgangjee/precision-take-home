import { BatchGenerator } from './batch-generator';
import { DEFAULT_TEST_SOURCE_SETTINGS } from './test-source-settings';

function parse(batch: string | null): number[] {
  if (batch === null) throw new Error('expected a batch');
  return JSON.parse(batch) as number[];
}

describe('BatchGenerator', () => {
  it('V7.1 makes a batch of 250 integers with the default settings', () => {
    const batch = parse(new BatchGenerator(DEFAULT_TEST_SOURCE_SETTINGS).next());
    expect(batch.length).toBe(250);
    expect(batch.every(Number.isInteger)).toBe(true);
  });

  it('gives 19 nulls and one batch of 1 integer in 20 calls at 1 sample per second', () => {
    const generator = new BatchGenerator({ rate: 1, interval: 50, max: 1024 });
    const batches = Array.from({ length: 20 }, () => generator.next());
    expect(batches.filter((b) => b === null).length).toBe(19);
    expect(parse(batches[19]).length).toBe(1);
  });

  it('carries the fraction so 20 calls at 30 samples per second give 30 integers', () => {
    const generator = new BatchGenerator({ rate: 30, interval: 50, max: 1024 });
    let total = 0;
    for (let i = 0; i < 20; i++) {
      const batch = generator.next();
      if (batch !== null) total += parse(batch).length;
    }
    expect(total).toBe(30);
  });

  it('draws every value from 0 to max value - 1', () => {
    const batch = parse(new BatchGenerator({ rate: 100_000, interval: 1000, max: 3 }).next());
    expect(batch.length).toBe(100_000);
    expect(batch.every((v) => v >= 0 && v <= 2)).toBe(true);
    for (const v of [0, 1, 2]) expect(batch).toContain(v);
  });

  it('draws only 0 when the max value is 1', () => {
    const batch = parse(new BatchGenerator({ rate: 1000, interval: 1000, max: 1 }).next());
    expect(batch.every((v) => v === 0)).toBe(true);
  });
});
