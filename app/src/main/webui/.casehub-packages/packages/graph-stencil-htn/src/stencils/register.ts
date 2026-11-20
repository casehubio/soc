import { registerStencil } from '@casehubio/graph-renderer';
import { registerPropertySchema } from '@casehubio/pages-diagram-core';
import { dagNodeGrammar, renderDagNode } from './dag-node.js';
import { htnCompoundGrammar, renderHtnCompound } from './htn-compound.js';
import { htnMethodGrammar, renderHtnMethod } from './htn-method.js';
import { htnLeafGrammar, renderHtnLeaf } from './htn-leaf.js';
import { dagNodeSchema, primitivePlanItemSchema, compoundPlanItemSchema, htnCompoundSchema, htnMethodSchema, htnLeafSchema } from '../schemas/index.js';

let registered = false;

export function registerHtnStencils(): void {
  if (registered) return;
  registered = true;

  registerStencil({
    type: 'dag-node',
    label: 'Task',
    icon: 'box',
    grammar: dagNodeGrammar,
    render: renderDagNode,
  });

  registerStencil({ type: 'htn-compound', label: 'Compound Task', icon: 'layers', grammar: htnCompoundGrammar, render: renderHtnCompound });
  registerStencil({ type: 'htn-method', label: 'Method', icon: 'git-branch', grammar: htnMethodGrammar, render: renderHtnMethod });
  registerStencil({ type: 'htn-leaf', label: 'Leaf Task', icon: 'check-circle', grammar: htnLeafGrammar, render: renderHtnLeaf });

  registerPropertySchema('dag-node', dagNodeSchema);
  registerPropertySchema('primitive-plan-item', primitivePlanItemSchema);
  registerPropertySchema('compound-plan-item', compoundPlanItemSchema);
  registerPropertySchema('htn-compound', htnCompoundSchema);
  registerPropertySchema('htn-method', htnMethodSchema);
  registerPropertySchema('htn-leaf', htnLeafSchema);
}
