import { MissedBatches } from './missed-batches';

describe('MissedBatches', () => {
  /** Returns the count after the counter takes each id in order. */
  function countAfter(counter: MissedBatches, ...ids: number[]): number {
    for (const id of ids) counter.add(id);
    return counter.count;
  }

  it('gives 0 for the ids 0, 1, and 2', () => {
    expect(countAfter(new MissedBatches(), 0, 1, 2)).toBe(0);
  });

  it('gives 0 for a first id of 5', () => {
    expect(countAfter(new MissedBatches(), 5)).toBe(0);
  });

  it('gives 2 for the ids 5, 6, and 9', () => {
    expect(countAfter(new MissedBatches(), 5, 6, 9)).toBe(2);
  });

  it('gives 5 for the ids 5, 9, and 12', () => {
    expect(countAfter(new MissedBatches(), 5, 9, 12)).toBe(5);
  });

  it('gives 0 for the ids 5 and 5', () => {
    expect(countAfter(new MissedBatches(), 5, 5)).toBe(0);
  });

  it('gives 0 after a reset and keeps the last id', () => {
    const counter = new MissedBatches();
    countAfter(counter, 5, 9);
    counter.reset();
    expect(counter.count).toBe(0);
    expect(counter.add(10)).toBe(0);
    expect(counter.add(12)).toBe(1);
  });

  it('gives 0 for the ids 5, 9, and 3, and counts from the new id', () => {
    const counter = new MissedBatches();
    expect(countAfter(counter, 5, 9, 3)).toBe(0);
    expect(counter.add(4)).toBe(0);
    expect(counter.add(6)).toBe(1);
  });
});
