import { binIndex, cellOf } from './binning';

describe('binning', () => {
  it('V1.1 puts 17 in cell <0,0> for N = 4', () => {
    expect(cellOf(17, 4)).toEqual({ row: 0, col: 0 });
  });

  it('V1.2 puts 8 in cell <1,3> for N = 4', () => {
    expect(cellOf(8, 4)).toEqual({ row: 1, col: 3 });
  });

  it('puts 0 in cell <3,3> for N = 4', () => {
    expect(cellOf(0, 4)).toEqual({ row: 3, col: 3 });
  });

  it('puts 1 in cell <0,0> and 16 in cell <3,3> for N = 4', () => {
    expect(cellOf(1, 4)).toEqual({ row: 0, col: 0 });
    expect(cellOf(16, 4)).toEqual({ row: 3, col: 3 });
  });

  it('puts 0, 1, and 1,000,000 in cell <0,0> for N = 1', () => {
    for (const v of [0, 1, 1_000_000]) {
      expect(cellOf(v, 1)).toEqual({ row: 0, col: 0 });
    }
  });

  it('puts 1,024 in cell <31,31> and 1,025 in cell <0,0> for N = 32', () => {
    expect(cellOf(1024, 32)).toEqual({ row: 31, col: 31 });
    expect(cellOf(1025, 32)).toEqual({ row: 0, col: 0 });
  });

  it('returns the flat index as (v - 1) mod N²', () => {
    expect(binIndex(8, 4)).toBe(7);
    expect(binIndex(0, 4)).toBe(15);
  });
});
