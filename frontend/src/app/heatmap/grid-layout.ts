/** A box in device pixels, measured from the top left of the grid area. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Returns the axis label step, so a large grid labels every 2nd or 4th row and column. */
export function labelStep(n: number): number {
  if (n <= 16) return 1;
  if (n <= 32) return 2;
  return 4;
}

/** Returns the row or column numbers that get a label. */
export function labelledIndices(n: number): number[] {
  const step = labelStep(n);
  const indices: number[] = [];
  for (let i = 0; i < n; i += step) indices.push(i);
  return indices;
}

/**
 * Returns the box of a cell in a square grid area of the given size. Row 0 is at
 * the bottom, and column 0 is at the left. The cells have a gap between them,
 * and the edges are rounded to whole pixels, so cell sizes differ by at most 1.
 */
export function cellRect(row: number, col: number, n: number, size: number, gap = 1): Rect {
  const pitch = (size + gap) / n;
  const edge = (i: number) => Math.round(i * pitch);
  const x = edge(col);
  const width = edge(col + 1) - gap - x;
  const bottom = edge(row);
  const height = edge(row + 1) - gap - bottom;
  return { x, y: size - bottom - height, width, height };
}
