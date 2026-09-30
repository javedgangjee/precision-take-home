/** A cell in the grid. Row 0 is at the bottom, and column 0 is at the left. */
export interface Cell {
  row: number;
  col: number;
}

/**
 * Returns the flat cell index (v - 1) mod N². The extra N² keeps the result
 * nonnegative when v is 0, so 0 goes to the last cell.
 */
export function binIndex(v: number, n: number): number {
  const cells = n * n;
  return (((v - 1) % cells) + cells) % cells;
}

/** Returns the row and the column of the cell that value v goes to. */
export function cellOf(v: number, n: number): Cell {
  const index = binIndex(v, n);
  return { row: Math.floor(index / n), col: index % n };
}
