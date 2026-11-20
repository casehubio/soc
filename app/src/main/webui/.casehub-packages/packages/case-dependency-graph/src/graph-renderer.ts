import { select } from 'd3-selection';
import { lookupRelationshipType } from '@casehubio/blocks-ui-core';
import { lookupStatus, stateCategoryStyles } from '@casehubio/pages-ui-components/status-badge';
import type { GraphNode } from '@casehubio/graph-core';
import type { SimNode, SimLink } from './types.js';

export interface RenderOptions {
  renderNode?: (node: GraphNode) => SVGElement | undefined;
  renderTooltip?: (node: GraphNode) => string;
}

function toGraphNode(d: SimNode): GraphNode {
  return { id: d.id, type: 'case', properties: { label: d.label, status: d.status, domain: d.domain } };
}

export function renderGraph(
  container: SVGGElement,
  nodes: SimNode[],
  links: SimLink[],
  options: RenderOptions,
): void {
  const sel = select(container);
  sel.selectAll('*').remove();

  const edgesGroup = sel.append('g').attr('class', 'edges');
  const nodesGroup = sel.append('g').attr('class', 'nodes');

  edgesGroup.selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', d => lookupRelationshipType(d.type).color)
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', d => {
      const style = lookupRelationshipType(d.type).style;
      if (style === 'dashed') return '8,4';
      if (style === 'dotted') return '2,4';
      return null;
    })
    .attr('marker-end', d => lookupRelationshipType(d.type).directed ? `url(#arrow-${d.type})` : null);

  const nodeGroup = nodesGroup.selectAll<SVGGElement, SimNode>('g')
    .data(nodes)
    .join('g')
    .attr('cursor', 'pointer')
    .attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

  nodeGroup.each(function (d) {
    const g = select(this);
    const graphNode = toGraphNode(d);

    if (options.renderNode) {
      const custom = options.renderNode(graphNode);
      if (custom) { g.node()!.appendChild(custom); return; }
    }

    const desc = lookupStatus(d.domain, d.status);
    const colors = stateCategoryStyles(desc.category);

    g.append('rect')
      .attr('width', 120).attr('height', 40)
      .attr('x', -60).attr('y', -20)
      .attr('rx', 8)
      .attr('fill', colors.background)
      .attr('stroke', colors.color)
      .attr('stroke-width', 1);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', colors.color)
      .attr('font-size', '11px')
      .text(d.label.length > 15 ? d.label.slice(0, 15) + '...' : d.label);

    const tooltipText = options.renderTooltip
      ? options.renderTooltip(graphNode)
      : `${d.label}\nStatus: ${d.status}`;
    g.append('title').text(tooltipText);
  });
}

export function clearGraph(container: SVGGElement): void {
  select(container).selectAll('*').remove();
}
