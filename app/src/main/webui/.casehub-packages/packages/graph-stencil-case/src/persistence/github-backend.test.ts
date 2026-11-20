import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubBackend } from './github-backend.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

const config = { token: 'ghp_test', owner: 'org', repo: 'repo', branch: 'main' };

describe('GitHubBackend', () => {
  let backend: GitHubBackend;

  beforeEach(() => {
    mockFetch.mockReset();
    backend = new GitHubBackend(config);
  });

  describe('read', () => {
    it('returns ok with decoded content and sha as version', async () => {
      const content = btoa('dsl: "1.0.0"\nname: test\n');
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { content, sha: 'abc123' }));
      const result = await backend.read('cases/test.yaml');
      expect(result).toEqual({ status: 'ok', yaml: 'dsl: "1.0.0"\nname: test\n', version: 'abc123' });
    });

    it('returns not_found on 404', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(404, { message: 'Not Found' }));
      const result = await backend.read('cases/missing.yaml');
      expect(result).toEqual({ status: 'not_found', uri: 'cases/missing.yaml' });
    });

    it('sends correct authorization header', async () => {
      const content = btoa('test');
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { content, sha: 's1' }));
      await backend.read('f.yaml');
      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer ghp_test');
    });

    it('includes branch in query param', async () => {
      const content = btoa('test');
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { content, sha: 's1' }));
      await backend.read('f.yaml');
      expect(mockFetch.mock.calls[0][0]).toContain('?ref=main');
    });
  });

  describe('write', () => {
    it('returns ok with new sha on success', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { content: { sha: 'def456' } }));
      const result = await backend.write('cases/test.yaml', 'dsl: "1.0.0"\n', 'abc123');
      expect(result).toEqual({ status: 'ok', version: 'def456' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.sha).toBe('abc123');
    });

    it('returns conflict on 409 after fetching current sha', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(409, { message: 'conflict' }));
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { sha: 'current789' }));
      const result = await backend.write('cases/test.yaml', 'dsl: "1.0.0"\n', 'stale');
      expect(result).toEqual({ status: 'conflict', currentVersion: 'current789' });
    });

    it('omits sha for new file creation when expectedVersion is empty', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(201, { content: { sha: 'new123' } }));
      const result = await backend.write('cases/new.yaml', 'dsl: "1.0.0"\n', '');
      expect(result).toEqual({ status: 'ok', version: 'new123' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.sha).toBeUndefined();
    });

    it('sends base64 encoded content', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { content: { sha: 's1' } }));
      await backend.write('f.yaml', 'hello\n', 'v1');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(atob(body.content)).toBe('hello\n');
    });

    it('uses PUT method', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(200, { content: { sha: 's1' } }));
      await backend.write('f.yaml', 'test', 'v1');
      expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    });
  });
});
