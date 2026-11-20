import { registerStencil, registerEdgeType, getStencil } from '@casehubio/graph-renderer';
import { registerPropertySchema } from '@casehubio/pages-diagram-core';
import { orgUnitSchema, orgAgentSchema } from '../schemas/index.js';
import type { StencilGrammar } from '@casehubio/graph-core';
import { renderOrgUnit } from './org-unit.js';
import { renderOrgAgent } from './org-agent.js';

const orgUnitGrammar: StencilGrammar = {
  type: 'org-unit',
  connections: {
    inbound: { min: 0, max: 0, allowedFrom: [] },
    outbound: { min: 0, max: 0, allowedTo: [] },
  },
  containment: {
    allowedChildTypes: ['org-agent', 'org-unit'],
    allowedParentTypes: ['org-unit'],
  },
};

const orgAgentGrammar: StencilGrammar = {
  type: 'org-agent',
  connections: {
    inbound: { min: 0, max: Infinity, allowedFrom: ['org-agent'] },
    outbound: { min: 0, max: Infinity, allowedTo: ['org-agent'] },
  },
  containment: {
    allowedParentTypes: ['org-unit'],
  },
};

export function registerOrgStencils(): void {
  if (getStencil('org-unit')) return;

  registerStencil({
    type: 'org-unit',
    label: 'Unit',
    icon: '□',
    grammar: orgUnitGrammar,
    render: renderOrgUnit,
  });

  registerStencil({
    type: 'org-agent',
    label: 'Agent',
    icon: '●',
    grammar: orgAgentGrammar,
    render: renderOrgAgent,
  });

  registerPropertySchema('org-unit', orgUnitSchema);
  registerPropertySchema('org-agent', orgAgentSchema);

  registerEdgeType({
    type: 'org-supervises',
    label: 'Supervises',
    defaultStyle: '.react-flow__edge.org-supervises path { stroke: #374151; stroke-width: 2; }',
    markerEnd: { type: 'arrowclosed', color: '#374151' },
  });
  registerEdgeType({
    type: 'org-delegates-to',
    label: 'Delegates to',
    defaultStyle: '.react-flow__edge.org-delegates-to path { stroke: #3b82f6; stroke-width: 2; stroke-dasharray: 6 3; }',
    markerEnd: { type: 'arrow', color: '#3b82f6' },
  });
  registerEdgeType({
    type: 'org-escalates-to',
    label: 'Escalates to',
    defaultStyle: '.react-flow__edge.org-escalates-to path { stroke: #ef4444; stroke-width: 2; stroke-dasharray: 2 3; }',
    markerEnd: { type: 'arrowclosed', color: '#ef4444' },
  });
  registerEdgeType({
    type: 'org-reports-to',
    label: 'Reports to',
    defaultStyle: '.react-flow__edge.org-reports-to path { stroke: #6b7280; stroke-width: 1; }',
    markerEnd: { type: 'arrowclosed', color: '#6b7280' },
  });
  registerEdgeType({
    type: 'org-backs-up',
    label: 'Backs up',
    defaultStyle: '.react-flow__edge.org-backs-up path { stroke: #16a34a; stroke-width: 3; }',
    markerEnd: { type: 'arrow', color: '#16a34a' },
    markerStart: { type: 'arrow', color: '#16a34a' },
  });
  registerEdgeType({
    type: 'org-extended',
    label: 'Extended',
    defaultStyle: '.react-flow__edge.org-extended path { stroke: #8b5cf6; stroke-width: 2; stroke-dasharray: 6 3; }',
    markerEnd: { type: 'arrow', color: '#8b5cf6' },
  });
}
