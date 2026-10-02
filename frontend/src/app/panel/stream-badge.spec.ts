import { TestBed } from '@angular/core/testing';
import { StreamState, StreamStatus } from '../source/stream-status';
import { StreamBadge } from './stream-badge';

describe('StreamBadge', () => {
  async function render(state: StreamState): Promise<HTMLElement> {
    TestBed.inject(StreamStatus).set(state);
    const fixture = TestBed.createComponent(StreamBadge);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.md-badge');
  }

  const label = (badge: HTMLElement) =>
    Array.from(badge.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('')
      .trim();
  const icon = (badge: HTMLElement) =>
    badge.querySelector('.material-symbols-outlined')?.textContent?.trim() ?? null;

  it.each([
    ['connecting', 'Connecting', 'neutral', 'progress_activity'],
    ['live', 'Live', 'success', 'sensors'],
    ['reconnecting', 'Reconnecting', 'warning', 'sync'],
    ['paused', 'Paused', 'neutral', 'pause'],
    ['test', 'Test source', 'neutral', null],
  ] as const)(
    'shows %s as "%s" with the %s tone and the %s icon',
    async (state, text, tone, name) => {
      const badge = await render(state);
      expect(label(badge)).toBe(text);
      expect(badge.classList).toContain(`md-badge-${tone}`);
      expect(icon(badge)).toBe(name);
    },
  );
});
