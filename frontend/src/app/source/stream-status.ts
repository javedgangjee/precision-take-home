import { Injectable, signal } from '@angular/core';

/** The state of the source in use. The test source has its own state, so a reviewer cannot mistake it for the server. */
export type StreamState = 'connecting' | 'live' | 'reconnecting' | 'paused' | 'test';

/** The settings of the source in use. */
export interface StreamSettings {
  samplesPerSecond: number;
  batchIntervalMs: number;
  /** The values run from 0 to maxValue - 1. */
  maxValue: number;
}

/** Holds the stream state, the settings, and the missed batch count. The source in use writes them, and the panel reads them. */
@Injectable({ providedIn: 'root' })
export class StreamStatus {
  private readonly stateSignal = signal<StreamState>('connecting');
  private readonly settingsSignal = signal<StreamSettings | null>(null);
  private readonly missedBatchesSignal = signal<number | null>(null);

  readonly state = this.stateSignal.asReadonly();
  /** The value is null until the source has its settings. */
  readonly settings = this.settingsSignal.asReadonly();
  /** The value is null when the source has no batch ids, as with the test source. */
  readonly missedBatches = this.missedBatchesSignal.asReadonly();

  set(state: StreamState): void {
    this.stateSignal.set(state);
  }

  setSettings(settings: StreamSettings): void {
    this.settingsSignal.set(settings);
  }

  setMissedBatches(count: number): void {
    this.missedBatchesSignal.set(count);
  }
}
