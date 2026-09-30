import { FrameRateMeter } from './frame-rate';

/** Ticks the meter at the given rate from the start time up to and including the end time. */
function run(meter: FrameRateMeter, fps: number, start: number, end: number): void {
  for (let i = 0; start + (i * 1000) / fps <= end; i++) {
    meter.tick(start + (i * 1000) / fps);
  }
}

describe('FrameRateMeter', () => {
  it('reads 0 before 1 s has passed', () => {
    const meter = new FrameRateMeter();
    run(meter, 60, 0, 999);
    expect(meter.reading).toBe(0);
  });

  it('reads 60 after the first second at 60 fps', () => {
    const meter = new FrameRateMeter();
    let readingAtOneSecond = -1;
    for (let i = 0; i <= 120; i++) {
      const now = (i * 1000) / 60;
      const reading = meter.tick(now);
      if (now === 1000) readingAtOneSecond = reading;
    }
    expect(readingAtOneSecond).toBe(60);
    expect(meter.reading).toBe(60);
  });

  it('reports a drop from 60 fps to 30 fps as below the expected rate', () => {
    const meter = new FrameRateMeter();
    run(meter, 60, 0, 999);
    run(meter, 30, 1000, 2000);
    expect(meter.reading).toBe(30);
    expect(meter.peak).toBe(60);
    expect(meter.below).toBe(true);
  });

  it('does not report 55 fps after 60 fps as below the expected rate', () => {
    const meter = new FrameRateMeter();
    run(meter, 60, 0, 999);
    run(meter, 55, 1000, 2000);
    expect(meter.reading).toBe(55);
    expect(meter.below).toBe(false);
  });

  it('reads 30 after the first second at 30 fps', () => {
    const meter = new FrameRateMeter();
    run(meter, 30, 0, 2000);
    expect(meter.reading).toBe(30);
  });
});
