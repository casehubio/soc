import type { DataProvider, FetchResult } from "../types.js";

export class InlineProvider implements DataProvider {
  constructor(private readonly content: string) {}

  fetch(_request: import("../types.js").DataRequest): Promise<FetchResult> {
    return Promise.resolve({ data: this.content });
  }
}
