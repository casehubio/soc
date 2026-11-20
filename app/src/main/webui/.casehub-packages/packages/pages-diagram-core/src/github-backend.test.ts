import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubBackend } from './github-backend.js';

describe('GitHubBackend', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('reads a file via GitHub API', async () => {
    const yamlContent = btoa('name: test\n');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: yamlContent, sha: 'abc123' }), { status: 200 }),
    );

    const backend = new GitHubBackend({ token: 'tok', owner: 'org', repo: 'repo' });
    const result = await backend.read('path/file.yaml');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.yaml).toBe('name: test\n');
      expect(result.version).toBe('abc123');
    }
  });

  it('returns not_found for 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));

    const backend = new GitHubBackend({ token: 'tok', owner: 'org', repo: 'repo' });
    const result = await backend.read('missing.yaml');
    expect(result.status).toBe('not_found');
  });

  it('writes a file via GitHub API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: { sha: 'new-sha' } }), { status: 200 }),
    );

    const backend = new GitHubBackend({ token: 'tok', owner: 'org', repo: 'repo' });
    const result = await backend.write('path/file.yaml', 'name: updated\n', 'old-sha');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.version).toBe('new-sha');
    }
  });

  it('uses "Update document" as default commit message', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: { sha: 'sha' } }), { status: 200 }),
    );

    const backend = new GitHubBackend({ token: 'tok', owner: 'org', repo: 'repo' });
    await backend.write('f.yaml', 'content', '');

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.message).toBe('Update document');
  });

  it('detects conflict on 409', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'conflict-sha' }), { status: 200 }));

    const backend = new GitHubBackend({ token: 'tok', owner: 'org', repo: 'repo' });
    const result = await backend.write('f.yaml', 'content', 'old-sha');
    expect(result.status).toBe('conflict');
  });
});
