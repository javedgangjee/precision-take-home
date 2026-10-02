import { readBatchId } from './batch-id';

describe('readBatchId', () => {
  it('reads the sequence number 7 and the times 1,000, 1,003, and 1,005 ms from the short id', () => {
    expect(readBatchId('7:1000000:1003000:1005000')).toEqual({
      seq: 7,
      times: { started: 1000, encoded: 1003, sent: 1005 },
    });
  });

  it('reads the times of an id with epoch times to within 0.001 ms', () => {
    const id = readBatchId('1234:1790812800123456:1790812800123541:1790812800123702');
    expect(id.seq).toBe(1234);
    expect(Math.abs((id.times?.started ?? 0) - 1790812800123.456)).toBeLessThan(0.001);
    expect(Math.abs((id.times?.sent ?? 0) - 1790812800123.702)).toBeLessThan(0.001);
  });

  it('reads the sequence number 42 and no times from the id "42"', () => {
    expect(readBatchId('42')).toEqual({ seq: 42, times: null });
  });

  it('reads the sequence number 0 and no times from an empty id', () => {
    expect(readBatchId('')).toEqual({ seq: 0, times: null });
  });

  it('reads the sequence number 42 and no times from the id "42:1000:2000"', () => {
    expect(readBatchId('42:1000:2000')).toEqual({ seq: 42, times: null });
  });

  it('reads the sequence number 42 and no times from the id "42:a:b:c"', () => {
    expect(readBatchId('42:a:b:c')).toEqual({ seq: 42, times: null });
  });
});
