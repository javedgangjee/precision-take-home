import { Injectable, signal } from '@angular/core';

/** The state of the source in use. The test source has its own state, so a reviewer cannot mistake it for the server. */
export type StreamState = 'connecting' | 'live' | 'reconnecting' | 'test';

/** Holds the stream state. The source in use writes it, and the badge reads it. */
@Injectable({ providedIn: 'root' })
export class StreamStatus {
  private readonly stateSignal = signal<StreamState>('connecting');
  readonly state = this.stateSignal.asReadonly();

  set(state: StreamState): void {
    this.stateSignal.set(state);
  }
}
