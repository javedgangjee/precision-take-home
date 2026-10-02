import { TestBed } from '@angular/core/testing';
import { HeatMapStore } from '../heatmap/heat-map-store';
import { ServerSource, STREAM_EVENT_SOURCE } from './server-source';
import { StreamStatus } from './stream-status';

const STREAM_URL = 'http://localhost:8000/stream';
const DEFAULT_PACKET = {
  samples_per_second: 5000,
  batch_interval_ms: 50,
  max_value: 1024,
  paused: false,
};

/** Stands in for EventSource, so the test can fire its events. */
class FakeEventSource {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  private readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();
  constructor(readonly url: string) {}

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, listener);
  }

  open(): void {
    this.onopen?.();
  }
  /** Fires a batch. The id is the batch sequence number from the `id` line. */
  message(data: string, id?: number): void {
    this.onmessage?.(new MessageEvent('message', { data, lastEventId: id?.toString() }));
  }
  /** Fires a settings packet with the default values and the given changes. */
  update(changes: Partial<typeof DEFAULT_PACKET> = {}): void {
    const data = JSON.stringify({ ...DEFAULT_PACKET, ...changes });
    this.listeners.get('update')?.(new MessageEvent('update', { data }));
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

  describe('settings packet', () => {
    it('has no settings and a missed batch count of 0 at start', () => {
      expect(status.settings()).toBeNull();
      expect(status.missedBatches()).toBe(0);
    });

    it('reads the default settings and is live after an open event and an update event', () => {
      sources[0].open();
      sources[0].update();
      expect(status.settings()).toEqual({
        samplesPerSecond: 5000,
        batchIntervalMs: 50,
        maxValue: 1024,
      });
      expect(status.state()).toBe('live');
    });

    it('changes the settings on a second update event', () => {
      sources[0].open();
      sources[0].update();
      sources[0].update({ samples_per_second: 20, batch_interval_ms: 1000 });
      expect(status.settings()).toEqual({
        samplesPerSecond: 20,
        batchIntervalMs: 1000,
        maxValue: 1024,
      });
    });

    it('is paused after an update event with paused true and stays open for 60 s with no message', () => {
      sources[0].open();
      sources[0].update({ paused: true });
      expect(status.state()).toBe('paused');
      vi.advanceTimersByTime(60_000);
      expect(status.state()).toBe('paused');
      expect(sources[0].close).not.toHaveBeenCalled();
      expect(sources.length).toBe(1);
    });

    it('applies the message "[17,8]" while paused with N = 4 and does not start the watchdog', () => {
      store.setN(4);
      sources[0].open();
      sources[0].update({ paused: true });
      sources[0].message('[17,8]');
      expect(store.counts.at(0, 0)).toBe(1);
      expect(store.counts.at(1, 3)).toBe(1);
      vi.advanceTimersByTime(5000);
      expect(status.state()).toBe('paused');
    });

    it('is live after a pause ends, and is reconnecting after 5 s with no message', () => {
      sources[0].open();
      sources[0].update({ paused: true });
      sources[0].update({ paused: false });
      expect(status.state()).toBe('live');
      vi.advanceTimersByTime(5000);
      expect(status.state()).toBe('reconnecting');
    });

    it('is reconnecting after an error while paused, and is paused again on the new EventSource', () => {
      sources[0].open();
      sources[0].update({ paused: true });
      sources[0].fail();
      expect(status.state()).toBe('reconnecting');
      vi.advanceTimersByTime(999);
      expect(sources.length).toBe(1);
      vi.advanceTimersByTime(1);
      expect(sources.length).toBe(2);
      latest().open();
      latest().update({ paused: true });
      expect(status.state()).toBe('paused');
    });
  });

  describe('missed batch count', () => {
    beforeEach(() => {
      sources[0].open();
    });

    /** Fires one batch for each id on the latest EventSource. */
    function batches(...ids: number[]): void {
      for (const id of ids) latest().message('[1]', id);
    }

    it('is 2 after the ids 0, 1, and 4', () => {
      batches(0, 1, 4);
      expect(status.missedBatches()).toBe(2);
    });

    it('is 7 after a reconnect and the id 10, and is 0 after the id 3', () => {
      batches(0, 1, 4);
      latest().fail();
      vi.advanceTimersByTime(1000);
      expect(sources.length).toBe(2);
      latest().open();
      batches(10);
      expect(status.missedBatches()).toBe(7);
      batches(3);
      expect(status.missedBatches()).toBe(0);
    });

    it('does not change on an update event between the ids 4 and 5', () => {
      batches(4);
      const before = status.missedBatches();
      sources[0].update();
      batches(5);
      expect(status.missedBatches()).toBe(before);
    });

    it('is 0 after a change to N and stays 0 on the next id', () => {
      batches(0, 1, 4);
      store.setN(4);
      TestBed.tick();
      expect(status.missedBatches()).toBe(0);
      batches(5);
      expect(status.missedBatches()).toBe(0);
    });
  });
});
