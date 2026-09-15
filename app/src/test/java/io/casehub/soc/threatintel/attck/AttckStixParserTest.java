package io.casehub.soc.threatintel.attck;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;

class AttckStixParserTest {

    private static AttckBundle bundle;

    @BeforeAll
    static void parseBundle() {
        InputStream is = AttckStixParserTest.class
                .getResourceAsStream("/threatintel/test-stix-bundle.json");
        assertThat(is).isNotNull();
        bundle = new AttckStixParser().parse(is);
    }

    @Test
    void extractsVersion() {
        assertThat(bundle.version()).isEqualTo("16.1");
    }

    @Test
    void parsesTechniques_excludingDeprecatedAndRevoked() {
        assertThat(bundle.techniques()).hasSize(2);
        assertThat(bundle.techniques().stream().map(AttckTechnique::mitreId))
                .containsExactlyInAnyOrder("T1003", "T1003.001");
    }

    @Test
    void techniqueFieldsExtracted() {
        var t1003 = bundle.techniques().stream()
                .filter(t -> t.mitreId().equals("T1003")).findFirst().orElseThrow();
        assertThat(t1003.stixId()).isEqualTo("attack-pattern--t1003");
        assertThat(t1003.name()).isEqualTo("OS Credential Dumping");
        assertThat(t1003.description()).startsWith("Adversaries may attempt");
        assertThat(t1003.detection()).startsWith("Monitor for unexpected");
        assertThat(t1003.tactics()).containsExactly("credential-access");
        assertThat(t1003.platforms()).containsExactlyInAnyOrder("Windows", "Linux");
        assertThat(t1003.dataSources()).containsExactly("Process: OS API Execution");
        assertThat(t1003.version()).isEqualTo("1.4");
        assertThat(t1003.isSubtechnique()).isFalse();
    }

    @Test
    void subtechniqueDetected() {
        var sub = bundle.techniques().stream()
                .filter(t -> t.mitreId().equals("T1003.001")).findFirst().orElseThrow();
        assertThat(sub.isSubtechnique()).isTrue();
    }

    @Test
    void parsesGroups() {
        assertThat(bundle.groups()).hasSize(2);
        var apt28 = bundle.groups().stream()
                .filter(g -> g.mitreId().equals("G0007")).findFirst().orElseThrow();
        assertThat(apt28.name()).isEqualTo("APT28");
        assertThat(apt28.aliases()).contains("Fancy Bear", "Sofacy");
    }

    @Test
    void parsesMitigations() {
        assertThat(bundle.mitigations()).hasSize(1);
        assertThat(bundle.mitigations().getFirst().mitreId()).isEqualTo("M1026");
    }

    @Test
    void parsesMalware() {
        assertThat(bundle.malware()).hasSize(1);
        assertThat(bundle.malware().getFirst().name()).isEqualTo("Mimikatz");
    }

    @Test
    void parsesTools() {
        assertThat(bundle.tools()).hasSize(1);
        assertThat(bundle.tools().getFirst().name()).isEqualTo("PsExec");
    }

    @Test
    void parsesRelationships() {
        assertThat(bundle.relationships()).hasSize(7);
        var usesRels = bundle.relationships().stream()
                .filter(r -> r.relationshipType().equals("uses")).toList();
        assertThat(usesRels).hasSize(5);
    }

    @Test
    void relationshipFieldsExtracted() {
        var rel = bundle.relationships().stream()
                .filter(r -> r.stixId().equals("relationship--apt28-uses-t1003"))
                .findFirst().orElseThrow();
        assertThat(rel.sourceRef()).isEqualTo("intrusion-set--apt28");
        assertThat(rel.targetRef()).isEqualTo("attack-pattern--t1003");
        assertThat(rel.relationshipType()).isEqualTo("uses");
    }
}
