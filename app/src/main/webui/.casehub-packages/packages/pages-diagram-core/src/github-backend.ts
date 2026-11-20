import type { PersistenceBackend, ReadResult, WriteResult } from '@casehubio/graph-core';

export interface GitHubBackendConfig {
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  readonly branch?: string;
  readonly commitMessage?: string;
}

export class GitHubBackend implements PersistenceBackend {
  private readonly token: string;
  private readonly owner: string;
  private readonly repo: string;
  private readonly branch: string;
  private readonly commitMessage: string;

  constructor(config: GitHubBackendConfig) {
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch ?? 'main';
    this.commitMessage = config.commitMessage ?? 'Update document';
  }

  async read(uri: string): Promise<ReadResult> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${uri}?ref=${this.branch}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github.v3+json' },
    });

    if (res.status === 404) return { status: 'not_found', uri };
    if (!res.ok) throw new Error('GitHub API error: ' + String(res.status));

    const data = (await res.json()) as { content: string; sha: string };
    const yaml = atob(data.content.split(String.fromCharCode(10)).join(''));
    return { status: 'ok', yaml, version: data.sha };
  }

  async write(uri: string, yaml: string, expectedVersion: string): Promise<WriteResult> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${uri}`;
    const body: Record<string, unknown> = {
      message: this.commitMessage,
      content: btoa(yaml),
      branch: this.branch,
    };
    if (expectedVersion) body.sha = expectedVersion;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      const current = await fetch(`${url}?ref=${this.branch}`, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github.v3+json' },
      });
      const currentData = (await current.json()) as { sha: string };
      return { status: 'conflict', currentVersion: currentData.sha };
    }

    const data = (await res.json()) as { content: { sha: string } };
    return { status: 'ok', version: data.content.sha };
  }
}
