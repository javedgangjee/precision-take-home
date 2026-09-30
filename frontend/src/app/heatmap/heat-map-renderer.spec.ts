import { GridCounts } from './grid-counts';
import { cellRect } from './grid-layout';
import { HeatMapRenderer, LABEL_MARGIN } from './heat-map-renderer';

/** The example input (e) from the brief picture. */
const BRIEF_EXAMPLE = [4, 11, 6, 6, 11, 11, 11, 6, 11, 6, 6, 11, 11, 11, 11, 11];
const SIZE = 400;

interface Fill {
  style: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Text {
  text: string;
  x: number;
  y: number;
}

/** Records each fill and each text that the renderer draws. */
class FakeContext {
  fillStyle = '';
  font = '';
  textAlign = '';
  textBaseline = '';
  fills: Fill[] = [];
  texts: Text[] = [];

  clearRect(): void {
    this.fills = [];
    this.texts = [];
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.fills.push({ style: this.fillStyle, x, y, width, height });
  }

  fillText(text: string, x: number, y: number): void {
    this.texts.push({ text, x, y });
  }
}

function draw(counts: GridCounts): FakeContext {
  const ctx = new FakeContext();
  new HeatMapRenderer().draw(ctx as unknown as CanvasRenderingContext2D, counts, SIZE);
  return ctx;
}

/** Returns the color of the last fill that covers the cell exactly. */
function cellFill(ctx: FakeContext, row: number, col: number, n: number): string | undefined {
  const r = cellRect(row, col, n, SIZE);
  const fill = [...ctx.fills]
    .reverse()
    .find(
      (f) =>
        f.x === LABEL_MARGIN.left + r.x &&
        f.y === r.y &&
        f.width === r.width &&
        f.height === r.height,
    );
  return fill?.style;
}

describe('HeatMapRenderer', () => {
  it('fills the example input cells from blue to red and the empty cells with white', () => {
    const counts = new GridCounts(4);
    counts.apply(BRIEF_EXAMPLE);
    const ctx = draw(counts);
    expect(cellFill(ctx, 0, 3, 4)).toBe('rgb(30,0,255)');
    expect(cellFill(ctx, 2, 2, 4)).toBe('rgb(255,0,51)');
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (counts.at(row, col) === 0) expect(cellFill(ctx, row, col, 4)).toBe('#FFFFFF');
      }
    }
  });

  it('fills every cell with white when there is no data', () => {
    const ctx = draw(new GridCounts(4));
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        expect(cellFill(ctx, row, col, 4)).toBe('#FFFFFF');
      }
    }
  });

  it('writes row labels on the left and column labels along the bottom for N = 4', () => {
    const ctx = draw(new GridCounts(4));
    const rowLabels = ctx.texts.filter((t) => t.x < LABEL_MARGIN.left).map((t) => t.text);
    const colLabels = ctx.texts.filter((t) => t.y > SIZE).map((t) => t.text);
    expect(rowLabels).toEqual(['0', '1', '2', '3']);
    expect(colLabels).toEqual(['0', '1', '2', '3']);
  });
});
