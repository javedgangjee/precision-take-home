import { readSourceSettings } from './source-settings';

describe('readSourceSettings', () => {
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

  it('uses the server at https://api.precision.jgangjee.com/stream with no query', () => {
    expect(readSourceSettings('')).toEqual({
      source: 'server',
      streamUrl: 'https://api.precision.jgangjee.com/stream',
      timeUrl: 'https://api.precision.jgangjee.com/time',
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('gives the time address at https://api.precision.jgangjee.com/time with no query', () => {
    expect(readSourceSettings('').timeUrl).toBe('https://api.precision.jgangjee.com/time');
  });

  it('gives the time address of the server address without its trailing slash', () => {
    expect(readSourceSettings('?server=http://localhost:8000/').timeUrl).toBe(
      'http://localhost:8000/time',
    );
  });

  it('uses the test source for source=frontend', () => {
    expect(readSourceSettings('?source=frontend').source).toBe('frontend');
  });

  it('uses the server and warns for source=abc', () => {
    expect(readSourceSettings('?source=abc').source).toBe('server');
    expectWarningFor('source');
  });

  it('reads the server address', () => {
    expect(readSourceSettings('?server=http://localhost:8000').streamUrl).toBe(
      'http://localhost:8000/stream',
    );
  });

  it('strips a trailing slash from the server address', () => {
    expect(readSourceSettings('?server=http://localhost:8000/').streamUrl).toBe(
      'http://localhost:8000/stream',
    );
  });

  it.each(['abc', 'ftp://example.com'])(
    'uses the default server and warns for server=%s',
    (value) => {
      expect(readSourceSettings(`?server=${value}`).streamUrl).toBe(
        'https://api.precision.jgangjee.com/stream',
      );
      expectWarningFor('server');
    },
  );
});
