import { DOCUMENT, inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { HeatMapStore } from '../heatmap/heat-map-store';
import { ACK } from './batch-queue';
import { readTestSourceSettings } from './test-source-settings';

/** Makes the worker that runs the batch generator. Tests replace it with a fake. */
export const TEST_SOURCE_WORKER = new InjectionToken<() => Worker>('TEST_SOURCE_WORKER', {
  providedIn: 'root',
  factory: () => () =>
    new Worker(new URL('./test-source.worker', import.meta.url), { type: 'module' }),
});

/**
 * Starts the test source worker with the settings from the page URL. Each
 * message is a JSON array string, which the service parses and applies to the
 * counts, as the server stream will in feature 4. The service then acks the
 * batch, so the worker sends the next one.
 */
@Injectable({ providedIn: 'root' })
export class TestSource implements OnDestroy {
  private readonly store = inject(HeatMapStore);
  private readonly document = inject(DOCUMENT);
  private readonly createWorker = inject(TEST_SOURCE_WORKER);
  private worker: Worker | null = null;

  start(): void {
    if (this.worker) return;
    const settings = readTestSourceSettings(this.document.location.search);
    this.worker = this.createWorker();
    this.worker.onmessage = ({ data }: MessageEvent<string>) => {
      this.store.applyBatch(JSON.parse(data) as number[]);
      this.worker?.postMessage(ACK);
    };
    this.worker.postMessage(settings);
  }

  ngOnDestroy(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
