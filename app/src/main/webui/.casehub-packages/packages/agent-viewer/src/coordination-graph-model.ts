import type { PhaseItem, CoordinationStep, MatchRouting } from './coordination-types.js';

export interface GraphNode {
  step: CoordinationStep;
  routing?: MatchRouting;
  colorHint?: 'green' | 'amber' | 'red';
  extraStepCount?: number;
  laneName?: string;
  laneSteps?: CoordinationStep[];
}

export interface GraphTier {
  kind: 'tier';
  nodes: GraphNode[];
}

export interface GraphConnector {
  kind: 'connector';
  type: 'flow' | 'fan-out' | 'fan-in' | 'outcomes';
  labels?: string[];
  barrier?: {
    type: 'signal' | 'quorum';
    name: string;
    description?: string;
    required?: number;
    of?: number;
  };
}

export type TierElement = GraphTier | GraphConnector;

const COLOR_HINT_MAP: Record<string, 'green' | 'amber' | 'red'> = {
  approve: 'green',
  escalate: 'amber',
  reject: 'red',
};

export function assignTiers(phases: PhaseItem[]): TierElement[] {
  const elements: TierElement[] = [];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (!phase) continue;
    const lastElement = elements.length > 0 ? elements[elements.length - 1] : undefined;

    switch (phase.type) {
      case 'step': {
        if (lastElement?.kind === 'tier') {
          elements.push({ kind: 'connector', type: 'flow' });
        }
        const node: GraphNode = { step: phase };
        if (phase.routing) {
          node.routing = phase.routing;
        }
        elements.push({ kind: 'tier', nodes: [node] });
        if (phase.routing) {
          elements.push({ kind: 'connector', type: 'outcomes' });
          const outcomeNodes: GraphNode[] = phase.routing.cases.map(c => {
            const hint = COLOR_HINT_MAP[c.pattern];
            const node: GraphNode = { step: c.step };
            if (hint) node.colorHint = hint;
            return node;
          });
          elements.push({ kind: 'tier', nodes: outcomeNodes });
        }
        break;
      }
      case 'signal': {
        // Signal before parallel → attached to fan-out connector when parallel is processed
        // Standalone signal → flow connector with barrier
        const nextPhase = i + 1 < phases.length ? phases[i + 1] : undefined;
        if (nextPhase?.type !== 'parallel') {
          elements.push({
            kind: 'connector',
            type: 'flow',
            barrier: { type: 'signal', name: phase.name, ...(phase.description != null ? { description: phase.description } : {}) },
          });
        }
        break;
      }
      case 'parallel': {
        const laneNames = Object.keys(phase.lanes);
        const prevPhase = i > 0 ? phases[i - 1] : undefined;
        const signalBarrier = prevPhase?.type === 'signal'
          ? { type: 'signal' as const, name: prevPhase.name, ...(prevPhase.description != null ? { description: prevPhase.description } : {}) }
          : undefined;

        elements.push({
          kind: 'connector',
          type: 'fan-out',
          labels: laneNames,
          ...(signalBarrier ? { barrier: signalBarrier } : {}),
        });

        const nodes: GraphNode[] = laneNames.map(name => {
          const steps = phase.lanes[name]!;
          const node: GraphNode = { step: steps[0]!, laneName: name, laneSteps: steps };
          if (steps.length > 1) {
            node.extraStepCount = steps.length - 1;
          }
          return node;
        });
        elements.push({ kind: 'tier', nodes });
        break;
      }
      case 'quorum': {
        elements.push({
          kind: 'connector',
          type: 'fan-in',
          barrier: { type: 'quorum', name: phase.name, required: phase.required, of: phase.of },
        });
        break;
      }
    }
  }

  return elements;
}

export function detectPreferredView(phases: PhaseItem[]): 'lanes' | 'graph' {
  const hasParallel = phases.some(p => p.type === 'parallel');
  const hasQuorum = phases.some(p => p.type === 'quorum');
  return hasParallel && hasQuorum ? 'graph' : 'lanes';
}
