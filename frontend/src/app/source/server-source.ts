import { inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { HeatMapStore } from '../heatmap/heat-map-store';
import { reconnectDelay } from './backoff';
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

/**
 * Reads the server stream and applies each batch to the counts. EventSource
 * retries at a fixed delay, so on each drop the service closes it and opens a
 * new one after a backoff delay. The service never resets the counts.
 */
@Injectable({ providedIn: 'root' })
export class ServerSource implements OnDestroy {
  private readonly store = inject(HeatMapStore);
  private readonly status = inject(StreamStatus);
  private readonly createEventSource = inject(STREAM_EVENT_SOURCE);
  private url: string | null = null;
  private source: EventSource | null = null;
  /** The number of failed attempts since the last open event. */
  private failures = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private watchdogTimer: ReturnType<typeof setTimeout> | undefined;

  start(url: string): void {
    if (this.url !== null) return;
    this.url = url;
    this.status.set('connecting');
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
    source.onmessage = ({ data }: MessageEvent<string>) => {
      this.store.applyBatch(JSON.parse(data) as number[]);
      this.resetWatchdog();
    };
    source.onerror = () => this.drop();
  }

  /** Closes the stream and opens a new one after the backoff delay. */
  private drop(): void {
    if (this.status.state() === 'live') this.status.set('reconnecting');
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
