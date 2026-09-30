import { Component, computed, inject, input } from '@angular/core';
import { scaleLabels } from './color-map';
import { HeatMapStore } from './heat-map-store';

/** Shows the color bar at the height of the grid, with labels from 1 to the max count. */
@Component({
  selector: 'app-color-scale',
  templateUrl: './color-scale.html',
  styleUrl: './color-scale.scss',
})
export class ColorScale {
  private readonly store = inject(HeatMapStore);

  /** The grid height in CSS pixels. */
  readonly height = input.required<number>();
  protected readonly labels = computed(() => scaleLabels(this.store.max()));
}
