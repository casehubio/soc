export function trustLevelFromScore(score) {
    if (score === undefined || score === null)
        return 'none';
    if (score >= 0.7)
        return 'high';
    if (score >= 0.4)
        return 'adequate';
    return 'low';
}
//# sourceMappingURL=trust.js.map