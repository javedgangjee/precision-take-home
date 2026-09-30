import { cellRect, labelledIndices, labelStep } from './grid-layout';

describe('labelStep', () => {
  it('is 1 up to N = 16, 2 up to N = 32, and 4 up to N = 64', () => {
    expect(labelStep(1)).toBe(1);
    expect(labelStep(16)).toBe(1);
    expect(labelStep(17)).toBe(2);
    expect(labelStep(32)).toBe(2);
    expect(labelStep(33)).toBe(4);
    expect(labelStep(64)).toBe(4);
  });
});

describe('labelledIndices', () => {
  it('labels rows 0, 2, and so on to 30 for N = 32', () => {
    const rows = labelledIndices(32);
    expect(rows.length).toBe(16);
    expect(rows[0]).toBe(0);
    expect(rows[1]).toBe(2);
    expect(rows[15]).toBe(30);
  });
});

describe('cellRect', () => {
  it('puts cell <0,0> at the bottom left and cell <3,3> at the top right for N = 4', () => {
    const first = cellRect(0, 0, 4, 400);
    expect(first.x).toBe(0);
    expect(first.y + first.height).toBe(400);
    const last = cellRect(3, 3, 4, 400);
    expect(last.x + last.width).toBe(400);
    expect(last.y).toBe(0);
  });

  it('keeps the cell widths within 1 px of each other for N = 7', () => {
    const widths = Array.from({ length: 7 }, (_, col) => cellRect(0, col, 7, 400).width);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
  });
});
