import { describe, it, expect } from 'vitest';
import { detectFunctionType, detectMcpTransport, detectModelProvider, detectTriggerType, detectTargetType } from './detect.js';

describe('detectFunctionType', () => {
  it('detects agent', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], agent: { systemPrompt: '' } })).toBe('agent');
  });

  it('detects flow from do key', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], do: [] })).toBe('flow');
  });

  it('detects a2a', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], a2a: { endpoint: '' } })).toBe('a2a');
  });

  it('detects mcp', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], mcp: { command: [] } })).toBe('mcp');
  });

  it('detects sequence', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], sequence: ['a', 'b'] })).toBe('sequence');
  });

  it('returns external when no function key', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [] })).toBe('external');
  });

  it('returns unknown when unrecognised key present', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], grpc: { endpoint: '' } })).toBe('unknown');
  });

  it('first known key wins when multiple present', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], agent: {}, do: [] })).toBe('agent');
  });

  it('ignores core worker keys when checking for unknown', () => {
    expect(detectFunctionType({ name: 'w', capabilities: [], description: 'hi', executionPolicy: {} })).toBe('external');
  });
});

describe('detectMcpTransport', () => {
  it('detects stdio', () => {
    expect(detectMcpTransport({ command: ['/bin/tool'] })).toBe('stdio');
  });

  it('detects http', () => {
    expect(detectMcpTransport({ url: 'https://example.com' })).toBe('http');
  });

  it('returns null for malformed config', () => {
    expect(detectMcpTransport({})).toBeNull();
  });
});

describe('detectModelProvider', () => {
  it('detects openai', () => {
    expect(detectModelProvider({ openai: { modelName: 'gpt-4' } })).toBe('openai');
  });

  it('detects anthropic', () => {
    expect(detectModelProvider({ anthropic: { modelName: 'claude-3' } })).toBe('anthropic');
  });

  it('detects ollama', () => {
    expect(detectModelProvider({ ollama: { modelName: 'llama3' } })).toBe('ollama');
  });

  it('detects mistralAi', () => {
    expect(detectModelProvider({ mistralAi: { modelName: 'mistral-large' } })).toBe('mistralAi');
  });

  it('detects googleAiGemini', () => {
    expect(detectModelProvider({ googleAiGemini: { modelName: 'gemini-pro' } })).toBe('googleAiGemini');
  });

  it('returns null for empty model', () => {
    expect(detectModelProvider({})).toBeNull();
  });
});

describe('detectTriggerType', () => {
  it('detects contextChange', () => {
    expect(detectTriggerType({ contextChange: { filter: '.x' } })).toBe('contextChange');
  });

  it('detects cloudEvent', () => {
    expect(detectTriggerType({ cloudEvent: 'event.type' })).toBe('cloudEvent');
  });

  it('detects schedule', () => {
    expect(detectTriggerType({ schedule: { cron: '*/5 * * * *' } })).toBe('schedule');
  });

  it('detects scopeActivated', () => {
    expect(detectTriggerType({ scopeActivated: {} })).toBe('scopeActivated');
  });

  it('returns null for empty object', () => {
    expect(detectTriggerType({})).toBeNull();
  });

  it('returns null for unrecognised key', () => {
    expect(detectTriggerType({ customTrigger: {} })).toBeNull();
  });
});

describe('detectTargetType', () => {
  it('returns capability when capability key present', () => {
    expect(detectTargetType({ capability: 'ocr' })).toBe('capability');
  });
  it('returns subCase when subCase key present', () => {
    expect(detectTargetType({ subCase: { namespace: 'test', name: 'sub' } })).toBe('subCase');
  });
  it('returns humanTask when humanTask key present', () => {
    expect(detectTargetType({ humanTask: { title: 'Review' } })).toBe('humanTask');
  });
  it('defaults to capability when no target key present', () => {
    expect(detectTargetType({ name: 'b1' })).toBe('capability');
  });
});
