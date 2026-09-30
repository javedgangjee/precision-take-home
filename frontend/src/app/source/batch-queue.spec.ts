import { BatchQueue } from './batch-queue';

describe('BatchQueue', () => {
  it('sends the first batch at once', () => {
    const send = vi.fn();
    const queue = new BatchQueue(send);
    queue.push('a');
    expect(send.mock.calls).toEqual([['a']]);
  });

  it('holds later batches until the main thread acks the batch in flight', () => {
    const send = vi.fn();
    const queue = new BatchQueue(send);
    queue.push('a');
    queue.push('b');
    expect(send.mock.calls).toEqual([['a']]);
    queue.ack();
    expect(send.mock.calls).toEqual([['a'], ['b']]);
  });

  it('drops the oldest batch when 2 batches wait', () => {
    const send = vi.fn();
    const queue = new BatchQueue(send);
    queue.push('a');
    queue.push('b');
    queue.push('c');
    queue.push('d');
    queue.ack();
    queue.ack();
    queue.ack();
    expect(send.mock.calls).toEqual([['a'], ['c'], ['d']]);
  });

  it('sends the next batch at once when the queue is empty at the ack', () => {
    const send = vi.fn();
    const queue = new BatchQueue(send);
    queue.push('a');
    queue.ack();
    queue.push('b');
    expect(send.mock.calls).toEqual([['a'], ['b']]);
  });
});
