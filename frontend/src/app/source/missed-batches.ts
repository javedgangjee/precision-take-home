/**
 * Counts the batches that the client missed, from the gaps in the batch ids.
 * The server gives each batch the next id, so an id that skips ahead means the
 * client missed the ids between.
 */
export class MissedBatches {
  private lastId: number | null = null;
  private missed = 0;

  get count(): number {
    return this.missed;
  }

  /** Takes the id of a batch and returns the count. The first batch adds nothing. */
  add(id: number): number {
    if (this.lastId !== null) {
      if (id < this.lastId) {
        // The ids start at 0 again when the server restarts.
        this.missed = 0;
      } else if (id > this.lastId) {
        this.missed += id - this.lastId - 1;
      }
    }
    this.lastId = id;
    return this.missed;
  }

  /** Sets the count to 0 and keeps the last id, so the next batch adds nothing. */
  reset(): void {
    this.missed = 0;
  }
}
