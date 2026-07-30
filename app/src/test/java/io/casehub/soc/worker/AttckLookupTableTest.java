package io.casehub.soc.worker;

import io.casehub.soc.worker.contract.AttckMappingOutput;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AttckLookupTableTest {

    @ParameterizedTest
    @CsvSource({
            "credential-harvesting-detected, EMAIL,            T1566, INITIAL_ACCESS,   0.85",
            "credential-harvesting-detected, IP_ADDRESS,       T1078, INITIAL_ACCESS,   0.70",
            "lateral-movement-detected,      IP_ADDRESS,       T1021, LATERAL_MOVEMENT, 0.80",
            "data-exfiltration-detected,     URL,              T1041, EXFILTRATION,      0.75",
            "malware-detected,              FILE_HASH_SHA256,  T1204, EXECUTION,         0.90"
    })
    void knownRuleAndIocType_mapsToTechnique(String rule, String iocType,
                                              String expectedTechnique, String expectedTactic,
                                              double expectedConfidence) {
        AttckMappingOutput result = AttckLookupTable.lookup(rule, List.of(iocType));
        assertThat(result.techniques()).isNotEmpty();
        assertThat(result.techniques().getFirst().technique()).isEqualTo(expectedTechnique);
        assertThat(result.primaryTactic()).isEqualTo(expectedTactic);
        assertThat(result.confidence()).isEqualTo(expectedConfidence);
    }

    @Test
    void unknownRule_mapsToDefaultTechnique() {
        AttckMappingOutput result = AttckLookupTable.lookup("unknown-rule", List.of("IP_ADDRESS"));
        assertThat(result.techniques()).hasSize(1);
        assertThat(result.techniques().getFirst().technique()).isEqualTo("T1190");
        assertThat(result.primaryTactic()).isEqualTo("INITIAL_ACCESS");
        assertThat(result.confidence()).isEqualTo(0.50);
    }

    @Test
    void emptyIocTypes_usesRulePrefixOnly() {
        AttckMappingOutput result = AttckLookupTable.lookup("credential-harvesting-detected", List.of());
        assertThat(result.techniques()).isNotEmpty();
        assertThat(result.primaryTactic()).isNotBlank();
    }

    @Test
    void multipleIocTypes_selectsBestMatch() {
        AttckMappingOutput result = AttckLookupTable.lookup(
                "credential-harvesting-detected", List.of("EMAIL", "IP_ADDRESS"));
        assertThat(result.techniques().getFirst().confidence())
                .isGreaterThanOrEqualTo(0.70);
    }

    @Test
    void narrativeIsPopulated() {
        AttckMappingOutput result = AttckLookupTable.lookup("malware-detected", List.of("FILE_HASH_MD5"));
        assertThat(result.narrative()).isNotBlank();
    }
}
