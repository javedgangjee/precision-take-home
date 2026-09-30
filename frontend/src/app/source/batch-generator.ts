import { TestSourceSettings } from './test-source-settings';

/**
 * Makes batches of uniform random integers from 0 to max - 1, as the server
 * does. When the rate times the interval is not a whole number, the fraction
 * carries to the next call, so a call can have no samples.
 */
export class BatchGenerator {
  /** Samples per batch, in thousandths of a sample, so the carry stays exact. */
  private readonly perBatchMilli: number;
  private carryMilli = 0;

  constructor(
    private readonly settings: TestSourceSettings,
    private readonly random: () => number = Math.random,
  ) {
    this.perBatchMilli = settings.rate * settings.interval;
  }

  /** Returns the next batch as a JSON array string, or null when the call has no samples. */
  next(): string | null {
    const milli = this.carryMilli + this.perBatchMilli;
    const count = Math.floor(milli / 1000);
    this.carryMilli = milli % 1000;
    if (count === 0) return null;
    const { max } = this.settings;
    const values = new Array<number>(count);
    for (let i = 0; i < count; i++) values[i] = Math.floor(this.random() * max);
    return JSON.stringify(values);
  }
}
