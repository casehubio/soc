package io.casehub.soc.rest.dto;

import java.util.List;
import java.util.UUID;

public record CbrPrecedentResponse(UUID caseId, double similarity,
    String outcome, String resolutionTime, String alertType,
    String sourceSystem, List<String> attckTechniqueIds,
    String playbook) {}
