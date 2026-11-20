import { describe, it, expect, vi } from 'vitest';
import { renderAuthConfig } from './render-auth-config.js';
import { renderAgentForm } from './render-agent-form.js';
import { renderA2AForm } from './render-a2a-form.js';
import { renderMcpForm } from './render-mcp-form.js';
import { renderSequenceForm } from './render-sequence-form.js';
import { renderUnknownForm } from './render-unknown-form.js';

function flatStrings(result: { strings: TemplateStringsArray; values: unknown[] }): string {
  const parts: string[] = [];
  for (let i = 0; i < result.strings.length; i++) {
    parts.push(result.strings[i]);
    if (i < result.values.length) {
      const v = result.values[i];
      if (v && typeof v === 'object' && 'strings' in v) {
        parts.push(flatStrings(v as any));
      } else if (typeof v === 'string') {
        parts.push(v);
      }
    }
  }
  return parts.join('');
}

describe('renderAuthConfig', () => {
  it('renders with undefined auth', () => {
    const result = renderAuthConfig(undefined, vi.fn());
    expect(result).toBeDefined();
    const text = flatStrings(result as any);
    expect(text).toContain('select');
  });

  it('renders tokenConfigKey when type is bearer', () => {
    const result = renderAuthConfig({ type: 'bearer', tokenConfigKey: 'my.key' }, vi.fn());
    const text = flatStrings(result as any);
    expect(text).toContain('input');
  });

  it('hides tokenConfigKey when type is none', () => {
    const result = renderAuthConfig({ type: 'none' }, vi.fn());
    expect(result).toBeDefined();
  });
});

describe('renderAgentForm', () => {
  const agentData = {
    systemPrompt: 'Be helpful',
    inputProjection: '.',
    outputProjection: '.',
    model: { openai: { modelName: 'gpt-4' } },
  };

  it('renders without error', () => {
    const result = renderAgentForm(agentData, false, vi.fn(), vi.fn());
    expect(result).toBeDefined();
  });

  it('renders provider selector', () => {
    const result = renderAgentForm(agentData, false, vi.fn(), vi.fn());
    const text = flatStrings(result as any);
    expect(text).toContain('select');
  });

  it('renders systemPrompt textarea', () => {
    const result = renderAgentForm(agentData, false, vi.fn(), vi.fn());
    const text = flatStrings(result as any);
    expect(text).toContain('textarea');
  });
});

describe('renderA2AForm', () => {
  it('renders endpoint input', () => {
    const result = renderA2AForm({ endpoint: 'https://example.com' }, false, vi.fn());
    expect(result).toBeDefined();
    const text = flatStrings(result as any);
    expect(text).toContain('input');
  });

  it('renders streaming checkbox', () => {
    const result = renderA2AForm({ endpoint: '', streaming: true }, false, vi.fn());
    const text = flatStrings(result as any);
    expect(text).toContain('checkbox');
  });
});

describe('renderMcpForm', () => {
  it('renders for stdio transport', () => {
    const result = renderMcpForm({ command: ['/bin/tool'] }, false, vi.fn(), vi.fn());
    expect(result).toBeDefined();
  });

  it('renders for http transport', () => {
    const result = renderMcpForm({ url: 'https://example.com' }, false, vi.fn(), vi.fn());
    expect(result).toBeDefined();
  });

  it('renders for malformed transport', () => {
    const result = renderMcpForm({}, false, vi.fn(), vi.fn());
    expect(result).toBeDefined();
  });
});

describe('renderSequenceForm', () => {
  it('renders sequence items', () => {
    const result = renderSequenceForm(['worker-a', 'worker-b'], false, vi.fn(), ['worker-a', 'worker-b', 'worker-c']);
    expect(result).toBeDefined();
  });

  it('renders empty sequence', () => {
    const result = renderSequenceForm([], false, vi.fn(), ['worker-a']);
    expect(result).toBeDefined();
  });
});

describe('renderUnknownForm', () => {
  it('renders JSON with warning', () => {
    const result = renderUnknownForm({ grpc: { endpoint: 'localhost' } });
    expect(result).toBeDefined();
    const text = flatStrings(result as any);
    expect(text).toContain('pre');
    expect(text).toContain('Unrecognised');
  });
});
