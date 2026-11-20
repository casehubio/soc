import { parse } from 'yaml';
import type { WorkStencil, MarketplaceDescriptor, WorkStencilDescriptorYaml } from './model.js';

export interface ParseResult {
  readonly stencils: readonly WorkStencil[];
  readonly errors: readonly ParseError[];
}

export interface ParseError {
  readonly stencilName?: string;
  readonly message: string;
}

export function parseMarketplaceYaml(yamlContent: string): ParseResult {
  const stencils: WorkStencil[] = [];
  const errors: ParseError[] = [];

  let raw: unknown;
  try {
    raw = parse(yamlContent);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { stencils: [], errors: [{ message: `YAML parse error: ${message}` }] };
  }

  if (!isMarketplaceDescriptor(raw)) {
    return { stencils: [], errors: [{ message: 'Invalid marketplace descriptor: missing required fields' }] };
  }

  for (const desc of raw.stencils) {
    const result = validateStencilDescriptor(desc);
    if (!result.ok) {
      errors.push({ stencilName: desc.name, message: result.error });
    } else {
      stencils.push(result.stencil);
    }
  }

  return { stencils, errors };
}

function isMarketplaceDescriptor(raw: unknown): raw is MarketplaceDescriptor {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  return typeof obj['name'] === 'string' && Array.isArray(obj['stencils']);
}

type ValidationOk = { readonly ok: true; readonly stencil: WorkStencil };
type ValidationFail = { readonly ok: false; readonly error: string };
type ValidationResult = ValidationOk | ValidationFail;

function validateStencilDescriptor(desc: WorkStencilDescriptorYaml): ValidationResult {
  if (!desc.name || typeof desc.name !== 'string') {
    return { ok: false, error: 'Missing or invalid "name"' };
  }
  if (!desc.displayName || typeof desc.displayName !== 'string') {
    return { ok: false, error: 'Missing or invalid "displayName"' };
  }
  if (!desc.category || typeof desc.category !== 'string') {
    return { ok: false, error: 'Missing or invalid "category"' };
  }
  if (!desc.icon || typeof desc.icon !== 'string') {
    return { ok: false, error: 'Missing or invalid "icon"' };
  }

  return {
    ok: true,
    stencil: {
      name: desc.name,
      displayName: desc.displayName,
      category: desc.category,
      icon: desc.icon,
      async: desc.async ?? false,
      properties: (desc.properties ?? {}),
      input: (desc.input ?? {}),
      output: (desc.output ?? {}),
    },
  };
}
