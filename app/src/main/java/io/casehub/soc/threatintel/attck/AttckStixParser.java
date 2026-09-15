package io.casehub.soc.threatintel.attck;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

public class AttckStixParser {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public AttckBundle parse(InputStream stixJson) {
        try {
            JsonNode root = MAPPER.readTree(stixJson);
            JsonNode objects = root.get("objects");
            if (objects == null || !objects.isArray()) {
                return new AttckBundle("", List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
            }

            String version = "";
            List<AttckTechnique> techniques = new ArrayList<>();
            List<AttckGroup> groups = new ArrayList<>();
            List<AttckMitigation> mitigations = new ArrayList<>();
            List<AttckMalware> malware = new ArrayList<>();
            List<AttckTool> tools = new ArrayList<>();
            List<AttckRelationship> relationships = new ArrayList<>();

            for (JsonNode obj : objects) {
                if (isDeprecatedOrRevoked(obj)) continue;

                String type = textOrEmpty(obj, "type");
                switch (type) {
                    case "x-mitre-collection" -> version = textOrEmpty(obj, "x_mitre_version");
                    case "attack-pattern" -> techniques.add(parseTechnique(obj));
                    case "intrusion-set" -> groups.add(parseGroup(obj));
                    case "course-of-action" -> mitigations.add(parseMitigation(obj));
                    case "malware" -> malware.add(parseMalware(obj));
                    case "tool" -> tools.add(parseTool(obj));
                    case "relationship" -> relationships.add(parseRelationship(obj));
                }
            }
            return new AttckBundle(version, techniques, groups, mitigations, malware, tools, relationships);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to parse STIX bundle", e);
        }
    }

    private boolean isDeprecatedOrRevoked(JsonNode obj) {
        return boolOrFalse(obj, "x_mitre_deprecated") || boolOrFalse(obj, "revoked");
    }

    private AttckTechnique parseTechnique(JsonNode obj) {
        return new AttckTechnique(
                textOrEmpty(obj, "id"),
                extractMitreId(obj),
                textOrEmpty(obj, "name"),
                textOrEmpty(obj, "description"),
                obj.has("x_mitre_detection") ? obj.get("x_mitre_detection").asText() : null,
                extractKillChainPhases(obj),
                textList(obj, "x_mitre_platforms"),
                textList(obj, "x_mitre_data_sources"),
                textOrEmpty(obj, "x_mitre_version"),
                boolOrFalse(obj, "x_mitre_is_subtechnique")
        );
    }

    private AttckGroup parseGroup(JsonNode obj) {
        return new AttckGroup(
                textOrEmpty(obj, "id"),
                extractMitreId(obj),
                textOrEmpty(obj, "name"),
                textOrEmpty(obj, "description"),
                textList(obj, "aliases")
        );
    }

    private AttckMitigation parseMitigation(JsonNode obj) {
        return new AttckMitigation(
                textOrEmpty(obj, "id"),
                extractMitreId(obj),
                textOrEmpty(obj, "name"),
                textOrEmpty(obj, "description")
        );
    }

    private AttckMalware parseMalware(JsonNode obj) {
        return new AttckMalware(
                textOrEmpty(obj, "id"),
                extractMitreId(obj),
                textOrEmpty(obj, "name"),
                textOrEmpty(obj, "description")
        );
    }

    private AttckTool parseTool(JsonNode obj) {
        return new AttckTool(
                textOrEmpty(obj, "id"),
                extractMitreId(obj),
                textOrEmpty(obj, "name"),
                textOrEmpty(obj, "description")
        );
    }

    private AttckRelationship parseRelationship(JsonNode obj) {
        return new AttckRelationship(
                textOrEmpty(obj, "id"),
                textOrEmpty(obj, "source_ref"),
                textOrEmpty(obj, "target_ref"),
                textOrEmpty(obj, "relationship_type")
        );
    }

    private String extractMitreId(JsonNode obj) {
        JsonNode refs = obj.get("external_references");
        if (refs != null && refs.isArray()) {
            for (JsonNode ref : refs) {
                if ("mitre-attack".equals(textOrEmpty(ref, "source_name"))) {
                    return textOrEmpty(ref, "external_id");
                }
            }
        }
        return "";
    }

    private List<String> extractKillChainPhases(JsonNode obj) {
        JsonNode phases = obj.get("kill_chain_phases");
        if (phases == null || !phases.isArray()) return List.of();
        List<String> result = new ArrayList<>();
        for (JsonNode phase : phases) {
            if ("mitre-attack".equals(textOrEmpty(phase, "kill_chain_name"))) {
                result.add(textOrEmpty(phase, "phase_name"));
            }
        }
        return result;
    }

    private List<String> textList(JsonNode obj, String field) {
        JsonNode arr = obj.get(field);
        if (arr == null || !arr.isArray()) return List.of();
        List<String> result = new ArrayList<>();
        for (JsonNode item : arr) {
            result.add(item.asText());
        }
        return result;
    }

    private String textOrEmpty(JsonNode obj, String field) {
        JsonNode node = obj.get(field);
        return node != null ? node.asText() : "";
    }

    private boolean boolOrFalse(JsonNode obj, String field) {
        JsonNode node = obj.get(field);
        return node != null && node.asBoolean(false);
    }
}
