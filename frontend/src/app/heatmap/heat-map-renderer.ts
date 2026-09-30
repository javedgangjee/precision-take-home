import { colorAt, colorPosition } from './color-map';
import { GridCounts } from './grid-counts';
import { cellRect, labelledIndices } from './grid-layout';

/** The space in CSS pixels to the left of the grid and below it for the axis labels. */
export const LABEL_MARGIN = { left: 28, bottom: 20 };

/** The colors match --border-strong, --surface-card, and --ink-secondary in styles.scss. */
const GAP_COLOR = '#D2D6DD';
const EMPTY_COLOR = '#FFFFFF';
const LABEL_COLOR = '#3A4150';
const LABEL_FONT_PX = 11;
const LABEL_PAD_PX = 6;

/** Returns the canvas size in device pixels for a grid of the given size. */
export function canvasSize(gridSize: number, pixelRatio = 1): { width: number; height: number } {
  return {
    width: gridSize + Math.round(LABEL_MARGIN.left * pixelRatio),
    height: gridSize + Math.round(LABEL_MARGIN.bottom * pixelRatio),
  };
}

/**
 * Draws the heat map on a 2D canvas context. The grid sits at the top right of
 * the canvas, with the row labels to its left and the column labels below it.
 * Row 0 is at the bottom.
 */
export class HeatMapRenderer {
  /** Draws the cells and the axis labels. The size is the grid side in device pixels. */
  draw(ctx: CanvasRenderingContext2D, counts: GridCounts, size: number, pixelRatio = 1): void {
    const { n, max } = counts;
    const left = Math.round(LABEL_MARGIN.left * pixelRatio);
    const gap = Math.max(1, Math.round(pixelRatio));
    const { width, height } = canvasSize(size, pixelRatio);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = GAP_COLOR;
    ctx.fillRect(left, 0, size, size);
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const position = colorPosition(counts.cells[row * n + col], max);
        const r = cellRect(row, col, n, size, gap);
        ctx.fillStyle = position === null ? EMPTY_COLOR : colorAt(position);
        ctx.fillRect(left + r.x, r.y, r.width, r.height);
      }
    }

    const pad = LABEL_PAD_PX * pixelRatio;
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = `${LABEL_FONT_PX * pixelRatio}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const row of labelledIndices(n)) {
      const r = cellRect(row, 0, n, size, gap);
      ctx.fillText(String(row), left - pad, r.y + r.height / 2);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const col of labelledIndices(n)) {
      const r = cellRect(0, col, n, size, gap);
      ctx.fillText(String(col), left + r.x + r.width / 2, size + pad);
    }
  }
}
