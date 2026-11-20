export interface ConnectionRules {
  readonly min: number;
  readonly max: number;
  readonly allowedFrom: readonly string[];
}

export interface ConnectionRulesOut {
  readonly min: number;
  readonly max: number;
  readonly allowedTo: readonly string[];
}

export interface ContainmentRules {
  readonly allowedParentTypes?: readonly string[];
  readonly allowedChildTypes?: readonly string[];
}

export interface StencilGrammar {
  readonly type: string;
  readonly connections: {
    readonly inbound: ConnectionRules;
    readonly outbound: ConnectionRulesOut;
  };
  readonly containment?: ContainmentRules;
}

const registry = new Map<string, StencilGrammar>();

export function registerGrammar(grammar: StencilGrammar): void {
  registry.set(grammar.type, grammar);
}

export function deregisterGrammar(type: string): boolean {
  return registry.delete(type);
}

export function getGrammar(type: string): StencilGrammar | undefined {
  return registry.get(type);
}

export function getAllGrammars(): readonly StencilGrammar[] {
  return Array.from(registry.values());
}

export function clearGrammarRegistry(): void {
  registry.clear();
}
