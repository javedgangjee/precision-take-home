import { TestBed } from '@angular/core/testing';
import { ClockOffset, ClockSync } from './clock-sync';
import { BatchTimes, exposeLatency, LatencyTracker } from './latency-tracker';

const OFFSET: ClockOffset = { offset: 1000, roundTrip: 20 };
const A: BatchTimes = {
  server: { started: 5000, encoded: 5003, sent: 5005 },
  received: 4025,
  parsed: 4026,
  applied: 4027,
};
const B: BatchTimes = {
  server: { started: 5010, encoded: 5012, sent: 5013 },
  received: 4030,
  parsed: 4031,
  applied: 4032,
};
const ROWS = ['generate', 'queue', 'network', 'parse', 'apply', 'frame wait', 'draw', 'total'];

/** Returns the stats of a stage where every value is the same. */
function all(value: number | null) {
  return { p50: value, p95: value, p99: value, max: value };
}

describe('LatencyTracker', () => {
  let current: ReturnType<typeof vi.spyOn>;
  let sync: ReturnType<typeof vi.spyOn>;
  let tracker: LatencyTracker;

  /** Draws a frame with the times 4035 and 4038. */
  const frame = () => tracker.addFrame(4035, 4038);

  beforeEach(() => {
    const clockSync = TestBed.inject(ClockSync);
    current = vi.spyOn(clockSync, 'current', 'get').mockReturnValue(OFFSET);
    sync = vi.spyOn(clockSync, 'sync').mockResolvedValue();
    tracker = TestBed.inject(LatencyTracker);
  });

  afterEach(() => {
    delete window.latency;
    vi.restoreAllMocks();
  });

  it('gives the seven stage times and a total of 38 for batch A and the frame', () => {
    tracker.addBatch(A);
    frame();
    const report = tracker.report();
    expect(report.batches).toBe(1);
    expect(report.rows).toEqual({
      generate: all(3),
      queue: all(2),
      network: all(20),
      parse: all(1),
      apply: all(1),
      'frame wait': all(8),
      draw: all(3),
      total: all(38),
    });
  });

  it('gives a total with a p50 of 28 and a max of 38 for batch A, batch B, and the frame', () => {
    tracker.addBatch(A);
    tracker.addBatch(B);
    frame();
    const report = tracker.report();
    expect(report.batches).toBe(2);
    expect(report.rows['total'].p50).toBe(28);
    expect(report.rows['total'].max).toBe(38);
    expect(report.rows['frame wait'].p50).toBe(3);
    expect(report.rows['frame wait'].max).toBe(8);
  });

  it('leaves the report as it was on a second frame with no new batch', () => {
    tracker.addBatch(A);
    frame();
    const before = tracker.report();
    tracker.addFrame(4051, 4054);
    expect(tracker.report()).toEqual(before);
  });

  it('adds no sample on a frame with no batch', () => {
    frame();
    expect(tracker.report().batches).toBe(0);
  });

  it('adds no sample with no offset, and none for the same batch when the offset exists later', () => {
    current.mockReturnValue(null);
    tracker.addBatch(A);
    frame();
    expect(tracker.report().batches).toBe(0);
    current.mockReturnValue(OFFSET);
    frame();
    expect(tracker.report().batches).toBe(0);
  });

  it('adds no sample for a batch with no server times', () => {
    tracker.addBatch({ ...A, server: null });
    frame();
    expect(tracker.report().batches).toBe(0);
  });

  it('has 0 batches after a reset, calls the clock sync once, and then counts a new batch', () => {
    tracker.addBatch(A);
    frame();
    tracker.reset();
    expect(tracker.report().batches).toBe(0);
    expect(sync).toHaveBeenCalledTimes(1);
    tracker.addBatch(B);
    frame();
    expect(tracker.report().batches).toBe(1);
  });

  it('has 1,200 batches after 1,201 batches that each get a frame', () => {
    for (let i = 0; i < 1201; i++) {
      tracker.addBatch(A);
      frame();
    }
    expect(tracker.report().batches).toBe(1200);
  });

  it('has 1,200 batches after 1,300 batches with no frame and then one frame', () => {
    for (let i = 0; i < 1300; i++) tracker.addBatch(A);
    frame();
    expect(tracker.report().batches).toBe(1200);
  });

  it('gives the offset 1,000, the round trip 20, and the rows in order', () => {
    const report = tracker.report();
    expect(report.offsetMs).toBe(1000);
    expect(report.roundTripMs).toBe(20);
    expect(Object.keys(report.rows)).toEqual(ROWS);
  });

  it('has 0 batches and no value in any row with no sample', () => {
    const report = tracker.report();
    expect(report.batches).toBe(0);
    for (const row of ROWS) expect(report.rows[row]).toEqual(all(null));
  });

  it('sets window.latency with a report that prints one table and a reset', () => {
    const table = vi.spyOn(console, 'table').mockImplementation(() => undefined);
    exposeLatency(tracker);
    expect(window.latency?.reset).toBeTypeOf('function');
    const report = window.latency?.report();
    expect(table).toHaveBeenCalledExactlyOnceWith(tracker.report().rows);
    expect(report).toEqual(tracker.report());
    window.latency?.reset();
    expect(sync).toHaveBeenCalledTimes(1);
  });
});
