import type { InvokeHandler } from './invoke-handler.js';
import type { Action, Result } from '../walker.js';
import { stepSuccess } from '../walker.js';
import type {
  Definition, InvokeBinding, RestBinding, McpBinding, GraphqlBinding,
  ScriptBinding, AgentBinding, ProcessBinding,
} from '../types.js';

export const MOCK_REST_RESPONSES: Record<string, Record<string, unknown>> = {
  'GET /api/users': { status: 200, body: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] },
  'POST /api/orders': { status: 201, body: { orderId: 'ORD-4782', item: 'widget', qty: 5 } },
};

export const MOCK_MCP_RESPONSES: Record<string, Record<string, unknown>> = {
  'file_search': { results: [{ file: 'src/auth/handler.ts', score: 0.94 }, { file: 'src/auth/middleware.ts', score: 0.87 }] },
  'code_review': { findings: [{ severity: 'warning', message: 'Token expiry not validated', line: 42 }] },
};

export const MOCK_GQL_RESPONSES: Record<string, Record<string, unknown>> = {
  'query': { data: { users: [{ id: '1', name: 'Alice', email: 'alice@example.com' }, { id: '2', name: 'Bob', email: 'bob@example.com' }] } },
  'mutation': { data: { createUser: { id: '3' } } },
};

const MOCK_SCRIPT_RESPONSES: Record<string, Record<string, unknown>> = {
  'python3': { status: 'ok' },
  'node': { valid: true },
};

const MOCK_AGENT_RESPONSES: Record<string, Record<string, unknown>> = {
  'summarizer': { summary: 'Document discusses key architectural decisions...', tokens: 47 },
  '_default': { code: 'app.get("/users", handler)', language: 'typescript', lines: 42 },
};

const MOCK_PROCESS_RESPONSES: Record<string, { stdout: string; exitCode: number }> = {
  'ls': { stdout: 'total 48\ndrwxr-xr-x  6 user staff  192 Sep 28 auth/\ndrwxr-xr-x  4 user staff  128 Sep 28 api/', exitCode: 0 },
  'git': { stdout: ' M src/auth.ts\n?? src/new-feature.ts', exitCode: 0 },
};

class MockRestInvokeHandler implements InvokeHandler {
  constructor(private readonly responses: Record<string, Record<string, unknown>>) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'rest'; }

  create(_definition: Definition, binding: InvokeBinding): Action {
    const { method, url } = binding as RestBinding;
    const responses = this.responses;
    return {
      async execute(): Promise<Result> {
        return stepSuccess(responses[`${method} ${url}`] ?? {});
      },
    };
  }
}

class MockMcpInvokeHandler implements InvokeHandler {
  constructor(private readonly responses: Record<string, Record<string, unknown>>) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'mcp'; }

  create(_definition: Definition, binding: InvokeBinding): Action {
    const { tool } = binding as McpBinding;
    const responses = this.responses;
    return {
      async execute(): Promise<Result> {
        return stepSuccess(responses[tool] ?? {});
      },
    };
  }
}

class MockGraphqlInvokeHandler implements InvokeHandler {
  constructor(private readonly responses: Record<string, Record<string, unknown>>) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'graphql'; }

  create(_definition: Definition, binding: InvokeBinding): Action {
    const { query } = binding as GraphqlBinding;
    const responses = this.responses;
    return {
      async execute(): Promise<Result> {
        const key = query.trimStart().startsWith('mutation') ? 'mutation' : 'query';
        return stepSuccess(responses[key] ?? {});
      },
    };
  }
}

class MockScriptInvokeHandler implements InvokeHandler {
  constructor(private readonly responses: Record<string, Record<string, unknown>>) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'script'; }

  create(_definition: Definition, binding: InvokeBinding): Action {
    const { runtime } = binding as ScriptBinding;
    const responses = this.responses;
    return {
      async execute(): Promise<Result> {
        return stepSuccess(responses[runtime] ?? {});
      },
    };
  }
}

class MockAgentInvokeHandler implements InvokeHandler {
  constructor(private readonly responses: Record<string, Record<string, unknown>>) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'agent'; }

  create(_definition: Definition, binding: InvokeBinding): Action {
    const { descriptor } = binding as AgentBinding;
    const responses = this.responses;
    return {
      async execute(): Promise<Result> {
        return stepSuccess(responses[descriptor] ?? responses['_default'] ?? {});
      },
    };
  }
}

class MockProcessInvokeHandler implements InvokeHandler {
  constructor(private readonly responses: Record<string, { stdout: string; exitCode: number }>) {}

  supports(binding: InvokeBinding): boolean { return binding.kind === 'process'; }

  create(_definition: Definition, binding: InvokeBinding): Action {
    const { command } = binding as ProcessBinding;
    const responses = this.responses;
    return {
      async execute(): Promise<Result> {
        const r = responses[command] ?? { stdout: '', exitCode: 0 };
        return stepSuccess({ stdout: r.stdout, exitCode: r.exitCode });
      },
    };
  }
}

export function createMockRestHandler(
  responses: Record<string, Record<string, unknown>> = MOCK_REST_RESPONSES,
): InvokeHandler {
  return new MockRestInvokeHandler(responses);
}

export function createMockMcpHandler(
  responses: Record<string, Record<string, unknown>> = MOCK_MCP_RESPONSES,
): InvokeHandler {
  return new MockMcpInvokeHandler(responses);
}

export function createMockGraphqlHandler(
  responses: Record<string, Record<string, unknown>> = MOCK_GQL_RESPONSES,
): InvokeHandler {
  return new MockGraphqlInvokeHandler(responses);
}

export function createMockScriptHandler(
  responses: Record<string, Record<string, unknown>> = MOCK_SCRIPT_RESPONSES,
): InvokeHandler {
  return new MockScriptInvokeHandler(responses);
}

export function createMockAgentHandler(
  responses: Record<string, Record<string, unknown>> = MOCK_AGENT_RESPONSES,
): InvokeHandler {
  return new MockAgentInvokeHandler(responses);
}

export function createMockProcessHandler(
  responses: Record<string, { stdout: string; exitCode: number }> = MOCK_PROCESS_RESPONSES,
): InvokeHandler {
  return new MockProcessInvokeHandler(responses);
}

export function createMockInvokeHandlers(): InvokeHandler[] {
  return [
    createMockRestHandler(),
    createMockMcpHandler(),
    createMockGraphqlHandler(),
    createMockScriptHandler(),
    createMockAgentHandler(),
    createMockProcessHandler(),
  ];
}
