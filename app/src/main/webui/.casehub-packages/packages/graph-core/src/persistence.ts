export interface ValidationError {
  readonly path: string;
  readonly message: string;
}

export type ReadResult =
  | { readonly status: 'ok'; readonly yaml: string; readonly version: string }
  | { readonly status: 'not_found'; readonly uri: string }
  | { readonly status: 'parse_error'; readonly message: string; readonly raw: string }
  | { readonly status: 'schema_error'; readonly errors: readonly ValidationError[]; readonly yaml: string; readonly version: string };

export type WriteResult =
  | { readonly status: 'ok'; readonly version: string }
  | { readonly status: 'conflict'; readonly currentVersion: string };

export interface PersistenceBackend {
  read(uri: string): Promise<ReadResult>;
  write(uri: string, yaml: string, expectedVersion: string): Promise<WriteResult>;
}

interface StoredDocument {
  yaml: string;
  version: number;
}

export class InMemoryBackend implements PersistenceBackend {
  private readonly store = new Map<string, StoredDocument>();

  async read(uri: string): Promise<ReadResult> {
    const doc = this.store.get(uri);
    if (!doc) {
      return { status: 'not_found', uri };
    }
    return { status: 'ok', yaml: doc.yaml, version: String(doc.version) };
  }

  async write(uri: string, yaml: string, expectedVersion: string): Promise<WriteResult> {
    const doc = this.store.get(uri);

    if (doc) {
      if (expectedVersion !== String(doc.version)) {
        return { status: 'conflict', currentVersion: String(doc.version) };
      }
      const newVersion = doc.version + 1;
      this.store.set(uri, { yaml, version: newVersion });
      return { status: 'ok', version: String(newVersion) };
    }

    this.store.set(uri, { yaml, version: 1 });
    return { status: 'ok', version: '1' };
  }
}
