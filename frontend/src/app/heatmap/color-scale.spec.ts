import { TestBed } from '@angular/core/testing';
import { ColorScale } from './color-scale';
import { HeatMapStore } from './heat-map-store';

/** The example input (e) from the brief picture. */
const BRIEF_EXAMPLE = [4, 11, 6, 6, 11, 11, 11, 6, 11, 6, 6, 11, 11, 11, 11, 11];

function labels(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('.label')).map((e) => e.textContent?.trim() ?? '');
}

describe('ColorScale', () => {
  it('shows the labels 10, 5.5, and 1 from top to bottom after the example input', async () => {
    const store = TestBed.inject(HeatMapStore);
    store.setN(4);
    store.applyBatch(BRIEF_EXAMPLE);
    store.frame(0);
    const fixture = TestBed.createComponent(ColorScale);
    fixture.componentRef.setInput('height', 400);
    await fixture.whenStable();
    expect(labels(fixture.nativeElement)).toEqual(['10', '5.5', '1']);
  });

  it('shows no labels when there is no data', async () => {
    const fixture = TestBed.createComponent(ColorScale);
    fixture.componentRef.setInput('height', 400);
    await fixture.whenStable();
    expect(labels(fixture.nativeElement)).toEqual([]);
  });
});
