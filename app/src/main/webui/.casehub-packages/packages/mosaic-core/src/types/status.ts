import { registerStatus, lookupStatus } from '@casehubio/pages-ui-components/status-badge';
export { registerStatus, lookupStatus };
export type { StateCategory, StatusDescriptor } from '@casehubio/pages-ui-components/status-badge';

registerStatus('case', 'STARTING', { category: 'info',    icon: '◐' });
registerStatus('case', 'WAITING',  { category: 'warning', icon: '⏳' });

registerStatus('task', 'DELEGATED', { category: 'info',    icon: '→', border: true });
registerStatus('task', 'REJECTED',  { category: 'warning', icon: '✕' });
registerStatus('task', 'OBSOLETE',  { category: 'neutral', icon: '—' });

registerStatus('work', 'DECLINED', { category: 'neutral', icon: '🚫' });
registerStatus('work', 'FAILED',   { category: 'danger',  icon: '✗' });
registerStatus('work', 'EXPIRED',  { category: 'warning', icon: '⌛' });

registerStatus('workitem', 'ASSIGNED',    { category: 'info',    icon: '●' });
registerStatus('workitem', 'IN_PROGRESS', { category: 'active',  icon: '◐', border: true });
registerStatus('workitem', 'DELEGATED',   { category: 'info',    icon: '→', border: true });
registerStatus('workitem', 'REJECTED',    { category: 'warning', icon: '✕' });
registerStatus('workitem', 'ESCALATED',   { category: 'warning', icon: '↑' });
registerStatus('workitem', 'OBSOLETE',    { category: 'neutral', icon: '—' });
registerStatus('workitem', 'EXPIRED',     { category: 'warning', icon: '⌛' });

registerStatus('milestone', 'ACTIVE', { category: 'info', icon: '◉', pulse: true });

registerStatus('outcome', 'SUCCESS',   { category: 'success', icon: '✓' });
registerStatus('outcome', 'DECLINED',  { category: 'neutral', icon: '🚫' });
registerStatus('outcome', 'FAILED',    { category: 'danger',  icon: '✗' });
registerStatus('outcome', 'EXPIRED',   { category: 'warning', icon: '⌛' });
registerStatus('outcome', 'ESCALATED', { category: 'warning', icon: '↑' });
registerStatus('outcome', 'COMPLETED', { category: 'success', icon: '✓' });

registerStatus('group', 'IN_PROGRESS', { category: 'active',  icon: '◐' });
registerStatus('group', 'COMPLETED',   { category: 'success', icon: '✓' });
registerStatus('group', 'REJECTED',    { category: 'danger',  icon: '✕' });

registerStatus('sla', 'NOT_STARTED', { category: 'neutral', icon: '○' });
registerStatus('sla', 'ON_TRACK',    { category: 'success', icon: '✓' });
registerStatus('sla', 'BREACHED',    { category: 'danger',  icon: '!', pulse: true });

registerStatus('node', 'DISPATCHED', { category: 'info',    icon: '→' });
registerStatus('node', 'SKIPPED',    { category: 'neutral', icon: '⏭' });
registerStatus('node', 'FAILED',     { category: 'danger',  icon: '✗' });

registerStatus('session', 'ACTIVE',  { category: 'success', icon: '▶' });
registerStatus('session', 'WAITING', { category: 'warning', icon: '⏳' });
registerStatus('session', 'IDLE',    { category: 'neutral', icon: '○' });

registerStatus('commitment', 'OPEN',         { category: 'active',   icon: '⏳' });
registerStatus('commitment', 'ACKNOWLEDGED', { category: 'info',     icon: '📋' });
registerStatus('commitment', 'FULFILLED',    { category: 'success',  icon: '✓' });
registerStatus('commitment', 'FAILED',       { category: 'danger',   icon: '✗' });
registerStatus('commitment', 'DECLINED',     { category: 'neutral',  icon: '🚫' });
registerStatus('commitment', 'DELEGATED',    { category: 'transfer', icon: '↳' });
registerStatus('commitment', 'EXPIRED',      { category: 'warning',  icon: '⌛' });

registerStatus('execution', 'IDLE',              { category: 'neutral', icon: '○' });
registerStatus('execution', 'RUNNING',           { category: 'active',  icon: '▶', pulse: true, border: true });
registerStatus('execution', 'WAITING_FOR_AGENT', { category: 'warning', icon: '⏳', border: true });
registerStatus('execution', 'WAITING_FOR_EVENT', { category: 'warning', icon: '⏳' });
registerStatus('execution', 'COMPLETE',          { category: 'success', icon: '✓' });
registerStatus('execution', 'FAULTED',           { category: 'danger',  icon: '!', pulse: true });
registerStatus('execution', 'CANCELLED',         { category: 'neutral', icon: '/' });

registerStatus('agent', 'SUCCESS',  { category: 'success', icon: '✓' });
registerStatus('agent', 'FAILURE',  { category: 'danger',  icon: '✗' });
registerStatus('agent', 'TIMEOUT',  { category: 'warning', icon: '⌛' });
registerStatus('agent', 'DECLINED', { category: 'neutral', icon: '🚫' });

registerStatus('pattern', 'SEQUENCE',    { category: 'info', icon: '→' });
registerStatus('pattern', 'PARALLEL',    { category: 'info', icon: '⇉' });
registerStatus('pattern', 'LOOP',        { category: 'info', icon: '↻' });
registerStatus('pattern', 'CONDITIONAL', { category: 'info', icon: '◇' });
registerStatus('pattern', 'SUPERVISOR',  { category: 'info', icon: '◎' });
registerStatus('pattern', 'DEBATE',      { category: 'info', icon: '⇌' });
registerStatus('pattern', 'VOTING',      { category: 'info', icon: '☐' });
registerStatus('pattern', 'HTN',         { category: 'info', icon: '▦' });
