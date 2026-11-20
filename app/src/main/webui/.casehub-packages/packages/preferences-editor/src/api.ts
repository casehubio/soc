import type { PreferenceSchemaDescriptor, PreferenceRecord, PreferenceInput } from './types.js';

export class PreferencesApi {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async fetchSchema(namespace?: string): Promise<PreferenceSchemaDescriptor[]> {
    const url = namespace
      ? `${this.baseUrl}/schema?namespace=${encodeURIComponent(namespace)}`
      : `${this.baseUrl}/schema`;
    return this._get(url);
  }

  async fetchAll(): Promise<PreferenceRecord[]> {
    return this._get(this.baseUrl);
  }

  async set(scope: string, input: PreferenceInput): Promise<void> {
    const url = `${this.baseUrl}?scope=${encodeURIComponent(scope)}`;
    const response = await this.fetchFn(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  }

  async deleteOne(scope: string, namespace: string, name: string, subKey: string): Promise<void> {
    const params = new URLSearchParams({ scope, namespace, name, subKey });
    const response = await this.fetchFn(`${this.baseUrl}?${params}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  }

  async deleteNamespace(scope: string, namespace: string): Promise<void> {
    const params = new URLSearchParams({ scope, namespace });
    const response = await this.fetchFn(`${this.baseUrl}/by-namespace?${params}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  }

  private async _get<T>(url: string): Promise<T> {
    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
    return response.json();
  }
}
