import { TestBed } from '@angular/core/testing';
import { HeatMap } from './heat-map';
import { HeatMapRenderer } from './heat-map-renderer';
import { HeatMapStore } from './heat-map-store';

describe('HeatMap', () => {
  let frameCallback: FrameRequestCallback | null;
  let resizeCallback: (() => void) | null;

  beforeEach(() => {
    frameCallback = null;
    resizeCallback = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {
          resizeCallback = callback;
        }
        observe(): void {
          this.callback();
        }
        disconnect(): void {
          // The fake observer holds nothing to release.
        }
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calls the renderer only on a frame when store.frame returns true', async () => {
    const store = TestBed.inject(HeatMapStore);
    const draw = vi.spyOn(HeatMapRenderer.prototype, 'draw').mockImplementation(() => undefined);
    const frame = vi.spyOn(store, 'frame');
    const fixture = TestBed.createComponent(HeatMap);
    await fixture.whenStable();
    draw.mockClear();

    frame.mockReturnValueOnce(true);
    frameCallback?.(1000);
    expect(draw).toHaveBeenCalledTimes(1);

    frame.mockReturnValueOnce(false);
    frameCallback?.(1016);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('draws the grid at once on a resize, without waiting for a frame', async () => {
    const draw = vi.spyOn(HeatMapRenderer.prototype, 'draw').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(HeatMap);
    await fixture.whenStable();
    draw.mockClear();

    resizeCallback?.();
    expect(draw).toHaveBeenCalledTimes(1);
  });
});
