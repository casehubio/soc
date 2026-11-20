import { describe, it, expect, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = resolve(__dirname, '..', 'dist', 'server-node.bundle.cjs');

function sendMessage(proc: ChildProcess, msg: Record<string, unknown>): void {
  const body = JSON.stringify(msg);
  const header = `Content-Length: ${body.length}\r\n\r\n`;
  proc.stdin!.write(header + body);
}

function readMessage(proc: ChildProcess, timeoutMs = 5000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('LSP read timeout')), timeoutMs);
    let header = '';
    let readingBody = false;
    let contentLength = 0;
    let body = '';

    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      if (!readingBody) {
        header += text;
        const headerEnd = header.indexOf('\r\n\r\n');
        if (headerEnd >= 0) {
          const match = header.match(/Content-Length: (\d+)/);
          if (!match) { clearTimeout(timer); reject(new Error('No Content-Length')); return; }
          contentLength = parseInt(match[1]!, 10);
          body = header.slice(headerEnd + 4);
          readingBody = true;
          if (body.length >= contentLength) {
            clearTimeout(timer);
            proc.stdout!.off('data', onData);
            resolve(JSON.parse(body.slice(0, contentLength)));
          }
        }
      } else {
        body += text;
        if (body.length >= contentLength) {
          clearTimeout(timer);
          proc.stdout!.off('data', onData);
          resolve(JSON.parse(body.slice(0, contentLength)));
        }
      }
    };
    proc.stdout!.on('data', onData);
  });
}

describe('server-node.bundle.cjs', () => {
  let proc: ChildProcess | undefined;

  afterEach(() => {
    if (proc) {
      proc.kill();
      proc = undefined;
    }
  });

  async function startServer(): Promise<ChildProcess> {
    proc = spawn('node', [BUNDLE_PATH, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
    sendMessage(proc, {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { processId: null, capabilities: {}, rootUri: null },
    });
    const init = await readMessage(proc);
    expect(init).toHaveProperty('result.capabilities');
    sendMessage(proc, { jsonrpc: '2.0', method: 'initialized', params: {} });
    return proc;
  }

  it('starts and completes initialize handshake', async () => {
    await startServer();
  });

  it('initialize response has LSP4IJ-compatible structure', async () => {
    proc = spawn('node', [BUNDLE_PATH, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
    sendMessage(proc, {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { processId: null, capabilities: {}, rootUri: null },
    });
    const init = await readMessage(proc) as { result: Record<string, unknown> };
    const caps = init.result.capabilities as Record<string, unknown>;
    const sync = caps.textDocumentSync as Record<string, unknown>;
    expect(sync).toHaveProperty('openClose', true);
    expect(sync).toHaveProperty('change');
    expect(caps).toHaveProperty('completionProvider');
    expect(caps).toHaveProperty('hoverProvider', true);
    expect(init.result).toHaveProperty('serverInfo');
  });

  it('returns completions for page YAML', async () => {
    const server = await startServer();
    const yaml = 'pages:\n  - components:\n      - type: bar-chart\n        ';
    sendMessage(server, {
      jsonrpc: '2.0', method: 'textDocument/didOpen',
      params: { textDocument: { uri: 'file:///test.page.yaml', languageId: 'yaml', version: 1, text: yaml } },
    });
    await readMessage(server); // diagnostics notification

    sendMessage(server, {
      jsonrpc: '2.0', id: 2, method: 'textDocument/completion',
      params: { textDocument: { uri: 'file:///test.page.yaml' }, position: { line: 3, character: 8 } },
    });
    const comp = await readMessage(server);
    expect(comp).toHaveProperty('result');
    const items = (comp as { result: Array<{ label: string }> }).result;
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map(i => i.label);
    expect(labels).toContain('- id');
  });

  it('publishes diagnostics on didOpen', async () => {
    const server = await startServer();
    const yaml = 'pages:\n  - components:\n      - type: bar-chart\n';
    sendMessage(server, {
      jsonrpc: '2.0', method: 'textDocument/didOpen',
      params: { textDocument: { uri: 'file:///test2.page.yaml', languageId: 'yaml', version: 1, text: yaml } },
    });
    const diag = await readMessage(server);
    expect(diag).toHaveProperty('method', 'textDocument/publishDiagnostics');
    expect(diag).toHaveProperty('params.uri', 'file:///test2.page.yaml');
    expect(diag).toHaveProperty('params.diagnostics');
  });

  it('returns hover for known property', async () => {
    const server = await startServer();
    const yaml = 'pages:\n  - components:\n      - type: bar-chart\n';
    sendMessage(server, {
      jsonrpc: '2.0', method: 'textDocument/didOpen',
      params: { textDocument: { uri: 'file:///hover.page.yaml', languageId: 'yaml', version: 1, text: yaml } },
    });
    await readMessage(server); // diagnostics

    sendMessage(server, {
      jsonrpc: '2.0', id: 3, method: 'textDocument/hover',
      params: { textDocument: { uri: 'file:///hover.page.yaml' }, position: { line: 2, character: 10 } },
    });
    const hover = await readMessage(server);
    expect(hover).toHaveProperty('result');
  });
});
