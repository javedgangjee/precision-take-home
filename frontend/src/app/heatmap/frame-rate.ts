/** The reading is below the expected rate when it is under this share of the peak. */
const BELOW_RATIO = 0.9;

/**
 * Counts animation frames. The reading is the frame count of the last full
 * second. The peak is the highest reading so far, which stands for the
 * refresh rate of the display.
 */
export class FrameRateMeter {
  reading = 0;
  peak = 0;
  private windowStart: number | null = null;
  private frames = 0;

  /** Counts one frame at the given time in ms and returns the reading. */
  tick(now: number): number {
    if (this.windowStart === null) {
      this.windowStart = now;
    } else if (now - this.windowStart >= 1000) {
      this.reading = this.frames;
      this.peak = Math.max(this.peak, this.reading);
      this.windowStart = now;
      this.frames = 0;
    }
    this.frames++;
    return this.reading;
  }

  /** Is true when the reading is below 90 percent of the peak. */
  get below(): boolean {
    return this.reading < this.peak * BELOW_RATIO;
  }
}
