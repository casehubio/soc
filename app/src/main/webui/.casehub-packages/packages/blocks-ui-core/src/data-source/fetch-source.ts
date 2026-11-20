import type { DataSource, DataSink } from "@casehubio/pages-data";
import type { SnapshotEvent } from "@casehubio/pages-data/dist/dataset/events.js";
import type { ExternalColumnDef, ExtractionDef, FetchResult, PresetRegistry } from "@casehubio/pages-data/dist/dataset/external/types.js";
import { extractDataSet } from "@casehubio/pages-data/dist/dataset/external/extraction.js";

export interface FetchSourceOptions {
  readonly method?: string;
  readonly headers?: Record<string, string> | (() => Record<string, string>);
  readonly body?: string;
  readonly fetchFn?: typeof globalThis.fetch;
  readonly columns?: readonly ExternalColumnDef[];
  readonly dataPath?: string;
  readonly totalPath?: string;
}

const emptyPresetRegistry: PresetRegistry = {
  get: () => undefined,
  has: () => false,
};

function navigatePath(data: unknown, path: string): number | undefined {
  let current: unknown = data;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "number" ? current : undefined;
}

export function fetchSource(url: string, options?: FetchSourceOptions): DataSource {
  let abort: AbortController | undefined;
  return {
    connect(sink: DataSink) {
      abort = new AbortController();
      const signal = abort.signal;
      const doFetch = options?.fetchFn ?? globalThis.fetch.bind(globalThis);
      const headers = typeof options?.headers === "function"
        ? options.headers()
        : options?.headers;
      const init: RequestInit = { signal };
      if (options?.method) init.method = options.method;
      if (headers) init.headers = headers;
      if (options?.body) init.body = options.body;
      doFetch(url, init)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(async (data) => {
          if (signal.aborted) return;

          let totalRows: number | undefined;
          if (options?.totalPath) {
            totalRows = navigatePath(data, options.totalPath);
          }

          const result: FetchResult = { data };
          const def: ExtractionDef = {
            ...(options?.columns != null ? { columns: options.columns } : {}),
            ...(options?.dataPath != null ? { dataPath: options.dataPath } : {}),
          };

          try {
            const { dataset } = await extractDataSet(result, def, emptyPresetRegistry);
            if (!signal.aborted) {
              const event: SnapshotEvent = totalRows != null
                ? { type: "snapshot", dataset, totalRows }
                : { type: "snapshot", dataset };
              sink.apply(event);
            }
          } catch (err) {
            if (!signal.aborted) {
              sink.error({
                message: err instanceof Error ? err.message : String(err),
                permanent: true,
              });
            }
          }
        })
        .catch(err => {
          if (!signal.aborted && err.name !== "AbortError") {
            sink.error({ message: err.message, permanent: true });
          }
        });
    },
    disconnect() {
      abort?.abort();
      abort = undefined;
    },
  };
}
