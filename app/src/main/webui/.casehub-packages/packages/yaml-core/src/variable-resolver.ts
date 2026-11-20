import type { DeferredPrefixHandler, ObjectVariableSource, VariableSource, YamlModuleParameter } from './types.js';
import { chainSources, drillFields, UnresolvedVariableError } from './types.js';

const VAR_PATTERN = /\$\{([^}]+)}/g;

export class VariableResolver {
  private readonly prefixSources: Record<string, VariableSource>;
  private readonly objectSources: Record<string, ObjectVariableSource>;
  private readonly deferredPrefixes: Set<string>;
  private readonly deferredPrefixHandler: DeferredPrefixHandler | null;

  constructor(
    prefixSources: Record<string, VariableSource>,
    deferredPrefixes: Set<string>,
    deferredPrefixHandler: DeferredPrefixHandler | null = null,
    objectSources: Record<string, ObjectVariableSource> = {},
  ) {
    this.prefixSources = { ...prefixSources };
    this.objectSources = { ...objectSources };
    this.deferredPrefixes = new Set(deferredPrefixes);
    this.deferredPrefixHandler = deferredPrefixHandler;
  }

  static forParams(
    declared: Record<string, Pick<YamlModuleParameter, 'defaultValue'>>,
    callerParams: Record<string, string>,
    deferredPrefixes: Set<string>,
  ): VariableResolver {
    const defaults: Record<string, string> = {};
    for (const [key, param] of Object.entries(declared)) {
      if (param.defaultValue !== undefined) {
        defaults[key] = param.defaultValue;
      }
    }
    const paramSource: VariableSource = chainSources(
      (name) => callerParams[name],
      (name) => defaults[name],
    );
    return new VariableResolver(
      { params: paramSource, var: paramSource },
      deferredPrefixes,
    );
  }

  sourceFor(prefix: string): VariableSource | undefined {
    return this.prefixSources[prefix];
  }

  withScope(prefix: string, source: VariableSource): VariableResolver {
    const newSources = { ...this.prefixSources, [prefix]: source };
    return new VariableResolver(newSources, this.deferredPrefixes, this.deferredPrefixHandler, this.objectSources);
  }

  withObjectScope(prefix: string, source: ObjectVariableSource): VariableResolver {
    const newObjSources = { ...this.objectSources, [prefix]: source };
    return new VariableResolver(this.prefixSources, this.deferredPrefixes, this.deferredPrefixHandler, newObjSources);
  }

  withChainedScope(prefix: string, source: VariableSource): VariableResolver {
    const existing = this.prefixSources[prefix];
    const chained = existing ? chainSources(source, existing) : source;
    const newSources = { ...this.prefixSources, [prefix]: chained };
    return new VariableResolver(newSources, this.deferredPrefixes, this.deferredPrefixHandler, this.objectSources);
  }

  withDeferredPrefixHandler(handler: DeferredPrefixHandler): VariableResolver {
    return new VariableResolver(this.prefixSources, this.deferredPrefixes, handler, this.objectSources);
  }

  resolve(value: unknown): unknown {
    if (typeof value === 'string') {
      if (!value.includes('${')) return value;
      const objResult = this.resolveObjectValue(value, '<root>');
      if (objResult !== undefined) return objResult;
      return this.resolveString(value, '<root>');
    }
    if (Array.isArray(value)) return this.resolveList(value, '<root>');
    if (value !== null && typeof value === 'object') {
      return this.resolveMap(value as Record<string, unknown>, '<root>');
    }
    return value;
  }

  private resolveObjectValue(template: string, _elementContext: string): unknown {
    const wholeVarMatch = /^\s*\$\{([^}]+)}\s*$/.exec(template);
    if (!wholeVarMatch) return undefined;
    const key = wholeVarMatch[1]!;
    const dot = key.indexOf('.');
    if (dot < 0) return undefined;
    const prefix = key.substring(0, dot);
    const name = key.substring(dot + 1);
    const defaultSep = name.indexOf(':-');
    const actualName = defaultSep >= 0 ? name.substring(0, defaultSep) : name;
    const objSource = this.objectSources[prefix];
    if (!objSource) return undefined;
    const resolved = objSource.resolve(actualName);
    if (resolved === undefined) return undefined;
    if (!objSource.allowContainerReturn() && resolved !== null && typeof resolved === 'object') {
      if (!Array.isArray(resolved)) {
        const remaining = actualName;
        const drillDot = remaining.indexOf('.');
        if (drillDot >= 0) {
          return drillFields(resolved as Record<string, unknown>, remaining.substring(drillDot + 1));
        }
      }
    }
    return resolved;
  }

  resolveString(template: string, elementContext: string): string {
    return template.replace(VAR_PATTERN, (match, key: string) => {
      const resolved = this.lookupVariable(key, elementContext);
      return resolved === null ? match : resolved;
    });
  }

  resolveMap(input: Record<string, unknown>, elementContext: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input)) {
      if (typeof val === 'string' && val.includes('${')) {
        const objResult = this.resolveObjectValue(val, elementContext);
        result[key] = objResult !== undefined ? objResult : this.resolveString(val, elementContext);
      } else if (Array.isArray(val)) {
        result[key] = this.resolveList(val, elementContext);
      } else if (val !== null && typeof val === 'object') {
        result[key] = this.resolveMap(val as Record<string, unknown>, elementContext);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  resolveList(input: unknown[], elementContext: string): unknown[] {
    return input.map((item) => {
      if (typeof item === 'string' && item.includes('${')) {
        const objResult = this.resolveObjectValue(item, elementContext);
        return objResult !== undefined ? objResult : this.resolveString(item, elementContext);
      }
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        return this.resolveMap(item as Record<string, unknown>, elementContext);
      }
      return item;
    });
  }

  private lookupVariable(key: string, elementContext: string): string | null {
    const dot = key.indexOf('.');
    if (dot < 0) {
      throw new UnresolvedVariableError(key, elementContext,
        `Bare variable '\${${key}}' has no prefix — use '\${prefix.${key}}' format.`);
    }

    const prefix = key.substring(0, dot);
    const nameWithDefault = key.substring(dot + 1);

    let name: string;
    let defaultValue: string | undefined;
    const defaultSep = nameWithDefault.indexOf(':-');
    if (defaultSep >= 0) {
      name = nameWithDefault.substring(0, defaultSep);
      defaultValue = nameWithDefault.substring(defaultSep + 2);
    } else {
      name = nameWithDefault;
      defaultValue = undefined;
    }

    if (this.deferredPrefixes.has(prefix)) {
      if (this.deferredPrefixHandler) {
        this.deferredPrefixHandler(prefix, key, elementContext);
      }
      return null;
    }

    const source = this.prefixSources[prefix];
    if (source) {
      const value = source(name);
      if (value !== undefined) return value;
    }

    const objSource = this.objectSources[prefix];
    if (objSource) {
      const objValue = objSource.resolve(name);
      if (objValue !== undefined) {
        if (typeof objValue === 'string') return objValue;
        if (!objSource.allowContainerReturn() && objValue !== null && typeof objValue === 'object' && !Array.isArray(objValue)) {
          const drilled = drillFields(objValue as Record<string, unknown>, name);
          return drilled !== undefined ? String(drilled) : null;
        }
        return String(objValue);
      }
    }

    if (source || objSource) {
      if (defaultValue !== undefined) return defaultValue;
      throw new UnresolvedVariableError(key, elementContext,
        `Variable '${name}' not found in prefix '${prefix}'.`);
    }

    throw new UnresolvedVariableError(key, elementContext,
      `Unknown prefix '${prefix}'. Available prefixes: ${this.availablePrefixes()}.`);
  }

  private availablePrefixes(): string {
    const all = new Set([...Object.keys(this.prefixSources), ...this.deferredPrefixes]);
    return [...all].sort().join(', ');
  }
}
