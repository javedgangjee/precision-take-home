import { colorAt, colorPosition, scaleLabels } from './color-map';

function channels(color: string): number[] {
  const match = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(color);
  if (!match) throw new Error(`not an rgb color: ${color}`);
  return match.slice(1).map(Number);
}

function expectColorNear(color: string, expected: number[]): void {
  channels(color).forEach((value, i) =>
    expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(1),
  );
}

describe('colorPosition', () => {
  it('is null for a count of 0, so the cell has no color', () => {
    expect(colorPosition(0, 10)).toBeNull();
  });

  it('runs from 0 at a count of 1 to 1 at the max', () => {
    expect(colorPosition(1, 10)).toBe(0);
    expect(colorPosition(10, 10)).toBe(1);
    expect(colorPosition(5, 10)).toBeCloseTo(4 / 9, 12);
  });

  it('is 0 when the max is 1, so a lone hit gets the blue end', () => {
    expect(colorPosition(1, 1)).toBe(0);
  });
});

describe('colorAt', () => {
  it('sweeps from blue through cyan, green, and yellow to red', () => {
    expectColorNear(colorAt(0), [30, 0, 255]);
    expectColorNear(colorAt(1 / 3), [0, 255, 173]);
    expectColorNear(colorAt(2 / 3), [194, 255, 0]);
    expectColorNear(colorAt(1), [255, 0, 51]);
  });

  it('gives green to cell (b) of the brief picture at 4/9', () => {
    expectColorNear(colorAt(4 / 9), [0, 255, 51]);
  });
});

describe('scaleLabels', () => {
  it('has no labels at a max of 0 and one label at a max of 1', () => {
    expect(scaleLabels(0)).toEqual([]);
    expect(scaleLabels(1)).toEqual(['1']);
  });

  it('shows the max, the midpoint, and 1', () => {
    expect(scaleLabels(2)).toEqual(['2', '1.5', '1']);
    expect(scaleLabels(3)).toEqual(['3', '2', '1']);
  });

  it('matches the 1 to 10 scale of the brief picture at its ends', () => {
    expect(scaleLabels(10)).toEqual(['10', '5.5', '1']);
  });

  it('groups digits with commas', () => {
    expect(scaleLabels(1025)).toEqual(['1,025', '513', '1']);
  });
});
