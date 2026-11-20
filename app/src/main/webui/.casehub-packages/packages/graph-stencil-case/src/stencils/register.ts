import { registerStencil } from '@casehubio/graph-renderer';
import { registerPropertySchema } from '@casehubio/pages-diagram-core';
import { bindingGrammar, renderBinding } from './binding.js';
import { workerGrammar, renderWorker } from './worker.js';
import { milestoneGrammar, renderMilestone } from './milestone.js';
import { goalGrammar, renderGoal } from './goal.js';
import { subcaseGrammar, renderSubCase } from './subcase.js';
import { externalGrammar, renderExternal } from './external.js';
import { milestoneSchema, goalSchema, subcaseSchema, bindingSchema, workerSchema } from '../schemas/index.js';

const CURSOR_OVERRIDES = `
.react-flow__pane { cursor: default !important; }
.react-flow__pane.dragging { cursor: grabbing !important; }
.react-flow__node { cursor: pointer !important; }
.react-flow__node button { cursor: pointer !important; }
`;

let registered = false;

export function registerCaseStencils(): void {
  if (registered) return;
  registered = true;

  registerStencil({ type: 'binding', label: 'Binding', icon: 'link', grammar: bindingGrammar, render: renderBinding, defaultStyle: CURSOR_OVERRIDES });
  registerStencil({ type: 'worker', label: 'Worker', icon: 'cpu', grammar: workerGrammar, render: renderWorker });
  registerStencil({ type: 'milestone', label: 'Milestone', icon: 'flag', grammar: milestoneGrammar, render: renderMilestone });
  registerStencil({ type: 'goal', label: 'Goal', icon: 'target', grammar: goalGrammar, render: renderGoal });
  registerStencil({ type: 'subcase', label: 'SubCase', icon: 'layers', grammar: subcaseGrammar, render: renderSubCase });
  registerStencil({ type: 'external', label: 'External', icon: 'link', grammar: externalGrammar, render: renderExternal });

  registerPropertySchema('milestone', milestoneSchema);
  registerPropertySchema('goal', goalSchema);
  registerPropertySchema('subcase', subcaseSchema);
  registerPropertySchema('binding', bindingSchema);
  registerPropertySchema('worker', workerSchema);
}
