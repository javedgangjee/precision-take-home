/** The settings of the test source in the browser. */
export interface TestSourceSettings {
  /** Samples per second. */
  rate: number;
  /** Batch interval in ms. */
  interval: number;
  /** The values run from 0 to max - 1. */
  max: number;
}

/** The defaults match the server. */
export const DEFAULT_TEST_SOURCE_SETTINGS: TestSourceSettings = {
  rate: 100_000,
  interval: 50,
  max: 1024,
};

/** The interval and the max value have the server ranges. The rate goes past the server limit for stress tests. */
const RANGES: Record<keyof TestSourceSettings, [number, number]> = {
  rate: [1, 100_000_000],
  interval: [50, 1000],
  max: [1, 10_000],
};

/**
 * Reads `rate`, `interval`, and `max` from a URL query such as `?rate=1000000`.
 * A value that is not a whole number in range falls back to its default, and
 * the console gets a warning that names the setting.
 */
export function readTestSourceSettings(query: string): TestSourceSettings {
  const params = new URLSearchParams(query);
  const settings = { ...DEFAULT_TEST_SOURCE_SETTINGS };
  for (const name of Object.keys(RANGES) as (keyof TestSourceSettings)[]) {
    const raw = params.get(name);
    if (raw === null) continue;
    const value = Number(raw);
    const [min, max] = RANGES[name];
    if (raw.trim() !== '' && Number.isInteger(value) && value >= min && value <= max) {
      settings[name] = value;
    } else {
      console.warn(
        `Test source: \`${name}\` must be a whole number from ${min} to ${max}, but it is "${raw}". ` +
          `Using the default ${settings[name]}.`,
      );
    }
  }
  return settings;
}
