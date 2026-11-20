import { html, nothing } from 'lit-html';
import type { GraphNode, NodeDecoration } from '@casehubio/graph-core';
import type { OrgAgentNodeData, AgentCapability } from '../types.js';
import { DISPOSITION_SHORT_NAMES } from '../layout/layout-rules.js';
import '@casehubio/mosaic-agent-avatar-2d';

const DISPOSITION_COLORS: Record<string, { bg: string; color: string }> = {
  autonomy: { bg: '#fed7d7', color: '#c53030' },
  ruleFollowing: { bg: '#fefcbf', color: '#975a16' },
  socialOrient: { bg: '#c6f6d5', color: '#276749' },
  riskAppetite: { bg: '#c6f6d5', color: '#276749' },
  conflictMode: { bg: '#ebf8ff', color: '#2b6cb0' },
};

const truncStyle = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
const rowStyle = 'display:flex;align-items:baseline;gap:6px;padding:0 10px;margin-top:4px;';
const labelStyle = 'font-size:9px;color:#718096;font-weight:600;flex-shrink:0;min-width:55px;';
const valueStyle = `font-size:9px;color:#2d3748;flex:1;${truncStyle}`;

function renderRow(label: string, value: unknown) {
  return html`<div style="${rowStyle}"><span style="${labelStyle}">${label}</span><span style="${valueStyle}">${value}</span></div>`;
}

function renderDispositionPills(disposition: Record<string, string | undefined>) {
  const pills = Object.entries(disposition)
    .filter(([, v]) => v !== undefined)
    .map(([axis, value]) => {
      const colors = DISPOSITION_COLORS[axis] ?? { bg: '#f3f4f6', color: '#374151' };
      const shortName = (DISPOSITION_SHORT_NAMES as Record<string, string>)[axis] ?? axis;
      return html`<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:8px;background:${colors.bg};color:${colors.color};margin-right:4px;">${shortName}: ${value}</span>`;
    });
  return html`<div style="${rowStyle}"><span style="${labelStyle}">DISPOSITION</span><span style="flex:1;display:flex;flex-wrap:wrap;gap:2px;">${pills}</span></div>`;
}

function renderAttestationGrants(grants: OrgAgentNodeData['attestationGrants']) {
  if (!grants?.length) return nothing;
  const firstGrant = grants[0]!;
  const dimPills = firstGrant.dimensions.map(d =>
    html`<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:7.5px;background:#e9d8fd;color:#553c9a;margin-right:3px;">${d}</span>`
  );
  const signals = firstGrant.signalTypes?.join(', ') ?? '';
  return html`
    <div style="${rowStyle}"><span style="${labelStyle}">ATTESTATION</span><span style="flex:1;display:flex;flex-wrap:wrap;gap:2px;">${dimPills}</span></div>
    ${signals ? html`<div style="padding:0 10px 0 75px;font-size:8px;color:#718096;">signals: ${signals}</div>` : nothing}
  `;
}

export function renderOrgAgent(node: GraphNode, _decoration?: NodeDecoration) {
  const d = node.properties as unknown as OrgAgentNodeData;
  const colorStart = d.unitColorStart ?? '#6366f1';
  const tintBg = `${colorStart}15`;
  const borderColor = `${colorStart}60`;

  return html`
    <div style="display:flex;flex-direction:column;background:#fff;border:1.5px solid ${borderColor};border-radius:8px;min-width:240px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:${tintBg};border-bottom:1px solid ${borderColor};">
        ${d.avatar
          ? html`<agent-avatar .code=${d.avatar} size="xs" aria-hidden="true" style="flex-shrink:0;"></agent-avatar>`
          : html`<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="${colorStart}"/></svg>`}
        <span style="font-weight:700;font-size:12px;color:${colorStart};flex:1;${truncStyle}">${d.agentId}</span>
        ${d.role ? html`<span style="font-size:8px;font-weight:600;color:${colorStart};text-transform:uppercase;flex-shrink:0;">${d.role}</span>` : nothing}
      </div>
      ${d.profession ? html`
        <div style="padding:2px 10px 0 ${d.avatar ? '42px' : '28px'};font-size:9px;color:#718096;">
          ${d.descriptorRole ? `${d.profession} / ${d.descriptorRole}` : d.profession}
        </div>
      ` : nothing}
      <div style="padding:4px 0 6px 0;">
        ${d.slot ? renderRow('SLOT', d.slot) : nothing}
        ${(d.capabilities as AgentCapability[] | undefined)?.length ? renderRow('CAPS', d.capabilities!.map(c => c.name).join(', ')) : nothing}
        ${d.disposition && Object.keys(d.disposition).length > 0 ? renderDispositionPills(d.disposition as Record<string, string>) : nothing}
        ${d.supervisionTargets?.length ? renderRow('SUPERVISES', d.supervisionTargets.join(', ')) : nothing}
        ${d.escalationChain?.length ? html`<div style="${rowStyle}"><span style="${labelStyle}">ESCALATES</span><span style="flex:1;font-size:9px;color:#c53030;${truncStyle}">→ ${d.escalationChain.join(' → ')}</span></div>` : nothing}
        ${d.backupAgents?.length ? renderRow('BACKUP', d.backupAgents.map(b => b.scope ? `${b.agentId} (scope: ${b.scope})` : b.agentId).join(', ')) : nothing}
        ${renderAttestationGrants(d.attestationGrants)}
      </div>
    </div>
  `;
}
