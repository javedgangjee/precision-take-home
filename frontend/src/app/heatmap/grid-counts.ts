import { binIndex } from './binning';

/**
 * Holds the running count of hits for each cell of an N by N grid. The counts
 * are 64-bit floats, so they stay exact up to 2^53 and do not wrap at 32 bits.
 */
export class GridCounts {
  n: number;
  cells: Float64Array;
  max = 0;
  total = 0;

  constructor(n: number) {
    this.n = n;
    this.cells = new Float64Array(n * n);
  }

  /** Bins each value and adds 1 to its cell. */
  apply(values: readonly number[]): void {
    const { n, cells } = this;
    let max = this.max;
    for (const v of values) {
      const count = ++cells[binIndex(v, n)];
      if (count > max) max = count;
    }
    this.max = max;
    this.total += values.length;
  }

  /** Returns the count of the cell at the given row and column. */
  at(row: number, col: number): number {
    return this.cells[row * this.n + col];
  }

  /** Replaces the counts with N² zero cells. */
  reset(n: number): void {
    this.n = n;
    this.cells = new Float64Array(n * n);
    this.max = 0;
    this.total = 0;
  }
}
