package io.casehub.soc.domain;

public record ComplianceRequirement(
    String regulation,
    String requirement,
    String mechanism,
    String status,
    String evidenceUrl) {}
