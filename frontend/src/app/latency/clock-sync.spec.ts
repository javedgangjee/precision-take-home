import { TestBed } from '@angular/core/testing';
import { CLIENT_CLOCK, ClockSample, ClockSync, pickOffset, TIME_REQUEST } from './clock-sync';

const TIME_URL = 'http://localhost:8000/time';

const A: ClockSample = { before: 1000, after: 1100, server: 2050 };
const B: ClockSample = { before: 2000, after: 2020, server: 3012 };
const C: ClockSample = { before: 3000, after: 3060, server: 4030 };
/** Two samples with longer round trips than A, B, and C. */
const D: ClockSample = { before: 4000, after: 4200, server: 5100 };
const E: ClockSample = { before: 5000, after: 5300, server: 6150 };

describe('pickOffset', () => {
  it('gives 1,002 ms and a round trip of 20 ms for three samples', () => {
    expect(pickOffset([A, B, C])).toEqual({ offset: 1002, roundTrip: 20 });
  });

  it('gives 1,000 ms and a round trip of 100 ms for one sample', () => {
    expect(pickOffset([A])).toEqual({ offset: 1000, roundTrip: 100 });
  });

  it('gives no offset for no samples', () => {
    expect(pickOffset([])).toBeNull();
  });
});

describe('ClockSync', () => {
  let request: ReturnType<typeof vi.fn<(url: string) => Promise<{ epoch_us: number }>>>;
  let clock: ReturnType<typeof vi.fn<() => number>>;
  let service: ClockSync;

  /** Sets up the next requests. A sample gives a good response, and null gives a failed request. */
  function next(...steps: (ClockSample | null)[]): void {
    for (const step of steps) {
      if (step === null) {
        // A failed request reads the clock only before the request.
        clock.mockReturnValueOnce(0);
        request.mockRejectedValueOnce(new Error('The request failed.'));
      } else {
        clock.mockReturnValueOnce(step.before).mockReturnValueOnce(step.after);
        request.mockResolvedValueOnce({ epoch_us: step.server * 1000 });
      }
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    request = vi.fn();
    clock = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: TIME_REQUEST, useValue: request },
        { provide: CLIENT_CLOCK, useValue: clock },
      ],
    });
    service = TestBed.inject(ClockSync);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has no offset before the start', () => {
    expect(service.current).toBeNull();
  });

  it('makes exactly 5 requests to the time address and keeps the offset from the shortest round trip', async () => {
    next(A, D, B, E, C);
    await service.start(TIME_URL);
    expect(request).toHaveBeenCalledTimes(5);
    expect(request.mock.calls.every(([url]) => url === TIME_URL)).toBe(true);
    expect(service.current).toEqual({ offset: 1002, roundTrip: 20 });
  });

  it('counts a response with epoch_us 2050000 as a server time of 2,050 ms', async () => {
    clock.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
    request.mockResolvedValueOnce({ epoch_us: 2050000 });
    next(null, null, null, null);
    await service.start(TIME_URL);
    expect(service.current).toEqual({ offset: 1000, roundTrip: 100 });
  });

  it('takes the offset from the other 3 requests when 2 of the 5 fail', async () => {
    next(null, A, B, null, C);
    await service.start(TIME_URL);
    expect(request).toHaveBeenCalledTimes(5);
    expect(service.current).toEqual({ offset: 1002, roundTrip: 20 });
  });

  it('keeps the offset as it was when all 5 requests fail', async () => {
    next(A, D, B, E, C);
    await service.start(TIME_URL);
    next(null, null, null, null, null);
    await service.sync();
    expect(request).toHaveBeenCalledTimes(10);
    expect(service.current).toEqual({ offset: 1002, roundTrip: 20 });
  });

  it('makes 5 more requests on a second sync and uses the old offset until the new one exists', async () => {
    next(A, D, B, E, C);
    await service.start(TIME_URL);
    next(A, A, A, A, A);
    const done = service.sync();
    expect(service.current).toEqual({ offset: 1002, roundTrip: 20 });
    await done;
    expect(request).toHaveBeenCalledTimes(10);
    expect(service.current).toEqual({ offset: 1000, roundTrip: 100 });
  });

  it('makes no more requests in 60 s with no second sync', async () => {
    next(A, D, B, E, C);
    await service.start(TIME_URL);
    vi.advanceTimersByTime(60_000);
    expect(request).toHaveBeenCalledTimes(5);
  });
});
