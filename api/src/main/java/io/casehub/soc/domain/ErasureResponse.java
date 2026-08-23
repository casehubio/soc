package io.casehub.soc.domain;

public record ErasureResponse(
    String erasureId,
    String status,
    String timestamp,
    long entryCount) {}
