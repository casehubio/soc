import type { DataSetId } from "../dataset/types.js";
import type { DataSetEvent } from "../dataset/events.js";
import type { DataSetManager } from "../dataset/manager.js";
import type { DataSource, DataSink, SourceError, Disposable } from "./types.js";

export interface SourceConnector extends Disposable {
  connect(source: DataSource): void;
  disconnect(): void;
  replace(source: DataSource): void;
  refresh(): void;
  readonly source: DataSource | undefined;
  readonly connected: boolean;
}

export interface SourceConnectorOptions {
  readonly onError?: (err: SourceError) => void;
  readonly onConnecting?: () => void;
  readonly onEvent?: (event: DataSetEvent) => void;
}

export function createSourceConnector(
  id: DataSetId,
  manager: DataSetManager,
  options?: SourceConnectorOptions,
): SourceConnector {
  let currentSource: DataSource | undefined;
  let generation = 0;

  function connectInternal(source: DataSource): void {
    const capturedGen = ++generation;
    currentSource = source;
    options?.onConnecting?.();

    const sink: DataSink = {
      apply(event) {
        if (generation !== capturedGen) return;
        manager.apply(id, event);
        options?.onEvent?.(event);
      },
      error(err) {
        if (generation !== capturedGen) return;
        options?.onError?.(err);
      },
    };

    source.connect(sink);
  }

  function disconnectInternal(): void {
    if (!currentSource) return;
    generation++;
    currentSource.disconnect();
    currentSource = undefined;
  }

  return {
    connect(source: DataSource): void {
      if (source === currentSource) return;
      connectInternal(source);
    },

    disconnect(): void {
      disconnectInternal();
    },

    replace(source: DataSource): void {
      disconnectInternal();
      connectInternal(source);
    },

    refresh(): void {
      if (!currentSource) return;
      const source = currentSource;
      disconnectInternal();
      connectInternal(source);
    },

    dispose(): void {
      disconnectInternal();
    },

    get source() {
      return currentSource;
    },

    get connected() {
      return currentSource !== undefined;
    },
  };
}
