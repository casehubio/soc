import type { GraphModel } from '@casehubio/graph-core';
import { lookupRelationshipType } from '@casehubio/mosaic-core';

export function toDOT(model: GraphModel): string {
  const lines: string[] = ['digraph CaseDependencies {'];
  lines.push('  rankdir=LR;');
  lines.push('  node [shape=box, style=rounded];');
  lines.push('');

  for (const node of model.nodes) {
    const label = String(node.properties.label ?? node.id);
    const status = node.properties.status ? String(node.properties.status) : '';
    const attrs = [`label="${label}"`, status ? `status="${status}"` : ''].filter(Boolean).join(', ');
    lines.push(`  "${node.id}" [${attrs}];`);
  }

  lines.push('');

  const directedEdges = model.edges.filter(e => lookupRelationshipType(e.type).directed !== false);
  const undirectedEdges = model.edges.filter(e => lookupRelationshipType(e.type).directed === false);

  for (const edge of directedEdges) {
    const desc = lookupRelationshipType(edge.type);
    const attrs = desc.label ? `label="${desc.label}"` : '';
    lines.push(`  "${edge.source}" -> "${edge.target}"${attrs ? ` [${attrs}]` : ''};`);
  }

  if (undirectedEdges.length > 0) {
    lines.push('');
    lines.push('  subgraph undirected {');
    lines.push('    edge [dir=none];');
    for (const edge of undirectedEdges) {
      const desc = lookupRelationshipType(edge.type);
      const attrs = desc.label ? `label="${desc.label}"` : '';
      lines.push(`    "${edge.source}" -- "${edge.target}"${attrs ? ` [${attrs}]` : ''};`);
    }
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}
