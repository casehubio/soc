import type { DataSource, DataSink } from '@casehubio/pages-data';

export interface TypedFetchOptions {
  readonly method?: string;
  readonly headers?: Record<string, string>;
}

export function createTypedFetchSource<T>(
  url: string,
  handler: (data: T, sink: DataSink, signal: AbortSignal) => void,
  options?: TypedFetchOptions,
): DataSource {
  let abort: AbortController | undefined;
  return {
    connect(sink: DataSink) {
      abort = new AbortController();
      const signal = abort.signal;
      const init: RequestInit = { signal };
      if (options?.method) init.method = options.method;
      if (options?.headers) init.headers = options.headers;
      globalThis.fetch(url, init)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data: T) => {
          if (!signal.aborted) handler(data, sink, signal);
        })
        .catch(err => {
          if (!signal.aborted && err.name !== 'AbortError') {
            sink.error({ message: err instanceof Error ? err.message : String(err), permanent: true });
          }
        });
    },
    disconnect() {
      abort?.abort();
      abort = undefined;
    },
  };
}
