import { ChangeDetectorRef, Component, computed, inject } from '@angular/core';
import { HeatMapStore, MAX_N, MIN_N } from '../heatmap/heat-map-store';
import { StreamStatus } from '../source/stream-status';
import { StreamBadge } from './stream-badge';

const numberFormat = new Intl.NumberFormat('en-US');

/** Shows the stream badge, the N control, and the readouts, and forwards N changes to the store. */
@Component({
  selector: 'app-side-panel',
  imports: [StreamBadge],
  templateUrl: './side-panel.html',
  styleUrl: './side-panel.scss',
})
export class SidePanel {
  protected readonly store = inject(HeatMapStore);
  private readonly status = inject(StreamStatus);
  private readonly changeDetector = inject(ChangeDetectorRef);

  protected readonly sizeText = computed(() => String(this.store.n()));
  protected readonly rangeText = `N ranges from ${MIN_N} to ${MAX_N}`;
  /** A mouse click that focuses the field ends with a mouseup that would clear the selection. */
  private keepSelectionOnMouseUp = false;
  protected readonly atMin = computed(() => this.store.n() <= MIN_N);
  protected readonly atMax = computed(() => this.store.n() >= MAX_N);
  protected readonly samplesText = computed(() => numberFormat.format(this.store.samples()));
  protected readonly maxText = computed(() => numberFormat.format(this.store.max()));
  /** The value is null when the source has no batch ids, so the readout does not show. */
  protected readonly missedText = computed(() => {
    const missed = this.status.missedBatches();
    return missed === null ? null : numberFormat.format(missed);
  });
  /** The value is null until the source has its settings, so the panel shows no made-up values. */
  protected readonly settingsText = computed(() => {
    const settings = this.status.settings();
    return (
      settings && {
        samplesPerSecond: numberFormat.format(settings.samplesPerSecond),
        batchIntervalMs: numberFormat.format(settings.batchIntervalMs),
        maxValue: numberFormat.format(settings.maxValue),
      }
    );
  });

  protected change(delta: number): void {
    this.store.setN(this.store.n() + delta);
  }

  /** The whole text is selected on focus, so a typed value replaces it. */
  protected onFocus(input: HTMLInputElement): void {
    input.select();
    this.keepSelectionOnMouseUp = true;
  }

  protected onMouseUp(event: MouseEvent): void {
    if (this.keepSelectionOnMouseUp) {
      event.preventDefault();
      this.keepSelectionOnMouseUp = false;
    }
  }

  /**
   * The up and down arrow keys change N by 1, and by 10 with Shift. Enter sets N from
   * the typed text, and Escape shows the current N again.
   */
  protected onKey(event: KeyboardEvent, input: HTMLInputElement): void {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.change(step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.change(-step);
    } else if (event.key === 'Enter') {
      this.commit(input);
      input.select();
    } else if (event.key === 'Escape') {
      input.value = this.sizeText();
      input.select();
    }
  }

  /**
   * Sets N from the first whole number in the field. The store snaps N to 1 to 100. Text with
   * no number keeps N.
   */
  protected commit(input: HTMLInputElement): void {
    const match = /-?\d+/.exec(input.value);
    if (match) this.store.setN(Number(match[0]));
    // The binding writes a new N now. A later write would erase a key typed right after Enter.
    this.changeDetector.detectChanges();
    // The binding does not write the same value twice, so a kept N needs this write.
    input.value = this.sizeText();
  }
}
