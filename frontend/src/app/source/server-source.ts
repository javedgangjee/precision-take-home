import { effect, inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { HeatMapStore } from '../heatmap/heat-map-store';
import { CLIENT_CLOCK } from '../latency/clock-sync';
import { LatencyTracker } from '../latency/latency-tracker';
import { reconnectDelay } from './backoff';
import { readBatchId } from './batch-id';
import { MissedBatches } from './missed-batches';
import { StreamStatus } from './stream-status';

/** Makes the EventSource for a stream URL. Tests replace it with a fake. */
export const STREAM_EVENT_SOURCE = new InjectionToken<(url: string) => EventSource>(
  'STREAM_EVENT_SOURCE',
  { providedIn: 'root', factory: () => (url) => new EventSource(url) },
);

/**
 * At the lowest server settings a batch arrives each second. EventSource hides
 * the heartbeat comments, so a live stream with no batch for this long counts
 * as dropped.
 */
export const WATCHDOG_MS = 5000;

/** The data of an `update` event. It holds the server settings and the pause state. */
interface SettingsPacket {
  samples_per_second: number;
  batch_interval_ms: number;
  max_value: number;
  paused: boolean;
}

/**
 * Reads the server stream and applies each batch to the counts. EventSource
 * retries at a fixed delay, so on each drop the service closes it and opens a
 * new one after a backoff delay. The service never resets the counts.
 *
 * The stream also sends the settings packet as an `update` event. The service
 * writes the settings to the stream status, and it stops the watchdog while
 * the server is paused.
 *
 * The service also takes three timestamps for each batch and gives them to the
 * latency tracker, with the server times from the batch id.
 */
@Injectable({ providedIn: 'root' })
export class ServerSource implements OnDestroy {
  private readonly store = inject(HeatMapStore);
  private readonly status = inject(StreamStatus);
  private readonly createEventSource = inject(STREAM_EVENT_SOURCE);
  private readonly tracker = inject(LatencyTracker);
  private readonly clock = inject(CLIENT_CLOCK);
  private url: string | null = null;
  private source: EventSource | null = null;
  /** The number of failed attempts since the last open event. */
  private failures = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private watchdogTimer: ReturnType<typeof setTimeout> | undefined;
  /** The counter lives as long as the service, so it also counts the batches lost in a reconnect. */
  private readonly missed = new MissedBatches();
  private n = this.store.n();

  constructor() {
    // A change to N resets the missed batch count, as it resets the samples received.
    effect(() => {
      const n = this.store.n();
      if (n === this.n) return;
      this.n = n;
      this.missed.reset();
      this.status.setMissedBatches(0);
    });
  }

  start(url: string): void {
    if (this.url !== null) return;
    this.url = url;
    this.status.set('connecting');
    this.status.setMissedBatches(0);
    this.connect();
  }

  ngOnDestroy(): void {
    this.url = null;
    this.close();
    clearTimeout(this.retryTimer);
  }

  private connect(): void {
    if (this.url === null) return;
    const source = this.createEventSource(this.url);
    this.source = source;
    source.onopen = () => {
      this.failures = 0;
      this.status.set('live');
      this.resetWatchdog();
    };
    // Only a batch has an id line, so a settings packet never reaches the missed batch count.
    source.onmessage = ({ data, lastEventId }: MessageEvent<string>) => {
      const received = this.clock();
      const values = JSON.parse(data) as number[];
      const parsed = this.clock();
      this.store.applyBatch(values);
      const applied = this.clock();
      // The id holds the sequence number and then the server times.
      const id = readBatchId(lastEventId);
      this.status.setMissedBatches(this.missed.add(id.seq));
      this.tracker.addBatch({ server: id.times, received, parsed, applied });
      // A batch made before a pause can arrive after it. It does not start the watchdog.
      if (this.status.state() !== 'paused') this.resetWatchdog();
    };
    source.addEventListener('update', ({ data }: MessageEvent<string>) =>
      this.applySettings(JSON.parse(data) as SettingsPacket),
    );
    source.onerror = () => this.drop();
  }

  private applySettings(packet: SettingsPacket): void {
    this.status.setSettings({
      samplesPerSecond: packet.samples_per_second,
      batchIntervalMs: packet.batch_interval_ms,
      maxValue: packet.max_value,
    });
    if (packet.paused) {
      // The server sends no batches during a pause, so the watchdog would see a drop.
      this.status.set('paused');
      clearTimeout(this.watchdogTimer);
    } else {
      this.status.set('live');
      this.resetWatchdog();
    }
  }

  /** Closes the stream and opens a new one after the backoff delay. */
  private drop(): void {
    const state = this.status.state();
    if (state === 'live' || state === 'paused') this.status.set('reconnecting');
    this.close();
    const delay = reconnectDelay(this.failures, Math.random());
    this.failures++;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private resetWatchdog(): void {
    clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => this.drop(), WATCHDOG_MS);
  }

  private close(): void {
    clearTimeout(this.watchdogTimer);
    this.source?.close();
    this.source = null;
  }
}
