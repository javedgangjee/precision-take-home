import { Injectable, signal } from '@angular/core';
import { EXPECTED_FPS, FrameRateMeter } from './frame-rate';
import { GridCounts } from './grid-counts';

export const MIN_N = 1;
export const MAX_N = 100;
export const DEFAULT_N = 32;
/** The panel readouts update at most this often, so text updates do not cost a frame. */
const READOUT_INTERVAL_MS = 150;

/**
 * Owns the heat map state. It is the only code that changes N, the counts, the
 * frame rate meter, the dirty flag, and the readout signals.
 */
@Injectable({ providedIn: 'root' })
export class HeatMapStore {
  readonly counts = new GridCounts(DEFAULT_N);

  private readonly nSignal = signal(DEFAULT_N);
  private readonly samplesSignal = signal(0);
  private readonly maxSignal = signal(0);
  private readonly fpsSignal = signal(0);
  private readonly fpsWarningSignal = signal<string | null>(null);

  readonly n = this.nSignal.asReadonly();
  readonly samples = this.samplesSignal.asReadonly();
  readonly max = this.maxSignal.asReadonly();
  readonly fps = this.fpsSignal.asReadonly();
  /** Holds the red error line text when the frame rate is below the expected rate. */
  readonly fpsWarning = this.fpsWarningSignal.asReadonly();

  private readonly meter = new FrameRateMeter();
  private dirty = true;
  private lastReadout = Number.NEGATIVE_INFINITY;

  /** Sets N in the range 1 to 64 and resets the counts when N changes. */
  setN(n: number): void {
    const next = Math.max(MIN_N, Math.min(MAX_N, Math.round(n)));
    if (next === this.counts.n) return;
    this.counts.reset(next);
    this.nSignal.set(next);
    this.samplesSignal.set(0);
    this.maxSignal.set(0);
    this.dirty = true;
  }

  /** Adds a batch of values to the counts. */
  applyBatch(values: readonly number[]): void {
    this.counts.apply(values);
    this.dirty = true;
  }

  /** Marks the grid for a redraw, for example when the canvas changes size. */
  markDirty(): void {
    this.dirty = true;
  }

  /** Runs once per display frame. Returns true when the grid needs a redraw. */
  frame(now: number): boolean {
    this.meter.tick(now);
    if (now - this.lastReadout >= READOUT_INTERVAL_MS) {
      this.lastReadout = now;
      this.updateReadouts();
    }
    const redraw = this.dirty;
    this.dirty = false;
    return redraw;
  }

  private updateReadouts(): void {
    const { counts, meter } = this;
    this.samplesSignal.set(counts.total);
    this.maxSignal.set(counts.max);
    this.fpsSignal.set(meter.reading);
    this.fpsWarningSignal.set(meter.below ? `Below the expected ${EXPECTED_FPS} fps` : null);
  }
}
