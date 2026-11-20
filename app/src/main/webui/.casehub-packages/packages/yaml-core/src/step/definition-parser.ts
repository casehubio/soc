import type { Parameter, Definition, DefinitionFile, InvokeBinding } from './types.js';
import { parseParameterType } from '../types.js';
import type { ParameterType } from '../types.js';
import { RUNTIME_PYTHON, RUNTIME_NODE } from './types.js';
import { inferPortability } from './portability.js';
import type { Portability } from './portability.js';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DefinitionParser {
  static parse(raw: Record<string, unknown>): DefinitionFile {
    const namespace = raw['namespace'] as string | undefined;
    const actionsRaw = raw['actions'] as Record<string, Record<string, unknown>> | undefined;
    if (!actionsRaw) throw new Error('Step definition file must have an actions map');

    const actions: Record<string, Definition> = {};
    for (const [name, actionRaw] of Object.entries(actionsRaw)) {
      actions[name] = DefinitionParser.parseAction(name, actionRaw);
    }
    return { ...(namespace !== undefined ? { namespace } : {}), actions };
  }

  static parseAction(name: string, raw: Record<string, unknown>): Definition {
    const description = raw['description'] as string | undefined;
    const inputs = DefinitionParser.parseParams(raw['inputs'] as Record<string, unknown> | undefined);
    const outputs = DefinitionParser.parseParams(raw['outputs'] as Record<string, unknown> | undefined);
    const invokeRaw = raw['invoke'] as Record<string, unknown> | undefined;
    const invoke = invokeRaw ? DefinitionParser.parseInvoke(invokeRaw) : undefined;

    const VALID_PORTABILITY = new Set(['universal', 'java', 'ts', 'both']);
    const portabilityRaw = raw['portability'] as string | undefined;
    let portability: Portability;
    if (portabilityRaw !== undefined) {
      if (!VALID_PORTABILITY.has(portabilityRaw)) {
        throw new Error(`Invalid portability '${portabilityRaw}' for action '${name}'. Must be one of: universal, java, ts, both`);
      }
      portability = portabilityRaw as Portability;
    } else {
      portability = inferPortability(invoke);
    }

    return { name, ...(description !== undefined ? { description } : {}), inputs, outputs, ...(invoke !== undefined ? { invoke } : {}), portability };
  }

  static parseParams(raw: Record<string, unknown> | undefined): Record<string, Parameter> {
    if (!raw) return {};
    const result: Record<string, Parameter> = {};
    for (const [name, paramRaw] of Object.entries(raw)) {
      if (typeof paramRaw === 'string') {
        result[name] = { type: parseParameterType(paramRaw), required: false };
      } else if (typeof paramRaw === 'object' && paramRaw !== null) {
        const p = paramRaw as Record<string, unknown>;
        const type: ParameterType = p['type'] ? parseParameterType(p['type'] as string) : 'STRING';
        const defaultValue = (p['defaultValue'] as string | undefined) ?? (p['default'] as string | undefined);
        const allowedValues = (p['allowedValues'] ?? p['enum']) as string[] | undefined;
        const format = p['format'] as string | undefined;
        const desc = p['description'] as string | undefined;
        result[name] = {
          type,
          required: p['required'] === true,
          ...(defaultValue !== undefined ? { defaultValue } : {}),
          ...(allowedValues !== undefined ? { allowedValues } : {}),
          ...(format !== undefined ? { format } : {}),
          ...(desc !== undefined ? { description: desc } : {}),
        };
      }
    }
    return result;
  }

  static parseInvoke(raw: Record<string, unknown>): InvokeBinding {
    if (raw['mcp']) {
      return { kind: 'mcp', tool: raw['mcp'] as string };
    }
    if (raw['python']) {
      const wd = (raw['workingDir'] ?? raw['working-dir']) as string | undefined;
      return {
        kind: 'script', runtime: RUNTIME_PYTHON, script: raw['python'] as string,
        timeout: (raw['timeout'] as string) ?? '30s', env: (raw['env'] as Record<string, string>) ?? {},
        ...(wd !== undefined ? { workingDir: wd } : {}),
      };
    }
    if (raw['node']) {
      const wd = (raw['workingDir'] ?? raw['working-dir']) as string | undefined;
      return {
        kind: 'script', runtime: RUNTIME_NODE, script: raw['node'] as string,
        timeout: (raw['timeout'] as string) ?? '30s', env: (raw['env'] as Record<string, string>) ?? {},
        ...(wd !== undefined ? { workingDir: wd } : {}),
      };
    }
    if (raw['script']) {
      const spec = raw['script'] as Record<string, unknown>;
      const wd = spec['workingDir'] as string | undefined;
      return {
        kind: 'script',
        runtime: spec['runtime'] as string,
        script: spec['script'] as string,
        timeout: (spec['timeout'] as string) ?? '30s',
        ...(wd !== undefined ? { workingDir: wd } : {}),
        env: (spec['env'] as Record<string, string>) ?? {},
      };
    }
    if (raw['graphql']) {
      return { kind: 'graphql', query: raw['graphql'] as string };
    }
    if (raw['rest']) {
      const spec = raw['rest'] as Record<string, unknown>;
      return {
        kind: 'rest',
        method: (spec['method'] as string) ?? 'GET',
        url: spec['url'] as string,
        headers: (spec['headers'] as Record<string, string>) ?? {},
        body: (spec['body'] as Record<string, string>) ?? {},
      };
    }
    if (raw['agent']) {
      const spec = raw['agent'] as Record<string, unknown>;
      const model = spec['model'] as string | undefined;
      const agentTimeout = spec['timeout'] as string | undefined;
      return {
        kind: 'agent',
        descriptor: spec['descriptor'] as string,
        ...(model !== undefined ? { model } : {}),
        ...(agentTimeout !== undefined ? { timeout: agentTimeout } : {}),
        structuredOutput: (spec['structuredOutput'] ?? spec['structured-output']) === true,
      };
    }
    if (raw['process']) {
      const spec = raw['process'] as Record<string, unknown>;
      const processTimeout = spec['timeout'] as string | undefined;
      const processWd = (spec['workingDir'] ?? spec['working-dir']) as string | undefined;
      return {
        kind: 'process',
        command: spec['command'] as string,
        args: (spec['args'] as string[]) ?? [],
        output: (spec['output'] as string) ?? 'json',
        ...(processTimeout !== undefined ? { timeout: processTimeout } : {}),
        env: (spec['env'] as Record<string, string>) ?? {},
        ...(processWd !== undefined ? { workingDir: processWd } : {}),
        onError: ((spec['onError'] ?? spec['on-error']) as string) ?? 'stderr',
      };
    }
    if (raw['aria']) {
      return { kind: 'aria', action: raw['aria'] as string };
    }
    if (raw['graphql-domain'] != null) {
      return { kind: 'graphql-domain' };
    }
    if (raw['simulated'] != null) {
      return { kind: 'simulated' };
    }
    if (raw['verify-simulation'] != null) {
      return { kind: 'verify-simulation' };
    }
    throw new Error(`Unknown invoke binding type. Expected one of: mcp, python, node, script, graphql, rest, agent, process, aria, graphql-domain, simulated, verify-simulation`);
  }
}
