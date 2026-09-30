import { Component, computed, inject } from '@angular/core';
import { HeatMapStore, MAX_N, MIN_N } from '../heatmap/heat-map-store';

const numberFormat = new Intl.NumberFormat('en-US');

/** Shows the N control and the readouts, and forwards N changes to the store. */
@Component({
  selector: 'app-side-panel',
  templateUrl: './side-panel.html',
  styleUrl: './side-panel.scss',
})
export class SidePanel {
  protected readonly store = inject(HeatMapStore);

  protected readonly sizeText = computed(() => `${this.store.n()} × ${this.store.n()}`);
  protected readonly atMin = computed(() => this.store.n() <= MIN_N);
  protected readonly atMax = computed(() => this.store.n() >= MAX_N);
  protected readonly samplesText = computed(() => numberFormat.format(this.store.samples()));
  protected readonly maxText = computed(() => numberFormat.format(this.store.max()));

  protected change(delta: number): void {
    this.store.setN(this.store.n() + delta);
  }

  /** The up and down arrow keys change N by 1, and by 10 with Shift. */
  protected onKey(event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.change(step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.change(-step);
    }
  }
}
