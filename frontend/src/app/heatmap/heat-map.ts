import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CLIENT_CLOCK } from '../latency/clock-sync';
import { LatencyTracker } from '../latency/latency-tracker';
import { ColorScale } from './color-scale';
import { canvasSize, HeatMapRenderer, LABEL_MARGIN } from './heat-map-renderer';
import { HeatMapStore } from './heat-map-store';

/** The grid never gets smaller than this many CSS pixels. */
const MIN_GRID_PX = 120;
/** Matches the gap between the canvas and the color scale in heat-map.scss. */
const SCALE_GAP_PX = 20;

/**
 * Hosts the canvas, sizes it to the largest square that fits, and runs the
 * requestAnimationFrame loop that calls the store and the renderer.
 */
@Component({
  selector: 'app-heat-map',
  imports: [ColorScale],
  templateUrl: './heat-map.html',
  styleUrl: './heat-map.scss',
})
export class HeatMap {
  private readonly store = inject(HeatMapStore);
  private readonly tracker = inject(LatencyTracker);
  private readonly clock = inject(CLIENT_CLOCK);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly scale = viewChild.required(ColorScale, { read: ElementRef });
  private readonly renderer = new HeatMapRenderer();

  /** The grid side in CSS pixels, which is also the height of the color scale. */
  protected readonly gridPx = signal(0);

  private ctx: CanvasRenderingContext2D | null = null;
  private gridDevicePx = 0;
  private pixelRatio = 1;
  private frameId = 0;
  private observer: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => this.start());
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  private start(): void {
    this.ctx = this.canvas().nativeElement.getContext('2d');
    this.observer = new ResizeObserver(() => this.layout()); // listens for host size changes
    this.observer.observe(this.host.nativeElement);
    document.fonts?.ready.then(() => this.store.markDirty());
    // Runs 60 times/sec for each frame
    const loop = (now: number) => {
      const frame = this.clock();
      if (this.store.frame(now)) {
        this.draw();
        this.tracker.addFrame(frame, this.clock());
      }
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  /** Stops the requestAnimationFrame loop and the ResizeObserver. */
  private stop(): void {
    cancelAnimationFrame(this.frameId);
    this.observer?.disconnect();
  }

  /** Draws the grid and the axis labels on the canvas. */
  private draw(): void {
    if (this.ctx) {
      this.renderer.draw(this.ctx, this.store.counts, this.gridDevicePx, this.pixelRatio);
    }
  }

  /**
   * Fits the grid, its axis labels, and the color scale in the host. Setting the
   * canvas size clears the canvas, and the browser paints before the next frame,
   * so this draws the grid again at once.
   */
  private layout(): void {
    const host = this.host.nativeElement;
    const scaleWidth = (this.scale().nativeElement as HTMLElement).offsetWidth;
    const fit = Math.min(
      host.clientWidth - LABEL_MARGIN.left - SCALE_GAP_PX - scaleWidth,
      host.clientHeight - LABEL_MARGIN.bottom,
    );
    const gridPx = Math.max(MIN_GRID_PX, Math.floor(fit));
    this.pixelRatio = window.devicePixelRatio || 1;
    this.gridDevicePx = Math.round(gridPx * this.pixelRatio);

    const canvas = this.canvas().nativeElement;
    const device = canvasSize(this.gridDevicePx, this.pixelRatio);
    canvas.width = device.width;
    canvas.height = device.height;
    canvas.style.width = `${device.width / this.pixelRatio}px`;
    canvas.style.height = `${device.height / this.pixelRatio}px`;
    this.gridPx.set(gridPx);
    this.draw();
  }
}
