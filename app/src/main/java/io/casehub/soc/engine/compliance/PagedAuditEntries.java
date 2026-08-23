package io.casehub.soc.engine.compliance;

import java.util.List;

public record PagedAuditEntries(
    List<SocLedgerEntry> content,
    long totalElements,
    int totalPages,
    int page,
    int size) {}
