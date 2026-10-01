const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

/**
 * Returns the wait in ms before the next connect attempt. The wait doubles
 * with each failed attempt since the last open, up to 30 s. The random factor
 * from 0.5 to 1 spreads the clients out after a server restart.
 *
 * @param attempt The number of failed attempts since the last open, from 0.
 * @param random A value from 0 to 1, such as one from Math.random.
 */
export function reconnectDelay(attempt: number, random: number): number {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt) * (0.5 + random / 2);
}
