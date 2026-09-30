/** The hue of the blue end, #1E00FF. */
const START_HUE = 247;
/** The hue span from the blue end down through cyan, green, and yellow to the red end, #FF0033 at 348°. */
const HUE_SPAN = 259;
const TABLE_SIZE = 256;

const labelFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** Converts a hue at full saturation and full brightness to an rgb() string. */
function hueToRgb(hue: number): string {
  const h = (((hue % 360) + 360) % 360) / 60;
  const channel = (offset: number) => {
    const k = (offset + h) % 6;
    return Math.round(255 * (1 - Math.max(0, Math.min(1, k, 4 - k))));
  };
  return `rgb(${channel(5)},${channel(3)},${channel(1)})`;
}

/** Holds the 256 colors from the blue end to the red end in equal steps of hue. */
export const COLOR_TABLE: readonly string[] = Array.from({ length: TABLE_SIZE }, (_, i) =>
  hueToRgb(START_HUE - (HUE_SPAN * i) / (TABLE_SIZE - 1)),
);

/**
 * Returns where a count sits on the color scale, from 0 at a count of 1 to 1 at
 * the max count. A count of 0 has no color, so it returns null.
 */
export function colorPosition(count: number, max: number): number | null {
  if (count === 0) return null;
  if (max <= 1) return 0;
  return (count - 1) / (max - 1);
}

/** Returns the table color for a position from 0 to 1. */
export function colorAt(position: number): string {
  return COLOR_TABLE[Math.round(position * (TABLE_SIZE - 1))];
}

/** Returns the scale labels from the top of the bar to the bottom. */
export function scaleLabels(max: number): string[] {
  if (max < 1) return [];
  if (max === 1) return ['1'];
  return [labelFormat.format(max), labelFormat.format((max + 1) / 2), '1'];
}
