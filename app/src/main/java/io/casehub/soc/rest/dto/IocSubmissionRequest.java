package io.casehub.soc.rest.dto;

public record IocSubmissionRequest(String type, String value,
    Double confidence) {}
