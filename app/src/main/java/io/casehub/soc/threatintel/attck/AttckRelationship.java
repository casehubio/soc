package io.casehub.soc.threatintel.attck;

public record AttckRelationship(
        String stixId, String sourceRef, String targetRef, String relationshipType
) {}
