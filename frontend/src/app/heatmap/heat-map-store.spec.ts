import { TestBed } from '@angular/core/testing';
import { HeatMapStore } from './heat-map-store';

/** The example input (e) from the brief picture. */
const BRIEF_EXAMPLE = [4, 11, 6, 6, 11, 11, 11, 6, 11, 6, 6, 11, 11, 11, 11, 11];

describe('HeatMapStore', () => {
  let store: HeatMapStore;

  beforeEach(() => {
    store = TestBed.inject(HeatMapStore);
  });

  it('V3.1 counts the example input from the brief picture for N = 4', () => {
    store.setN(4);
    store.applyBatch(BRIEF_EXAMPLE);
    const { counts } = store;
    expect(counts.at(2, 2)).toBe(10);
    expect(counts.at(1, 1)).toBe(5);
    expect(counts.at(0, 3)).toBe(1);
    const others = Array.from(counts.cells).filter((c) => c !== 0);
    expect(others.length).toBe(3);
    expect(counts.max).toBe(10);
    expect(counts.total).toBe(16);
  });

  it('starts with N = 32', () => {
    expect(store.n()).toBe(32);
    expect(store.counts.n).toBe(32);
  });

  it('clamps N to 1 to 64', () => {
    store.setN(0);
    expect(store.n()).toBe(1);
    store.setN(65);
    expect(store.n()).toBe(64);
  });

  it('resets every count, the max, and the total when N changes', () => {
    store.applyBatch([17, 8, 17]);
    store.setN(33);
    expect(Array.from(store.counts.cells).every((c) => c === 0)).toBe(true);
    expect(store.counts.max).toBe(0);
    expect(store.counts.total).toBe(0);
  });
});
