import { Component, computed, inject } from '@angular/core';
import { StreamState, StreamStatus } from '../source/stream-status';

interface BadgeLook {
  label: string;
  tone: 'neutral' | 'success' | 'warning';
  /** The Material Symbols icon name, or null for no icon. */
  icon: string | null;
}

const LOOKS: Record<StreamState, BadgeLook> = {
  connecting: { label: 'Connecting', tone: 'neutral', icon: 'progress_activity' },
  live: { label: 'Live', tone: 'success', icon: 'sensors' },
  reconnecting: { label: 'Reconnecting', tone: 'warning', icon: 'sync' },
  test: { label: 'Test source', tone: 'neutral', icon: null },
};

/** Shows the stream state as a pill, as the stream status badge in the HTML design does. */
@Component({
  selector: 'app-stream-badge',
  templateUrl: './stream-badge.html',
  styleUrl: './stream-badge.scss',
})
export class StreamBadge {
  private readonly status = inject(StreamStatus);
  protected readonly look = computed(() => LOOKS[this.status.state()]);
}
