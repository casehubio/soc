import { describe, it, expect } from 'vitest';
import { InMemoryBackend } from './persistence.js';
import type { PersistenceBackend } from './persistence.js';

describe('InMemoryBackend', () => {
  it('implements PersistenceBackend', () => {
    const backend: PersistenceBackend = new InMemoryBackend();
    expect(backend.read).toBeDefined();
    expect(backend.write).toBeDefined();
  });

  it('returns not_found for unknown URI', async () => {
    const backend = new InMemoryBackend();
    const result = await backend.read('unknown://doc');
    expect(result.status).toBe('not_found');
    if (result.status === 'not_found') {
      expect(result.uri).toBe('unknown://doc');
    }
  });

  it('writes and reads back', async () => {
    const backend = new InMemoryBackend();
    const writeResult = await backend.write('doc://test', 'name: hello', '');
    expect(writeResult.status).toBe('ok');

    const readResult = await backend.read('doc://test');
    expect(readResult.status).toBe('ok');
    if (readResult.status === 'ok') {
      expect(readResult.yaml).toBe('name: hello');
      expect(readResult.version).toBeDefined();
    }
  });

  it('returns new version on successful write', async () => {
    const backend = new InMemoryBackend();
    const w1 = await backend.write('doc://test', 'v1', '');
    expect(w1.status).toBe('ok');
    if (w1.status === 'ok') {
      expect(w1.version).toBeTruthy();
    }
  });

  it('returns conflict on version mismatch', async () => {
    const backend = new InMemoryBackend();
    await backend.write('doc://test', 'v1', '');
    const result = await backend.write('doc://test', 'v2', 'wrong-version');
    expect(result.status).toBe('conflict');
    if (result.status === 'conflict') {
      expect(result.currentVersion).toBeDefined();
    }
  });

  it('succeeds write with correct version', async () => {
    const backend = new InMemoryBackend();
    const w1 = await backend.write('doc://test', 'v1', '');
    if (w1.status !== 'ok') throw new Error('setup failed');

    const w2 = await backend.write('doc://test', 'v2', w1.version);
    expect(w2.status).toBe('ok');

    const readResult = await backend.read('doc://test');
    if (readResult.status !== 'ok') throw new Error('read failed');
    expect(readResult.yaml).toBe('v2');
  });

  it('version increments on each write', async () => {
    const backend = new InMemoryBackend();
    const w1 = await backend.write('doc://test', 'v1', '');
    if (w1.status !== 'ok') throw new Error('setup failed');
    const w2 = await backend.write('doc://test', 'v2', w1.version);
    if (w2.status !== 'ok') throw new Error('setup failed');
    expect(w1.version).not.toBe(w2.version);
  });

  it('handles multiple URIs independently', async () => {
    const backend = new InMemoryBackend();
    await backend.write('doc://a', 'content-a', '');
    await backend.write('doc://b', 'content-b', '');

    const a = await backend.read('doc://a');
    const b = await backend.read('doc://b');
    if (a.status !== 'ok' || b.status !== 'ok') throw new Error('read failed');
    expect(a.yaml).toBe('content-a');
    expect(b.yaml).toBe('content-b');
  });

  it('first write with empty expectedVersion always succeeds', async () => {
    const backend = new InMemoryBackend();
    const result = await backend.write('doc://new', 'content', '');
    expect(result.status).toBe('ok');
  });

  it('ReadResult is exhaustively matchable', async () => {
    const backend = new InMemoryBackend();
    const result = await backend.read('doc://test');
    switch (result.status) {
      case 'ok':
        expect(result.yaml).toBeDefined();
        break;
      case 'not_found':
        expect(result.uri).toBeDefined();
        break;
      case 'parse_error':
        expect(result.message).toBeDefined();
        break;
      case 'schema_error':
        expect(result.errors).toBeDefined();
        break;
    }
  });
});
