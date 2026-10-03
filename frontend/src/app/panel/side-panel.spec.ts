import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeatMapStore } from '../heatmap/heat-map-store';
import { StreamStatus } from '../source/stream-status';
import { SidePanel } from './side-panel';

describe('SidePanel', () => {
  let fixture: ComponentFixture<SidePanel>;
  let store: HeatMapStore;
  let status: StreamStatus;
  let element: HTMLElement;

  const field = () => element.querySelector<HTMLInputElement>('#grid-size')!;
  const minus = () =>
    element.querySelector<HTMLButtonElement>('[aria-label="Decrease grid size"]')!;
  const plus = () => element.querySelector<HTMLButtonElement>('[aria-label="Increase grid size"]')!;
  const readout = (label: string) =>
    Array.from(element.querySelectorAll('.md-readout')).find(
      (e) => e.querySelector('.md-readout-label')?.textContent?.trim() === label,
    )!;
  const readoutLabels = () =>
    Array.from(element.querySelectorAll('.md-readout-label')).map((e) => e.textContent?.trim());
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
    status = TestBed.inject(StreamStatus);
    fixture = TestBed.createComponent(SidePanel);
    element = fixture.nativeElement;
    await render();
  });

  it('shows "32" in the N field at start', () => {
    expect(field().value).toBe('32');
  });

  it('shows the stream badge above the grid size control', () => {
    const badge = element.querySelector('app-stream-badge');
    const control = element.querySelector('.control');
    expect(badge).not.toBeNull();
    expect(
      badge!.compareDocumentPosition(control!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows "33" and resets the samples received after a click on plus', async () => {
    store.applyBatch([1, 2, 3]);
    store.frame(0);
    await render();
    plus().click();
    await render();
    expect(field().value).toBe('33');
    expect(readoutValue('Samples received')).toBe('0');
  });

  it('hides minus at N = 1 and plus at N = 100 without the disabled attribute', async () => {
    store.setN(1);
    await render();
    expect(minus().style.visibility).toBe('hidden');
    expect(plus().style.visibility).not.toBe('hidden');
    store.setN(100);
    await render();
    expect(plus().style.visibility).toBe('hidden');
    expect(minus().style.visibility).not.toBe('hidden');
    expect(minus().hasAttribute('disabled')).toBe(false);
    expect(plus().hasAttribute('disabled')).toBe(false);
  });

  it('hides minus after a click at N = 2 and plus after a click at N = 99', async () => {
    store.setN(2);
    await render();
    minus().click();
    await render();
    expect(minus().style.visibility).toBe('hidden');
    store.setN(99);
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

  it('shows "N ranges from 1 to 100" below the N field', () => {
    const hint = element.querySelector('#grid-size-hint');
    expect(hint?.textContent?.trim()).toBe('N ranges from 1 to 100');
    expect(field().getAttribute('aria-describedby')).toBe('grid-size-hint');
    expect(field().readOnly).toBe(false);
  });

  it('sets N to the typed value on Enter', async () => {
    field().value = '50';
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await render();
    expect(store.n()).toBe(50);
    expect(field().value).toBe('50');
  });

  it('sets N to the typed value on blur', async () => {
    field().value = '40';
    field().dispatchEvent(new Event('blur'));
    await render();
    expect(store.n()).toBe(40);
    expect(field().value).toBe('40');
  });

  it('snaps a typed value above 100 to 100 and below 1 to 1', async () => {
    field().value = '250';
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await render();
    expect(store.n()).toBe(100);
    expect(field().value).toBe('100');
    field().value = '0';
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await render();
    expect(store.n()).toBe(1);
    expect(field().value).toBe('1');
  });

  it('shows "100" again when N is 100 and the typed value is above 100', async () => {
    store.setN(100);
    await render();
    field().value = '500';
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(store.n()).toBe(100);
    expect(field().value).toBe('100');
  });

  it('keeps text typed right after Enter', async () => {
    field().value = '250';
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    field().value = '7';
    await render();
    expect(field().value).toBe('7');
  });

  it('keeps N and shows it again when the typed text has no number', async () => {
    field().value = 'abc';
    field().dispatchEvent(new Event('blur'));
    expect(store.n()).toBe(32);
    expect(field().value).toBe('32');
  });

  it('keeps N and shows it again on Escape', () => {
    field().value = '70';
    field().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(store.n()).toBe(32);
    expect(field().value).toBe('32');
  });

  it('selects the whole text on focus and keeps it selected after the first mouseup', () => {
    field().dispatchEvent(new Event('focus'));
    expect(field().selectionStart).toBe(0);
    expect(field().selectionEnd).toBe('32'.length);
    const first = new MouseEvent('mouseup', { cancelable: true });
    field().dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);
    const second = new MouseEvent('mouseup', { cancelable: true });
    field().dispatchEvent(second);
    expect(second.defaultPrevented).toBe(false);
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

  it('has no settings readout with no settings', () => {
    expect(readout('Samples per second')).toBeUndefined();
    expect(readout('Batch interval')).toBeUndefined();
    expect(readout('Max value')).toBeUndefined();
  });

  it('shows "20,000", "50 ms", and "10,000" for the default settings', async () => {
    status.setSettings({ samplesPerSecond: 20_000, batchIntervalMs: 50, maxValue: 10_000 });
    await render();
    expect(readoutValue('Samples per second')).toBe('20,000');
    expect(readoutValue('Batch interval')).toBe('50 ms');
    expect(readoutValue('Max value')).toBe('10,000');
  });

  it('shows "100,000", "1,000 ms", and "1,024" after a change to the settings', async () => {
    status.setSettings({ samplesPerSecond: 20_000, batchIntervalMs: 50, maxValue: 10_000 });
    await render();
    status.setSettings({ samplesPerSecond: 100_000, batchIntervalMs: 1000, maxValue: 1024 });
    await render();
    expect(readoutValue('Samples per second')).toBe('100,000');
    expect(readoutValue('Batch interval')).toBe('1,000 ms');
    expect(readoutValue('Max value')).toBe('1,024');
  });

  it('shows "0" and "1,234" in the Missed batches readout', async () => {
    status.setMissedBatches(0);
    await render();
    expect(readoutValue('Missed batches')).toBe('0');
    status.setMissedBatches(1234);
    await render();
    expect(readoutValue('Missed batches')).toBe('1,234');
  });

  it('has no Missed batches readout with no missed batch count', () => {
    expect(readout('Missed batches')).toBeUndefined();
  });

  it('shows the seven readouts in order, with Frame rate last', async () => {
    status.setMissedBatches(0);
    status.setSettings({ samplesPerSecond: 20_000, batchIntervalMs: 50, maxValue: 10_000 });
    await render();
    expect(readoutLabels()).toEqual([
      'Samples received',
      'Max count',
      'Missed batches',
      'Samples per second',
      'Batch interval',
      'Max value',
      'Frame rate',
    ]);
  });
});
