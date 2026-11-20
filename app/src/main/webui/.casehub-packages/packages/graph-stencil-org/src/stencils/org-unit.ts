import { html, nothing } from 'lit-html';
import type { GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { OrgUnitNodeData, AgentCapability } from '../types.js';

export function renderOrgUnit(node: GraphNode, _decoration?: NodeDecoration) {
  const d = node.properties as unknown as OrgUnitNodeData;
  const name = d.name ?? d.unitId ?? '';
  const kind = d.kind;
  const memberCount = d.memberCount ?? 0;
  const colorStart = d.kindColorStart ?? '#553c9a';
  const colorEnd = d.kindColorEnd ?? '#6b46c1';
  const capabilities = (d.capabilities ?? []) as AgentCapability[];

  return html`
    <div style="width:100%;height:100%;min-width:280px;min-height:60px;border:2px solid ${colorStart}40;border-radius:10px;background:linear-gradient(180deg, #f7fafc 0%, #edf2f7 100%);overflow:visible;box-sizing:border-box;">
      <div style="display:flex;align-items:center;padding:8px 14px;background:linear-gradient(90deg, ${colorStart}, ${colorEnd});border-radius:8px 8px 0 0;gap:6px;">
        <span style="font-weight:700;font-size:13px;color:#fff;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
        ${kind ? html`<span style="font-size:9px;color:rgba(255,255,255,0.8);flex-shrink:0;">kind: ${kind}</span>` : nothing}
        <span style="font-size:11px;background:rgba(255,255,255,0.2);color:#fff;padding:1px 7px;border-radius:4px;flex-shrink:0;">${memberCount}</span>
      </div>
      ${capabilities.length > 0 ? html`
        <div style="display:flex;flex-wrap:wrap;gap:4px;padding:6px 14px;">
          ${capabilities.map(c => html`
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:8px;font-weight:600;background:#ebf8ff;color:#2b6cb0;border:0.8px solid #90cdf4;">CAP: ${c.name}</span>
          `)}
        </div>
      ` : nothing}
    </div>
  `;
}
