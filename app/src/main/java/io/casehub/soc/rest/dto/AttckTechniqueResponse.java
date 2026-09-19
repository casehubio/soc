package io.casehub.soc.rest.dto;

public record AttckTechniqueResponse(String techniqueId, String name,
    String tactic, double confidence) {}
