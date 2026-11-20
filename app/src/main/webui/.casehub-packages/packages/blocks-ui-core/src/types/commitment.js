export const COMMITMENT_STATES = [
    'OPEN', 'ACKNOWLEDGED', 'FULFILLED', 'FAILED',
    'DECLINED', 'DELEGATED', 'EXPIRED',
];
export function commitmentStateCategory(state) {
    switch (state) {
        case 'OPEN': return 'active';
        case 'ACKNOWLEDGED': return 'info';
        case 'FULFILLED': return 'success';
        case 'FAILED': return 'danger';
        case 'DECLINED': return 'neutral';
        case 'DELEGATED': return 'transfer';
        case 'EXPIRED': return 'warning';
    }
}
const TERMINAL_STATES = new Set([
    'FULFILLED', 'FAILED', 'DECLINED', 'DELEGATED', 'EXPIRED',
]);
export function isTerminalCommitmentState(state) {
    return TERMINAL_STATES.has(state);
}
export function toCommitmentRecord(raw) {
    const timestamps = [raw.resolvedAt, raw.acknowledgedAt, raw.createdAt]
        .filter((t) => t != null);
    const updatedAt = timestamps.length > 0
        ? timestamps.reduce((a, b) => a > b ? a : b)
        : raw.createdAt ?? new Date().toISOString();
    return {
        state: raw.state,
        ...(raw.expiresAt != null ? { deadline: raw.expiresAt } : {}),
        ...(raw.acknowledgedAt != null ? { acknowledgedAt: raw.acknowledgedAt } : {}),
        ...(raw.resolvedAt != null ? { resolvedAt: raw.resolvedAt } : {}),
        createdAt: raw.createdAt ?? new Date().toISOString(),
        updatedAt,
    };
}
export function toCommitmentMap(commitments) {
    const map = new Map();
    for (const c of commitments) {
        map.set(c.correlationId, toCommitmentRecord(c));
    }
    return map;
}
//# sourceMappingURL=commitment.js.map