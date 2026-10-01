import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { STREAM_EVENT_SOURCE } from './source/server-source';
import { TEST_SOURCE_WORKER } from './source/test-source';

describe('App', () => {
  let createWorker: ReturnType<typeof vi.fn>;
  let createEventSource: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createWorker = vi.fn(() => ({ postMessage: vi.fn(), terminate: vi.fn() }) as unknown as Worker);
    createEventSource = vi.fn(() => ({ close: vi.fn() }) as unknown as EventSource);
    TestBed.configureTestingModule({
      providers: [
        { provide: TEST_SOURCE_WORKER, useValue: createWorker },
        { provide: STREAM_EVENT_SOURCE, useValue: createEventSource },
      ],
    });
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {
          // The page test does not need resize events.
        }
        disconnect(): void {
          // The fake observer holds nothing to release.
        }
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    history.replaceState(null, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows "Bin There, Done That" in the page header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('header h1')?.textContent?.trim()).toBe('Bin There, Done That');
    expect(element.querySelector('app-heat-map')).not.toBeNull();
    expect(element.querySelector('app-side-panel')).not.toBeNull();
  });

  it('starts the server source and makes no worker with no query', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(createEventSource).toHaveBeenCalledExactlyOnceWith(
      'https://api.precision.jgangjee.com/stream',
    );
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('starts the test source and makes no EventSource with source=frontend', async () => {
    history.replaceState(null, '', '/?source=frontend');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(createWorker).toHaveBeenCalledOnce();
    expect(createEventSource).not.toHaveBeenCalled();
  });
});
