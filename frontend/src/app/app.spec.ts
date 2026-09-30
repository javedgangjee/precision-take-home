import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TEST_SOURCE_WORKER } from './source/test-source';

describe('App', () => {
  beforeEach(() => {
    const worker = { postMessage: vi.fn(), terminate: vi.fn() } as unknown as Worker;
    TestBed.configureTestingModule({
      providers: [{ provide: TEST_SOURCE_WORKER, useValue: () => worker }],
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
});
