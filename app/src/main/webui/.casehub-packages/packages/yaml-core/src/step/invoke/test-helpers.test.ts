import { describe, it, expect } from 'vitest';
import {
  createMockRestHandler, createMockMcpHandler, createMockGraphqlHandler,
  createMockScriptHandler, createMockAgentHandler, createMockProcessHandler,
  createMockInvokeHandlers,
  MOCK_REST_RESPONSES, MOCK_MCP_RESPONSES, MOCK_GQL_RESPONSES,
} from './test-helpers.js';
import type {
  RestBinding, McpBinding, GraphqlBinding, ScriptBinding, AgentBinding, ProcessBinding,
} from '../types.js';

const EMPTY_DEFINITION = { name: 'test', inputs: {}, outputs: {} };
const NO_SERVICES = undefined as never;

describe('mock invoke test helpers', () => {
  describe('createMockRestHandler', () => {
    it('returns success with matching mock response', async () => {
      const handler = createMockRestHandler();
      const binding: RestBinding = { kind: 'rest', method: 'GET', url: '/api/users', headers: {}, body: {} };
      expect(handler.supports(binding)).toBe(true);
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toEqual(MOCK_REST_RESPONSES['GET /api/users']);
      }
    });

    it('returns empty object for unmatched route', async () => {
      const handler = createMockRestHandler();
      const binding: RestBinding = { kind: 'rest', method: 'DELETE', url: '/unknown', headers: {}, body: {} };
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toEqual({});
      }
    });

    it('accepts custom responses', async () => {
      const handler = createMockRestHandler({ 'PUT /api/item': { updated: true } });
      const binding: RestBinding = { kind: 'rest', method: 'PUT', url: '/api/item', headers: {}, body: {} };
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toEqual({ updated: true });
      }
    });
  });

  describe('createMockMcpHandler', () => {
    it('returns success with matching tool response', async () => {
      const handler = createMockMcpHandler();
      const binding: McpBinding = { kind: 'mcp', tool: 'file_search' };
      expect(handler.supports(binding)).toBe(true);
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toEqual(MOCK_MCP_RESPONSES['file_search']);
      }
    });

    it('returns empty object for unknown tool', async () => {
      const handler = createMockMcpHandler();
      const binding: McpBinding = { kind: 'mcp', tool: 'unknown_tool' };
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toEqual({});
      }
    });
  });

  describe('createMockGraphqlHandler', () => {
    it('returns query response for non-mutation', async () => {
      const handler = createMockGraphqlHandler();
      const binding: GraphqlBinding = { kind: 'graphql', query: '{ users { id name } }' };
      expect(handler.supports(binding)).toBe(true);
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toEqual(MOCK_GQL_RESPONSES['query']);
      }
    });

    it('returns mutation response for mutations', async () => {
      const handler = createMockGraphqlHandler();
      const binding: GraphqlBinding = { kind: 'graphql', query: 'mutation { createUser(name: "Alice") { id } }' };
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toEqual(MOCK_GQL_RESPONSES['mutation']);
      }
    });
  });

  describe('createMockScriptHandler', () => {
    it('returns success with parsed JSON output', async () => {
      const handler = createMockScriptHandler();
      const binding: ScriptBinding = { kind: 'script', runtime: 'python3', script: 'print("hi")', timeout: '30s', env: {} };
      expect(handler.supports(binding)).toBe(true);
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toHaveProperty('status');
      }
    });

    it('returns node output for node runtime', async () => {
      const handler = createMockScriptHandler();
      const binding: ScriptBinding = { kind: 'script', runtime: 'node', script: 'console.log(1)', timeout: '10s', env: {} };
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toHaveProperty('valid');
      }
    });
  });

  describe('createMockAgentHandler', () => {
    it('returns summarizer output for summarizer descriptor', async () => {
      const handler = createMockAgentHandler();
      const binding: AgentBinding = { kind: 'agent', descriptor: 'summarizer', structuredOutput: true };
      expect(handler.supports(binding)).toBe(true);
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toHaveProperty('summary');
        expect(result.output).toHaveProperty('tokens');
      }
    });

    it('returns code-gen output for other descriptors', async () => {
      const handler = createMockAgentHandler();
      const binding: AgentBinding = { kind: 'agent', descriptor: 'code-gen', structuredOutput: true };
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toHaveProperty('code');
        expect(result.output).toHaveProperty('language');
      }
    });
  });

  describe('createMockProcessHandler', () => {
    it('returns ls output for ls command', async () => {
      const handler = createMockProcessHandler();
      const binding: ProcessBinding = { kind: 'process', command: 'ls', args: ['-la'], output: 'stdout', env: {}, onError: 'stderr' };
      expect(handler.supports(binding)).toBe(true);
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toHaveProperty('stdout');
        expect(result.output).toHaveProperty('exitCode', 0);
      }
    });

    it('returns git output for git command', async () => {
      const handler = createMockProcessHandler();
      const binding: ProcessBinding = { kind: 'process', command: 'git', args: ['status'], output: 'stdout', env: {}, onError: 'stderr' };
      const action = handler.create(EMPTY_DEFINITION, binding);
      const result = await action.execute({}, NO_SERVICES);
      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.output).toHaveProperty('stdout');
      }
    });
  });

  describe('createMockInvokeHandlers', () => {
    it('returns all six handler types', () => {
      const handlers = createMockInvokeHandlers();
      expect(handlers).toHaveLength(6);
    });

    it('each handler supports its binding kind', () => {
      const handlers = createMockInvokeHandlers();
      const bindings = [
        { kind: 'rest' as const, method: 'GET', url: '/', headers: {}, body: {} },
        { kind: 'mcp' as const, tool: 't' },
        { kind: 'graphql' as const, query: 'q' },
        { kind: 'script' as const, runtime: 'node', script: '', timeout: '1s', env: {} },
        { kind: 'agent' as const, descriptor: 'a', structuredOutput: false },
        { kind: 'process' as const, command: 'echo', args: [], output: 'stdout', env: {}, onError: 'stderr' },
      ];
      for (const binding of bindings) {
        const supporting = handlers.filter(h => h.supports(binding));
        expect(supporting).toHaveLength(1);
      }
    });
  });
});
