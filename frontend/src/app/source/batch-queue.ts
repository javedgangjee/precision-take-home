/** Matches QUEUE_SIZE on the server. */
export const QUEUE_SIZE = 2;

/** The main thread posts this to the worker when it has applied a batch. */
export const ACK = 'ack';

/**
 * Holds the batches that wait for the main thread, as the server holds them
 * for each client. One batch is in flight at a time, and an ack releases the
 * next one. A full queue drops its oldest batch, so a slow main thread gets
 * fresh data and the backlog stays small.
 */
export class BatchQueue {
  private readonly waiting: string[] = [];
  private inFlight = false;

  constructor(
    private readonly send: (batch: string) => void,
    private readonly size = QUEUE_SIZE,
  ) {}

  push(batch: string): void {
    if (this.waiting.length === this.size) this.waiting.shift();
    this.waiting.push(batch);
    this.pump();
  }

  ack(): void {
    this.inFlight = false;
    this.pump();
  }

  private pump(): void {
    const batch = this.inFlight ? undefined : this.waiting.shift();
    if (batch === undefined) return;
    this.inFlight = true;
    this.send(batch);
  }
}
