/** The target frame rate. The client runs in Chrome with Energy Saver off, which allows 60 fps. */
export const EXPECTED_FPS = 60;

/** The reading is below the expected rate when it is under this share of it. */
const BELOW_RATIO = 0.9;

/**
 * Counts animation frames. The reading is the frame rate of the last window
 * of at least 1 s, which is the frame count divided by the real window length.
 * A late frame makes the window longer, so a stall lowers the reading.
 */
export class FrameRateMeter {
  reading = 0;
  private windowStart: number | null = null;
  private frames = 0;
  private windowClosed = false;

  /** Counts one frame at the given time in ms and returns the reading. */
  tick(now: number): number {
    if (this.windowStart === null) {
      this.windowStart = now;
    } else if (now - this.windowStart >= 1000) {
      this.reading = Math.round((this.frames * 1000) / (now - this.windowStart));
      this.windowStart = now;
      this.frames = 0;
      this.windowClosed = true;
    }
    this.frames++;
    return this.reading;
  }

  /** Is true after the first window when the reading is below 90 percent of the expected rate. */
  get below(): boolean {
    return this.windowClosed && this.reading < EXPECTED_FPS * BELOW_RATIO;
  }
}
