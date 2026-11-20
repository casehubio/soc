import type { DataProvider, DataRequest, FetchResult } from "../types.js";

export class ServerRelayProvider implements DataProvider {
  constructor(
    private readonly endpoint: string,
    private readonly fetchFn: typeof globalThis.fetch,
    private readonly tokenFn?: () => string | null,
  ) {}

  async fetch(request: DataRequest): Promise<FetchResult> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = this.tokenFn?.();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await this.fetchFn(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (response.status === 401) {
      if (typeof globalThis.dispatchEvent === "function") {
        globalThis.dispatchEvent(
          new CustomEvent("pages-auth-expired", { detail: { endpoint: this.endpoint } }),
        );
      }
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${String(response.status)} ${response.statusText}: ${text}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("json")) {
      const data: unknown = await response.json();
      return { data, contentType };
    }
    const data = await response.text();
    return contentType ? { data, contentType } : { data };
  }
}
