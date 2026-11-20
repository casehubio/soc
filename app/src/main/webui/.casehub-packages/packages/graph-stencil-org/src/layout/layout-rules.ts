import type { GraphModel } from '@casehubio/graph-core';
import type { ClassificationRule, LayoutRule, HardConstraint, FactBase } from './types.js';
import type { DispositionAxes } from '../types.js';
import {
  horizontalInternalRule,
  verticalStackingRule,
  positionAwareHandlesRule,
  noContainerOverlapConstraint,
  childContainmentConstraint,
  noSiblingOverlapConstraint,
  INTERNAL_PAD as _INTERNAL_PAD,
  HEADER_HEIGHT as _HEADER_HEIGHT,
} from '@casehubio/graph-renderer';

export const INTERNAL_PAD = _INTERNAL_PAD;
export const HEADER_HEIGHT = _HEADER_HEIGHT;

const ROW_HEIGHT = 16;
const AGENT_HEADER_HEIGHT = 28;
const DISPOSITION_ROW_HEIGHT = 18;
const ATTESTATION_HEIGHT = 32;
const PADDING = 12;
export const AGENT_WIDTH = 280;

export const DISPOSITION_SHORT_NAMES: Readonly<Record<keyof DispositionAxes, string>> = {
  autonomy: 'autonomy',
  ruleFollowing: 'rules',
  socialOrient: 'social',
  riskAppetite: 'risk',
  conflictMode: 'conflict',
};

// ─── Org-Specific Sizing Classifier ─────────────────────────────────

export function sizingClassifier(): ClassificationRule {
  return {
    id: 'org-agent-sizing',
    classify(model: GraphModel, facts: FactBase) {
      const sizes = new Map<string, { width: number; height: number }>();
      for (const node of model.nodes) {
        if (node.type === 'org-agent') {
          const p = node.properties;
          let h = AGENT_HEADER_HEIGHT + PADDING;
          if (p['slot']) h += ROW_HEIGHT;
          if (p['profession']) h += ROW_HEIGHT;
          if ((p['capabilities'] as unknown[] | undefined)?.length) h += ROW_HEIGHT;
          const disp = p['disposition'] as Partial<DispositionAxes> | undefined;
          if (disp && Object.keys(disp).length > 0) h += DISPOSITION_ROW_HEIGHT;
          if ((p['supervisionTargets'] as string[] | undefined)?.length) h += ROW_HEIGHT;
          if ((p['escalationChain'] as string[] | undefined)?.length) h += ROW_HEIGHT;
          if ((p['backupAgents'] as unknown[] | undefined)?.length) h += ROW_HEIGHT;
          if ((p['attestationGrants'] as unknown[] | undefined)?.length) h += ATTESTATION_HEIGHT;
          sizes.set(node.id, { width: AGENT_WIDTH, height: h });
        }
      }
      facts.assert('graph', 'node-sizes', sizes);
    },
  };
}

// ─── Org Layout Rules (delegate to generic with org node types) ─────

export function orgLayoutRules(): LayoutRule[] {
  return [
    horizontalInternalRule('org-unit', 'org-agent'),
    verticalStackingRule('org-unit'),
    positionAwareHandlesRule(),
  ];
}

export function orgHardConstraints(): HardConstraint[] {
  return [
    noContainerOverlapConstraint('org-unit'),
    childContainmentConstraint('org-agent'),
    noSiblingOverlapConstraint('org-agent'),
  ];
}
