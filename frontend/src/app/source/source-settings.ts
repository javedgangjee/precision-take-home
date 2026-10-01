/** The source that feeds the counts. Only one runs at a time. */
export type SourceKind = 'server' | 'frontend';

export interface SourceSettings {
  source: SourceKind;
  /** The address of the server stream, such as http://localhost:8000/stream. */
  streamUrl: string;
}

/** The cloud server. Use `?server=http://localhost:8000` for the local server. */
export const DEFAULT_SERVER = 'https://api.precision.jgangjee.com';

/**
 * Reads `source` and `server` from a URL query such as `?source=frontend`.
 * A bad value falls back to its default, and the console gets a warning that
 * names the setting.
 */
export function readSourceSettings(query: string): SourceSettings {
  const params = new URLSearchParams(query);
  return {
    source: readSource(params.get('source')),
    streamUrl: `${readServer(params.get('server'))}/stream`,
  };
}

function readSource(raw: string | null): SourceKind {
  if (raw === null || raw === 'server' || raw === 'frontend') return raw ?? 'server';
  console.warn(
    `Source: \`source\` must be "server" or "frontend", but it is "${raw}". Using the server.`,
  );
  return 'server';
}

function readServer(raw: string | null): string {
  if (raw === null) return DEFAULT_SERVER;
  if (URL.canParse(raw) && ['http:', 'https:'].includes(new URL(raw).protocol)) {
    return raw.replace(/\/+$/, '');
  }
  console.warn(
    `Source: \`server\` must be an http or https URL, but it is "${raw}". Using the default ${DEFAULT_SERVER}.`,
  );
  return DEFAULT_SERVER;
}
