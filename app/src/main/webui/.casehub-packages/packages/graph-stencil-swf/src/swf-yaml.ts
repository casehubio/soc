export interface SwfDocumentInfo {
  dsl?: string;
  namespace?: string;
  name?: string;
  version?: string;
}

export interface SwfDocumentYaml {
  document?: SwfDocumentInfo;
  input?: unknown;
  output?: unknown;
  do: Record<string, unknown>[];
  use?: unknown;
  timeout?: unknown;
  schedule?: unknown;
}
