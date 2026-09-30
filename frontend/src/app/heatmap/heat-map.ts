import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
    this.observer = new ResizeObserver(() => this.layout());
    this.observer.observe(this.host.nativeElement);
    document.fonts?.ready.then(() => this.store.markDirty());
    const loop = (now: number) => {
      if (this.store.frame(now) && this.ctx) {
        this.renderer.draw(this.ctx, this.store.counts, this.gridDevicePx, this.pixelRatio);
      }
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  private stop(): void {
    cancelAnimationFrame(this.frameId);
    this.observer?.disconnect();
  }

  /** Fits the grid, its axis labels, and the color scale in the host. */
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
    this.store.markDirty();
  }
}
