import { GridCounts } from './grid-counts';

describe('GridCounts', () => {
  it('starts with 16 cells at 0, a max of 0, and a total of 0 for N = 4', () => {
    const counts = new GridCounts(4);
    expect(counts.n).toBe(4);
    expect(counts.cells.length).toBe(16);
    expect(Array.from(counts.cells).every((c) => c === 0)).toBe(true);
    expect(counts.max).toBe(0);
    expect(counts.total).toBe(0);
  });

  it('keeps a running count after apply([17, 8, 17]) for N = 4', () => {
    const counts = new GridCounts(4);
    counts.apply([17, 8, 17]);
    expect(counts.at(0, 0)).toBe(2);
    expect(counts.at(1, 3)).toBe(1);
    expect(counts.max).toBe(2);
    expect(counts.total).toBe(3);
  });

  it('makes 64 zero cells with a max and a total of 0 after reset(8)', () => {
    const counts = new GridCounts(4);
    counts.apply([17, 8, 17]);
    counts.reset(8);
    expect(counts.n).toBe(8);
    expect(counts.cells.length).toBe(64);
    expect(Array.from(counts.cells).every((c) => c === 0)).toBe(true);
    expect(counts.max).toBe(0);
    expect(counts.total).toBe(0);
  });

  it('does not wrap at 32 bits', () => {
    const counts = new GridCounts(4);
    counts.cells[0] = 4_294_967_296;
    counts.apply([1]);
    expect(counts.at(0, 0)).toBe(4_294_967_297);
    expect(counts.max).toBe(4_294_967_297);
  });
});
