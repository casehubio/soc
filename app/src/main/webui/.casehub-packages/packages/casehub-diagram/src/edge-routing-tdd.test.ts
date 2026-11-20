import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toGraph } from '@casehubio/mosaic-graph-stencil-case';
import { computeElkLayout, toReactFlowGraph, validateEdgeRouting } from '@casehubio/graph-renderer';

function extractYaml(file: string): string {
  const src = readFileSync(resolve(import.meta.dirname, '../../../examples/src/pages/' + file), 'utf-8');
  const match = src.match(/const YAML = `([\s\S]*?)`;/);
  if (!match) throw new Error('Could not extract YAML from ' + file);
  return match[1]!.replace(/\\(\$)/g, '$');
}

async function renderCaseDiagram(yaml: string) {
  const { model } = toGraph(yaml);
  const direction = 'RIGHT';
  const nodeSizes = new Map<string, { width: number; height: number }>();
  for (const node of model.nodes) {
    if (node.type === 'worker' && node.properties['do']) {
      nodeSizes.set(node.id, { width: 280, height: 130 });
    }
  }
  const layout = await computeElkLayout(model, {
    direction, spacing: 50, wrapping: true,
    ...(nodeSizes.size > 0 ? { nodeSizes } : {}),
  });
  const { nodes, edges } = toReactFlowGraph(model, layout, undefined, direction);
  return { nodes, edges };
}

const CASEHUB_YAML = extractYaml('casehub-diagram-page.ts');
const WORKBENCH_YAML = extractYaml('diagram-workbench-page.ts');

describe('edge routing TDD — CaseHub Diagram (graph model validation)', () => {
  it('CaseHub Diagram page', async () => {
    const { nodes, edges } = await renderCaseDiagram(CASEHUB_YAML);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it('Diagram Workbench page', async () => {
    const { nodes, edges } = await renderCaseDiagram(WORKBENCH_YAML);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });
});
