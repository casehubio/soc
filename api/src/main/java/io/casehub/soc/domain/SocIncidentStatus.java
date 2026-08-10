package io.casehub.soc.domain;

public enum SocIncidentStatus {
    TRIAGING, INVESTIGATING, CONTAINING, RESOLVED, ESCALATED, FALSE_POSITIVE;

    public boolean isTerminal() {
        return this == RESOLVED || this == ESCALATED || this == FALSE_POSITIVE;
    }
}
