import { inject, Injectable, InjectionToken } from '@angular/core';

/** One request to `GET /time`, with each time in ms. */
export interface ClockSample {
  /** The client time before the request. */
  before: number;
  /** The client time after the response. */
  after: number;
  /** The server time in the response. */
  server: number;
}

export interface ClockOffset {
  /** The server clock minus the client clock, in ms. */
  offset: number;
  /** The round trip of the request that gave the offset, in ms. The error of the offset is at most half of it. */
  roundTrip: number;
}

/** The body of `GET /time`. The time is in microseconds since the Unix epoch. */
export interface TimeResponse {
  epoch_us: number;
}

/**
 * The client clock in ms since the Unix epoch. It does not jump when the
 * system clock changes, as `Date.now()` does. Tests replace it with a fake.
 */
export const CLIENT_CLOCK = new InjectionToken<() => number>('CLIENT_CLOCK', {
  providedIn: 'root',
  factory: () => () => performance.timeOrigin + performance.now(),
});

/** Asks the server for its time. Tests replace it with a fake. */
export const TIME_REQUEST = new InjectionToken<(url: string) => Promise<TimeResponse>>(
  'TIME_REQUEST',
  {
    providedIn: 'root',
    factory: () => async (url) => {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`The time request returned status ${response.status}.`);
      return (await response.json()) as TimeResponse;
    },
  },
);

/** The client makes this many requests for each measurement. */
const SYNC_REQUESTS = 5;

/**
 * Returns the offset from the sample with the shortest round trip. The offset
 * is the server time minus the midpoint of the two client times, which is
 * exact when the request and the response take the same time.
 */
export function pickOffset(samples: readonly ClockSample[]): ClockOffset | null {
  let best: ClockOffset | null = null;
  for (const { before, after, server } of samples) {
    const roundTrip = after - before;
    if (best === null || roundTrip < best.roundTrip) {
      best = { offset: server - (before + after) / 2, roundTrip };
    }
  }
  return best;
}

/**
 * Measures the difference between the server clock and the client clock. It
 * measures at start and on each call to `sync`, and it sends no requests in
 * the background.
 */
@Injectable({ providedIn: 'root' })
export class ClockSync {
  private readonly request = inject(TIME_REQUEST);
  private readonly clock = inject(CLIENT_CLOCK);
  private url: string | null = null;
  private latest: ClockOffset | null = null;

  /** The value is null until the first measurement ends. */
  get current(): ClockOffset | null {
    return this.latest;
  }

  /** Sets the address of `GET /time` and makes the first measurement. */
  start(url: string): Promise<void> {
    this.url = url;
    return this.sync();
  }

  /**
   * Makes the requests one after the other, so they do not slow each other.
   * The old offset stays in use until the new one exists, and it also stays
   * when every request fails.
   */
  async sync(): Promise<void> {
    if (this.url === null) return;
    const samples: ClockSample[] = [];
    for (let i = 0; i < SYNC_REQUESTS; i++) {
      const before = this.clock();
      try {
        const { epoch_us } = await this.request(this.url);
        samples.push({ before, after: this.clock(), server: epoch_us / 1000 });
      } catch {
        // A failed request gives no sample.
      }
    }
    this.latest = pickOffset(samples) ?? this.latest;
  }
}
