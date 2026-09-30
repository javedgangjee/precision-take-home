import { readTestSourceSettings } from './test-source-settings';

describe('readTestSourceSettings', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function expectWarningFor(name: string): void {
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`\`${name}\``));
  }

  it('uses the server defaults with no query', () => {
    expect(readTestSourceSettings('')).toEqual({ rate: 100_000, interval: 50, max: 1024 });
    expect(warn).not.toHaveBeenCalled();
  });

  it('reads the highest rate, the longest interval, and the smallest max value', () => {
    expect(readTestSourceSettings('?rate=10000000&interval=1000&max=1')).toEqual({
      rate: 10_000_000,
      interval: 1000,
      max: 1,
    });
  });

  it.each(['0', '10000001', 'abc'])('falls back to the default rate for rate=%s', (value) => {
    expect(readTestSourceSettings(`?rate=${value}`).rate).toBe(100_000);
    expectWarningFor('rate');
  });

  it.each(['49', '1001'])('falls back to the default interval for interval=%s', (value) => {
    expect(readTestSourceSettings(`?interval=${value}`).interval).toBe(50);
    expectWarningFor('interval');
  });

  it.each(['0', '10001'])('falls back to the default max value for max=%s', (value) => {
    expect(readTestSourceSettings(`?max=${value}`).max).toBe(1024);
    expectWarningFor('max');
  });
});
