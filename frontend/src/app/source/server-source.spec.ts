import { TestBed } from '@angular/core/testing';
import { HeatMapStore } from '../heatmap/heat-map-store';
import { ServerSource, STREAM_EVENT_SOURCE } from './server-source';
import { StreamStatus } from './stream-status';

const STREAM_URL = 'http://localhost:8000/stream';

/** Stands in for EventSource, so the test can fire its events. */
class FakeEventSource {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor(readonly url: string) {}

  open(): void {
    this.onopen?.();
  }
  message(data: string): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
  fail(): void {
    this.onerror?.();
  }
}

describe('ServerSource', () => {
  let sources: FakeEventSource[];
  let store: HeatMapStore;
  let status: StreamStatus;
  let service: ServerSource;

  const latest = () => sources[sources.length - 1];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(1);
    sources = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: STREAM_EVENT_SOURCE,
          useValue: (url: string) => {
            const source = new FakeEventSource(url);
            sources.push(source);
            return source as unknown as EventSource;
          },
        },
      ],
    });
    store = TestBed.inject(HeatMapStore);
    status = TestBed.inject(StreamStatus);
    service = TestBed.inject(ServerSource);
    service.start(STREAM_URL);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is connecting at start with one EventSource on the stream URL', () => {
    expect(status.state()).toBe('connecting');
    expect(sources.length).toBe(1);
    expect(sources[0].url).toBe(STREAM_URL);
  });

  it('is live after an open event', () => {
    sources[0].open();
    expect(status.state()).toBe('live');
  });

  it('applies the message "[17,8]" to cells <0,0> and <1,3> with N = 4', () => {
    store.setN(4);
    sources[0].open();
    sources[0].message('[17,8]');
    expect(store.counts.at(0, 0)).toBe(1);
    expect(store.counts.at(1, 3)).toBe(1);
  });

  describe('after an error while live', () => {
    beforeEach(() => {
      store.setN(4);
      sources[0].open();
      sources[0].message('[17,8]');
      sources[0].fail();
    });

    it('is reconnecting, closes the EventSource, and keeps the counts', () => {
      expect(status.state()).toBe('reconnecting');
      expect(sources[0].close).toHaveBeenCalled();
      expect(store.counts.at(0, 0)).toBe(1);
      expect(store.counts.at(1, 3)).toBe(1);
    });

    it('opens a new EventSource at 1,000 ms and not at 999 ms', () => {
      vi.advanceTimersByTime(999);
      expect(sources.length).toBe(1);
      vi.advanceTimersByTime(1);
      expect(sources.length).toBe(2);
    });

    it('waits 2,000 ms after the new EventSource also fails', () => {
      vi.advanceTimersByTime(1000);
      latest().fail();
      vi.advanceTimersByTime(1999);
      expect(sources.length).toBe(2);
      vi.advanceTimersByTime(1);
      expect(sources.length).toBe(3);
    });

    it('is live after the new EventSource opens, and the next drop waits 1,000 ms again', () => {
      vi.advanceTimersByTime(1000);
      latest().open();
      expect(status.state()).toBe('live');
      latest().fail();
      vi.advanceTimersByTime(999);
      expect(sources.length).toBe(2);
      vi.advanceTimersByTime(1);
      expect(sources.length).toBe(3);
    });
  });

  it('stays connecting after an error before the first open and retries after 1,000 ms', () => {
    sources[0].fail();
    expect(status.state()).toBe('connecting');
    vi.advanceTimersByTime(999);
    expect(sources.length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(sources.length).toBe(2);
  });

  it('stays live with a message every 1 s for 10 s', () => {
    sources[0].open();
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(1000);
      sources[0].message('[1]');
    }
    expect(status.state()).toBe('live');
    expect(sources[0].close).not.toHaveBeenCalled();
  });

  it('is reconnecting and closes the EventSource after 5 s with no message while live', () => {
    sources[0].open();
    vi.advanceTimersByTime(4999);
    expect(status.state()).toBe('live');
    vi.advanceTimersByTime(1);
    expect(status.state()).toBe('reconnecting');
    expect(sources[0].close).toHaveBeenCalled();
  });

  it('closes the EventSource on destroy and opens no new one later', () => {
    sources[0].open();
    TestBed.resetTestingModule();
    expect(sources[0].close).toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(sources.length).toBe(1);
  });
});
