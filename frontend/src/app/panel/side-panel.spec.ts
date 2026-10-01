import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeatMapStore } from '../heatmap/heat-map-store';
import { SidePanel } from './side-panel';

describe('SidePanel', () => {
  let fixture: ComponentFixture<SidePanel>;
  let store: HeatMapStore;
  let element: HTMLElement;

  const field = () => element.querySelector<HTMLInputElement>('#grid-size')!;
  const minus = () =>
    element.querySelector<HTMLButtonElement>('[aria-label="Decrease grid size"]')!;
  const plus = () => element.querySelector<HTMLButtonElement>('[aria-label="Increase grid size"]')!;
  const readout = (label: string) =>
    Array.from(element.querySelectorAll('.md-readout')).find(
      (e) => e.querySelector('.md-readout-label')?.textContent?.trim() === label,
    )!;
  const readoutValue = (label: string) =>
    readout(label).querySelector('.md-readout-value')!.textContent!.replace(/\s+/g, ' ').trim();
  const warning = () => element.querySelector('.danger-text');

  /** Runs the store frames at the given rate from the start time up to the end time. */
  function run(fps: number, start: number, end: number): void {
    for (let i = 0; start + (i * 1000) / fps <= end; i++) store.frame(start + (i * 1000) / fps);
  }

  async function render(): Promise<void> {
    await fixture.whenStable();
  }

  beforeEach(async () => {
    store = TestBed.inject(HeatMapStore);
    fixture = TestBed.createComponent(SidePanel);
    element = fixture.nativeElement;
    await render();
  });

  it('shows "32 × 32" in the N field at start', () => {
    expect(field().value).toBe('32 × 32');
  });

  it('shows the stream badge above the grid size control', () => {
    const badge = element.querySelector('app-stream-badge');
    const control = element.querySelector('.control');
    expect(badge).not.toBeNull();
    expect(
      badge!.compareDocumentPosition(control!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows "33 × 33" and resets the samples received after a click on plus', async () => {
    store.applyBatch([1, 2, 3]);
    store.frame(0);
    await render();
    plus().click();
    await render();
    expect(field().value).toBe('33 × 33');
    expect(readoutValue('Samples received')).toBe('0');
  });

  it('hides minus at N = 1 and plus at N = 64 without the disabled attribute', async () => {
    store.setN(1);
    await render();
    expect(minus().style.visibility).toBe('hidden');
    expect(plus().style.visibility).not.toBe('hidden');
    store.setN(64);
    await render();
    expect(plus().style.visibility).toBe('hidden');
    expect(minus().style.visibility).not.toBe('hidden');
    expect(minus().hasAttribute('disabled')).toBe(false);
    expect(plus().hasAttribute('disabled')).toBe(false);
  });

  it('hides minus after a click at N = 2 and plus after a click at N = 63', async () => {
    store.setN(2);
    await render();
    minus().click();
    await render();
    expect(minus().style.visibility).toBe('hidden');
    store.setN(63);
    await render();
    plus().click();
    await render();
    expect(plus().style.visibility).toBe('hidden');
  });

  it('changes N with the arrow keys in the N field', async () => {
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(store.n()).toBe(33);
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }));
    expect(store.n()).toBe(43);
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(store.n()).toBe(42);
  });

  it('shows "1,024" after 1,024 samples', async () => {
    store.applyBatch(Array.from({ length: 1024 }, (_, i) => i));
    store.frame(0);
    await render();
    expect(readoutValue('Samples received')).toBe('1,024');
  });

  it('shows the frame rate with the unit "fps"', async () => {
    run(60, 0, 1200);
    await render();
    expect(readoutValue('Frame rate')).toBe('60 fps');
  });

  it('shows the red error line when the reading drops below 60 fps and hides it when it is back', async () => {
    run(60, 0, 999);
    run(30, 1000, 2200);
    await render();
    expect(readoutValue('Frame rate')).toBe('30 fps');
    expect(warning()?.textContent?.trim()).toBe('Below the expected 60 fps');

    run(30, 2201, 2999);
    run(60, 3000, 4200);
    await render();
    expect(readoutValue('Frame rate')).toBe('60 fps');
    expect(warning()).toBeNull();
  });
});
