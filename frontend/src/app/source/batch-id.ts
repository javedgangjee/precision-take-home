/** The three server times of a batch, in ms since the Unix epoch on the server clock. */
export interface ServerTimes {
  /** The time just before the server made the values. */
  started: number;
  /** The time when the JSON text existed. */
  encoded: number;
  /** The time when the stream route took the batch from the queue of this client. */
  sent: number;
}

export interface BatchId {
  /** The batch sequence number. */
  seq: number;
  /** The value is null when the id holds only a sequence number. */
  times: ServerTimes | null;
}

const DIGITS = /^\d+$/;

/**
 * Reads a batch id in the form `<sequence number>:<started>:<encoded>:<sent>`.
 * The server sends each time in microseconds. An id that does not hold three
 * whole numbers after the sequence number gives no times.
 */
export function readBatchId(id: string): BatchId {
  const [seq, ...rest] = id.split(':');
  if (rest.length !== 3 || !rest.every((part) => DIGITS.test(part))) {
    return { seq: Number(seq), times: null };
  }
  const [started, encoded, sent] = rest.map((part) => Number(part) / 1000);
  return { seq: Number(seq), times: { started, encoded, sent } };
}
