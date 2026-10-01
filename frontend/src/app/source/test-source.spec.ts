import { TestBed } from '@angular/core/testing';
import { HeatMapStore } from '../heatmap/heat-map-store';
import { ACK } from './batch-queue';
import { StreamStatus } from './stream-status';
import { TEST_SOURCE_WORKER, TestSource } from './test-source';

/** Stands in for the worker, so the test can post a message to the service. */
class FakeWorker {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

describe('TestSource', () => {
  it('parses a batch string from the worker, applies it to the counts, and acks it', () => {
    const worker = new FakeWorker();
    TestBed.configureTestingModule({
      providers: [{ provide: TEST_SOURCE_WORKER, useValue: () => worker }],
    });
    const store = TestBed.inject(HeatMapStore);
    store.setN(4);
    TestBed.inject(TestSource).start();

    worker.onmessage?.(new MessageEvent('message', { data: '[17,8]' }));

    expect(store.counts.at(0, 0)).toBe(1);
    expect(store.counts.at(1, 3)).toBe(1);
    expect(worker.postMessage).toHaveBeenLastCalledWith(ACK);
  });

  it('sets the stream state to test when it starts', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: TEST_SOURCE_WORKER, useValue: () => new FakeWorker() }],
    });
    TestBed.inject(TestSource).start();

    expect(TestBed.inject(StreamStatus).state()).toBe('test');
  });
});
