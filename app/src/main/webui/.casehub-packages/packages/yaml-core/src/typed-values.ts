export type ValueType = 'STRING' | 'INTEGER' | 'NUMBER' | 'BOOLEAN';

const VALID_TYPES = new Set<string>(['STRING', 'INTEGER', 'NUMBER', 'BOOLEAN']);

export interface TypedSchema {
  typeOf(name: string): ValueType | undefined;
  schema(): Record<string, ValueType>;
}

export interface TypedEntry {
  type: ValueType;
  value: unknown;
}

export class TypedName {
  private constructor(
    readonly name: string,
    readonly type: ValueType,
  ) {}

  static parse(input: string): TypedName {
    const colon = input.indexOf(':');
    if (colon < 0) {
      return new TypedName(input.trim(), 'STRING');
    }
    const name = input.substring(0, colon).trim();
    const rawType = input.substring(colon + 1).trim().toUpperCase();
    if (!VALID_TYPES.has(rawType)) {
      throw new Error(`Unknown ValueType '${rawType}' in typed name '${input}'`);
    }
    return new TypedName(name, rawType as ValueType);
  }
}

export class TypedMap implements TypedSchema {
  private constructor(
    private readonly entries: Record<string, TypedEntry>,
  ) {}

  static fromEntries(entries: Record<string, TypedEntry>): TypedMap {
    return new TypedMap(entries);
  }

  typeOf(name: string): ValueType | undefined {
    return this.entries[name]?.type;
  }

  value(name: string): unknown {
    return this.entries[name]?.value;
  }

  schema(): Record<string, ValueType> {
    const result: Record<string, ValueType> = {};
    for (const [name, entry] of Object.entries(this.entries)) {
      result[name] = entry.type;
    }
    return result;
  }
}

function coerceValue(type: ValueType, raw: string): unknown {
  switch (type) {
    case 'STRING': return raw;
    case 'INTEGER': {
      const n = parseInt(raw, 10);
      if (isNaN(n)) throw new Error(`Cannot parse '${raw}' as INTEGER`);
      return n;
    }
    case 'NUMBER': {
      const n = parseFloat(raw);
      if (isNaN(n)) throw new Error(`Cannot parse '${raw}' as NUMBER`);
      return n;
    }
    case 'BOOLEAN': {
      const lower = raw.toLowerCase();
      if (['true', 'yes', 'on', 'y', '1'].includes(lower)) return true;
      if (['false', 'no', 'off', 'n', '0'].includes(lower)) return false;
      throw new Error(`Cannot parse '${raw}' as BOOLEAN`);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Preserve the published static facade.
export class TypedVariables {
  static parse(declarations: Record<string, string>): TypedMap {
    const entries: Record<string, TypedEntry> = {};
    for (const [key, raw] of Object.entries(declarations)) {
      const typed = TypedName.parse(key);
      entries[typed.name] = {
        type: typed.type,
        value: coerceValue(typed.type, raw),
      };
    }
    return TypedMap.fromEntries(entries);
  }
}
