import { inject, Injectable } from '@angular/core';
import { ServerTimes } from '../source/batch-id';
import { ClockSync } from './clock-sync';
import { LatencyStats, latencyStats } from './latency-stats';

/** The rows of the report. Each stage runs from one timestamp to the next, and the total runs from `started` to `drawn`. */
export const STAGES = [
  'generate',
  'queue',
  'network',
  'parse',
  'apply',
  'frame wait',
  'draw',
  'total',
] as const;

/** The tracker keeps this many batches, which is 60 s at the default settings. */
export const MAX_BATCHES = 1200;

/** The times of one batch up to the counts. The client times are in ms on the client clock. */
export interface BatchTimes {
  /** The value is null when the batch id held no times. */
  server: ServerTimes | null;
  /** The time when the message handler started. */
  received: number;
  /** The time when the client had the array of integers. */
  parsed: number;
  /** The time when the counts held the batch. */
  applied: number;
}

export interface LatencyReport {
  /** The number of batches in the report. */
  batches: number;
  /** The server clock minus the client clock, in ms. */
  offsetMs: number | null;
  /** The round trip of the clock request, in ms. The error of the offset is at most half of it. */
  roundTripMs: number | null;
  /** One row for each stage and one for the total, in ms. */
  rows: Record<string, LatencyStats>;
}

/** The object that the DevTools console reads as `latency`. */
export interface LatencyConsole {
  report(): LatencyReport;
  reset(): void;
}

declare global {
  interface Window {
    latency?: LatencyConsole;
  }
}

/** A batch with server times that waits for the frame that draws it. */
type WaitingBatch = BatchTimes & { server: ServerTimes };

/**
 * Measures the latency of each batch from generation to render. The server
 * source gives it the times of each batch, and the heat map gives it the times
 * of each frame that draws. A frame draws every batch that arrived since the
 * frame before it, so those batches share the frame times.
 */
@Injectable({ providedIn: 'root' })
export class LatencyTracker {
  private readonly clockSync = inject(ClockSync);
  /** The limit stops a hidden tab, which gets no frames, from growing the memory. */
  private waiting: WaitingBatch[] = [];
  /** Each sample holds one time for each entry of STAGES, in that order. */
  private samples: number[][] = [];

  /** Holds a batch until a frame draws it. A batch with no server times gives no sample. */
  addBatch({ server, received, parsed, applied }: BatchTimes): void {
    if (server === null) return;
    this.waiting.push({ server, received, parsed, applied });
    if (this.waiting.length > MAX_BATCHES) this.waiting.shift();
  }

  /** Takes the two times of a frame that drew the grid, and stores a sample for each waiting batch. */
  addFrame(frame: number, drawn: number): void {
    if (this.waiting.length === 0) return;
    const waiting = this.waiting;
    this.waiting = [];
    const offset = this.clockSync.current?.offset;
    // A batch that finishes before the first offset exists gives no sample.
    if (offset === undefined) return;
    for (const { server, received, parsed, applied } of waiting) {
      // The network stage and the total cross the two clocks, so they need the offset.
      this.samples.push([
        server.encoded - server.started,
        server.sent - server.encoded,
        received + offset - server.sent,
        parsed - received,
        applied - parsed,
        frame - applied,
        drawn - frame,
        drawn + offset - server.started,
      ]);
    }
    if (this.samples.length > MAX_BATCHES) {
      this.samples.splice(0, this.samples.length - MAX_BATCHES);
    }
  }

  report(): LatencyReport {
    const current = this.clockSync.current;
    return {
      batches: this.samples.length,
      offsetMs: round(current?.offset ?? null),
      roundTripMs: round(current?.roundTrip ?? null),
      rows: Object.fromEntries(
        STAGES.map((stage, i) => {
          const { p50, p95, p99, max } = latencyStats(this.samples.map((sample) => sample[i]));
          return [stage, { p50: round(p50), p95: round(p95), p99: round(p99), max: round(max) }];
        }),
      ),
    };
  }

  /** Drops the samples and measures the clock offset again, so a run starts clean. */
  reset(): void {
    this.samples = [];
    this.waiting = [];
    void this.clockSync.sync();
  }
}

/** Rounds to 0.001 ms, which hides the float noise of a difference between two epoch times. */
function round(value: number | null): number | null {
  return value === null ? null : Math.round(value * 1000) / 1000;
}

/** Sets `window.latency`, so the DevTools console can print the report and start a new run. */
export function exposeLatency(tracker: LatencyTracker): void {
  window.latency = {
    report: () => {
      const report = tracker.report();
      console.table(report.rows);
      return report;
    },
    reset: () => tracker.reset(),
  };
}
