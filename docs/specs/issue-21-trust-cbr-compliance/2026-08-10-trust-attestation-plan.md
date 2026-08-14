# Trust Dimensions & Attestation Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> subagent-driven-development (recommended) or executing-plans to
> implement this plan task-by-task. Each task follows TDD
> (test-driven-development) and uses ide-tooling for structural
> editing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Focal issue:** #22 — Layer 4a: Trust dimensions & attestation routing
**Issue group:** #21, #22, #23, #24

**Goal:** Create trust attestations on case resolution so the platform's Bayesian Beta trust scoring can drive trust-weighted implementation routing for future SOC cases.

**Architecture:** CDI `CaseOutcomeObserver` SPI implementation writes `LedgerAttestation` entries for each worker that participated in a resolved investigation. Two SOC-specific trust dimensions (`triage-accuracy`, `containment-appropriateness`) provide the scoring axes. Platform's `TrustWeightedImplementationRoutingStrategy` consumes the resulting trust scores automatically — no SOC routing code needed.

**Tech Stack:** Java 21, Quarkus 3.32.2, casehub-ledger (LedgerAttestation, LedgerEntryRepository), casehub-engine-api (CaseOutcomeObserver, CaseOutcomeEvent), casehub-engine-ledger (CaseLedgerEntryRepository, WorkerDecisionEntry)

## Global Constraints

- Java 21 source level on Java 26 JVM
- `JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode install`
- All commits reference `Refs #22`
- Trust scoring is owned by `casehub-ledger` — SOC must not compute trust itself
- Use `ide_create_file` for new files, `ide_insert_member`/`ide_replace_member` for editing

---

### Task 1: Trust dimension and capability constants (api/)

**Files:**
- Create: `api/src/main/java/io/casehub/soc/domain/SocTrustDimensions.java`
- Create: `api/src/main/java/io/casehub/soc/domain/SocCaseCapabilities.java`
- Test: `api/src/test/java/io/casehub/soc/domain/SocTrustDimensionsTest.java`
- Test: `api/src/test/java/io/casehub/soc/domain/SocCaseCapabilitiesTest.java`

**Interfaces:**
- Consumes: nothing
- Produces: `SocTrustDimensions.TRIAGE_ACCURACY`, `SocTrustDimensions.CONTAINMENT_APPROPRIATENESS`, `SocCaseCapabilities.IOC_ENRICHMENT`, `SocCaseCapabilities.ATTCK_MAPPING`, `SocCaseCapabilities.CONTAINMENT_RECOMMENDATION` — used by Task 3

- [ ] **Step 1: Write failing tests for SocTrustDimensions**

```java
package io.casehub.soc.domain;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SocTrustDimensionsTest {

    @Test
    void triageAccuracy_matchesKebabCaseConvention() {
        assertThat(SocTrustDimensions.TRIAGE_ACCURACY).isEqualTo("triage-accuracy");
    }

    @Test
    void containmentAppropriateness_matchesKebabCaseConvention() {
        assertThat(SocTrustDimensions.CONTAINMENT_APPROPRIATENESS).isEqualTo("containment-appropriateness");
    }
}
```

- [ ] **Step 2: Write failing tests for SocCaseCapabilities**

```java
package io.casehub.soc.domain;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SocCaseCapabilitiesTest {

    @Test
    void iocEnrichment_matchesCaseYamlCapabilityName() {
        assertThat(SocCaseCapabilities.IOC_ENRICHMENT).isEqualTo("ioc-enrichment");
    }

    @Test
    void attckMapping_matchesCaseYamlCapabilityName() {
        assertThat(SocCaseCapabilities.ATTCK_MAPPING).isEqualTo("attck-mapping");
    }

    @Test
    void containmentRecommendation_matchesCaseYamlCapabilityName() {
        assertThat(SocCaseCapabilities.CONTAINMENT_RECOMMENDATION).isEqualTo("containment-recommendation");
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode test -pl api -Dtest="SocTrustDimensionsTest,SocCaseCapabilitiesTest" -Dsurefire.failIfNoSpecifiedTests=false`
Expected: compilation failure (classes don't exist)

- [ ] **Step 4: Implement SocTrustDimensions**

```java
package io.casehub.soc.domain;

public final class SocTrustDimensions {
    public static final String TRIAGE_ACCURACY = "triage-accuracy";
    public static final String CONTAINMENT_APPROPRIATENESS = "containment-appropriateness";
    private SocTrustDimensions() {}
}
```

- [ ] **Step 5: Implement SocCaseCapabilities**

```java
package io.casehub.soc.domain;

public final class SocCaseCapabilities {
    public static final String IOC_ENRICHMENT = "ioc-enrichment";
    public static final String ATTCK_MAPPING = "attck-mapping";
    public static final String CONTAINMENT_RECOMMENDATION = "containment-recommendation";
    private SocCaseCapabilities() {}
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode test -pl api -Dtest="SocTrustDimensionsTest,SocCaseCapabilitiesTest" -Dsurefire.failIfNoSpecifiedTests=false`
Expected: all 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add api/src/main/java/io/casehub/soc/domain/SocTrustDimensions.java api/src/main/java/io/casehub/soc/domain/SocCaseCapabilities.java api/src/test/java/io/casehub/soc/domain/SocTrustDimensionsTest.java api/src/test/java/io/casehub/soc/domain/SocCaseCapabilitiesTest.java
git commit -m "feat(#22): add SocTrustDimensions and SocCaseCapabilities constants"
```

---

### Task 2: YAML output mapping — preserve analyst outcome and identity

**Files:**
- Modify: `app/src/main/resources/soc/incident-investigation.yaml:110-121`

**Interfaces:**
- Consumes: nothing
- Produces: `analystOutcome` and `analystId` fields in case context snapshot — read by Task 3's `SocAttestationService`

- [ ] **Step 1: Update the outputMapping**

In `app/src/main/resources/soc/incident-investigation.yaml`, replace the `outputMapping` block (lines 110-121) with:

```yaml
        outputMapping: >-
          {
            analystDecision: (
              if .outcome == "CONFIRM_SEVERITY" or .outcome == "DOWNGRADE"
              then "resolved"
              elif .outcome == "ESCALATE" then "escalated"
              elif .outcome == "FALSE_POSITIVE" then "false-positive"
              elif .outcome == null then "escalated"
              else .outcome
              end
            ),
            analystOutcome: .outcome,
            analystId: .completedBy
          }
```

- [ ] **Step 2: Verify YAML parses correctly**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode test -pl app -am -Dtest="SocCaseHubTest" -Dsurefire.failIfNoSpecifiedTests=false`
Expected: PASS (existing tests still pass — YAML parses, goals still evaluate on analystDecision)

- [ ] **Step 3: Commit**

```bash
git add app/src/main/resources/soc/incident-investigation.yaml
git commit -m "feat(#22): add analystOutcome and analystId to analyst-review output mapping"
```

---

### Task 3: SocAttestationService — CaseOutcomeObserver implementation

**Files:**
- Create: `app/src/main/java/io/casehub/soc/engine/SocAttestationService.java`
- Test: `app/src/test/java/io/casehub/soc/engine/SocAttestationServiceTest.java`

**Interfaces:**
- Consumes: `SocTrustDimensions.TRIAGE_ACCURACY`, `.CONTAINMENT_APPROPRIATENESS` (Task 1); `SocCaseCapabilities.CONTAINMENT_RECOMMENDATION` (Task 1); `analystOutcome`/`analystId` in context (Task 2)
- Produces: `LedgerAttestation` entries via `LedgerEntryRepository.saveAttestation()`

- [ ] **Step 1: Write failing test — filtering: only SOC incident-investigation cases**

```java
package io.casehub.soc.engine;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.ledger.api.model.AttestationVerdict;
import io.casehub.ledger.api.model.LedgerAttestation;
import io.casehub.ledger.api.model.LedgerEntry;
import io.casehub.ledger.api.spi.LedgerEntryRepository;
import io.casehub.ledger.model.WorkerDecisionEntry;
import io.casehub.ledger.repository.CaseLedgerEntryRepository;
import io.casehub.soc.domain.SocCaseCapabilities;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.domain.SocTrustDimensions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class SocAttestationServiceTest {

    private StubCaseLedgerEntryRepository caseLedgerRepo;
    private StubLedgerEntryRepository ledgerRepo;
    private SocAttestationService service;
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-08-10T12:00:00Z"), ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        caseLedgerRepo = new StubCaseLedgerEntryRepository();
        ledgerRepo = new StubLedgerEntryRepository();
        service = new SocAttestationService(caseLedgerRepo, ledgerRepo, FIXED_CLOCK);
    }

    @Test
    void nonSocCase_noAttestationsWritten() {
        service.onOutcome(event("aml-investigation", "resolved",
                Map.of("analystOutcome", "CONFIRM_SEVERITY")));
        assertThat(ledgerRepo.savedAttestations).isEmpty();
    }

    @Test
    void nonSuccessOutcome_noAttestationsWritten() {
        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "FAULTED",
                Map.of("analystOutcome", "CONFIRM_SEVERITY")));
        assertThat(ledgerRepo.savedAttestations).isEmpty();
    }
    // ... (continued in subsequent steps)
```

- [ ] **Step 2: Write failing test — verdict mapping for all 4 outcomes × triage-accuracy**

Append to the test class:

```java
    @ParameterizedTest
    @CsvSource({
        "CONFIRM_SEVERITY, resolved,       SOUND",
        "DOWNGRADE,        resolved,       SOUND",
        "ESCALATE,         escalated,      SOUND",
        "FALSE_POSITIVE,   false-positive, FLAGGED"
    })
    void triageAccuracyVerdict_perAnalystOutcome(
            String analystOutcome, String outcomeLabel, String expectedVerdict) {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, outcomeLabel,
                caseId, "tenant-1", Map.of("analystOutcome", analystOutcome,
                                           "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedAttestations).hasSize(1);
        LedgerAttestation att = ledgerRepo.savedAttestations.getFirst();
        assertThat(att.trustDimension).isEqualTo(SocTrustDimensions.TRIAGE_ACCURACY);
        assertThat(att.verdict).isEqualTo(AttestationVerdict.valueOf(expectedVerdict));
    }
```

- [ ] **Step 3: Write failing test — containment-appropriateness for CONFIRM and DOWNGRADE**

```java
    @Test
    void confirmSeverity_containmentWorker_writesTriageAndContainmentAttestations() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-containment-rec",
                SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                           "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedAttestations).hasSize(2);
        assertThat(ledgerRepo.savedAttestations)
                .extracting(a -> a.trustDimension)
                .containsExactlyInAnyOrder(
                        SocTrustDimensions.TRIAGE_ACCURACY,
                        SocTrustDimensions.CONTAINMENT_APPROPRIATENESS);

        LedgerAttestation containment = ledgerRepo.savedAttestations.stream()
                .filter(a -> SocTrustDimensions.CONTAINMENT_APPROPRIATENESS.equals(a.trustDimension))
                .findFirst().orElseThrow();
        assertThat(containment.verdict).isEqualTo(AttestationVerdict.SOUND);
    }

    @Test
    void downgrade_containmentWorker_containmentIsFlagged() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-containment-rec",
                SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "DOWNGRADE",
                                           "analystId", "analyst-1")));

        LedgerAttestation containment = ledgerRepo.savedAttestations.stream()
                .filter(a -> SocTrustDimensions.CONTAINMENT_APPROPRIATENESS.equals(a.trustDimension))
                .findFirst().orElseThrow();
        assertThat(containment.verdict).isEqualTo(AttestationVerdict.FLAGGED);
    }

    @Test
    void escalate_containmentWorker_noContainmentAttestation() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-containment-rec",
                SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "escalated",
                caseId, "tenant-1", Map.of("analystOutcome", "ESCALATE",
                                           "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedAttestations).hasSize(1);
        assertThat(ledgerRepo.savedAttestations.getFirst().trustDimension)
                .isEqualTo(SocTrustDimensions.TRIAGE_ACCURACY);
    }
```

- [ ] **Step 4: Write failing test — attestation fields (attestorId, evidence, etc.)**

```java
    @Test
    void attestationFields_populatedCorrectly() {
        UUID caseId = UUID.randomUUID();
        UUID entryId = caseLedgerRepo.addWorkerDecision(caseId, "llm-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                           "analystId", "analyst-jane")));

        LedgerAttestation att = ledgerRepo.savedAttestations.getFirst();
        assertThat(att.ledgerEntryId).isEqualTo(entryId);
        assertThat(att.subjectId).isEqualTo(caseId);
        assertThat(att.attestorId).isEqualTo("analyst-jane");
        assertThat(att.attestorType).isEqualTo(io.casehub.platform.api.identity.ActorType.HUMAN);
        assertThat(att.attestorRole).isEqualTo("analyst-review-outcome");
        assertThat(att.capabilityTag).isEqualTo(SocCaseCapabilities.IOC_ENRICHMENT);
        assertThat(att.confidence).isEqualTo(1.0);
        assertThat(att.evidence).isEqualTo("analystOutcome=CONFIRM_SEVERITY");
        assertThat(att.occurredAt).isEqualTo(FIXED_CLOCK.instant());
    }

    @Test
    void tenancyIdPassedToSaveAttestation() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-acme", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                               "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedTenancyIds.getFirst()).isEqualTo("tenant-acme");
    }
```

- [ ] **Step 5: Write failing test — fallbacks**

```java
    @Test
    void missingAnalystOutcome_infersFromOutcomeLabel() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "false-positive",
                caseId, "tenant-1", Map.of()));

        assertThat(ledgerRepo.savedAttestations).hasSize(1);
        assertThat(ledgerRepo.savedAttestations.getFirst().verdict)
                .isEqualTo(AttestationVerdict.FLAGGED);
    }

    @Test
    void missingAnalystId_usesSystemFallback() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY")));

        LedgerAttestation att = ledgerRepo.savedAttestations.getFirst();
        assertThat(att.attestorId).isEqualTo("system:soc-attestation");
        assertThat(att.attestorType).isEqualTo(io.casehub.platform.api.identity.ActorType.SYSTEM);
    }

    @Test
    void noWorkerDecisions_noAttestationsWritten() {
        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                UUID.randomUUID(), "tenant-1",
                Map.of("analystOutcome", "CONFIRM_SEVERITY")));
        assertThat(ledgerRepo.savedAttestations).isEmpty();
    }
```

- [ ] **Step 6: Write failing test — idempotency**

```java
    @Test
    void duplicateEvent_idempotencyGuardSkipsExistingAttestations() {
        UUID caseId = UUID.randomUUID();
        UUID entryId = caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);

        ledgerRepo.addExistingAttestation(entryId, SocTrustDimensions.TRIAGE_ACCURACY);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                           "analystId", "analyst-1")));

        assertThat(ledgerRepo.savedAttestations).isEmpty();
    }
```

- [ ] **Step 7: Write failing test — multiple workers in pipeline**

```java
    @Test
    void multipleWorkers_eachGetsTriageAttestation() {
        UUID caseId = UUID.randomUUID();
        caseLedgerRepo.addWorkerDecision(caseId, "rule-ioc-enrichment",
                SocCaseCapabilities.IOC_ENRICHMENT);
        caseLedgerRepo.addWorkerDecision(caseId, "llm-attck-mapping",
                SocCaseCapabilities.ATTCK_MAPPING);
        caseLedgerRepo.addWorkerDecision(caseId, "rule-containment-rec",
                SocCaseCapabilities.CONTAINMENT_RECOMMENDATION);

        service.onOutcome(event(SocCaseTypes.INCIDENT_INVESTIGATION, "resolved",
                caseId, "tenant-1", Map.of("analystOutcome", "CONFIRM_SEVERITY",
                                           "analystId", "analyst-1")));

        long triageCount = ledgerRepo.savedAttestations.stream()
                .filter(a -> SocTrustDimensions.TRIAGE_ACCURACY.equals(a.trustDimension))
                .count();
        long containmentCount = ledgerRepo.savedAttestations.stream()
                .filter(a -> SocTrustDimensions.CONTAINMENT_APPROPRIATENESS.equals(a.trustDimension))
                .count();

        assertThat(triageCount).isEqualTo(3);
        assertThat(containmentCount).isEqualTo(1);
        assertThat(ledgerRepo.savedAttestations).hasSize(4);
    }
```

- [ ] **Step 8: Run tests to verify they all fail**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode test -pl app -am -Dtest="SocAttestationServiceTest" -Dsurefire.failIfNoSpecifiedTests=false`
Expected: compilation failure (SocAttestationService doesn't exist)

- [ ] **Step 9: Implement SocAttestationService**

```java
package io.casehub.soc.engine;

import io.casehub.api.spi.CaseOutcomeEvent;
import io.casehub.api.spi.CaseOutcomeObserver;
import io.casehub.ledger.api.model.AttestationVerdict;
import io.casehub.ledger.api.model.LedgerAttestation;
import io.casehub.ledger.api.spi.LedgerEntryRepository;
import io.casehub.ledger.model.WorkerDecisionEntry;
import io.casehub.ledger.repository.CaseLedgerEntryRepository;
import io.casehub.platform.api.identity.ActorType;
import io.casehub.soc.domain.SocCaseCapabilities;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.domain.SocTrustDimensions;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class SocAttestationService implements CaseOutcomeObserver {

    private static final Logger LOG = Logger.getLogger(SocAttestationService.class);
    private static final String SYSTEM_ATTESTOR = "system:soc-attestation";
    private static final Set<String> SUCCESS_OUTCOMES = Set.of("resolved", "escalated", "false-positive");

    private final CaseLedgerEntryRepository caseLedgerRepo;
    private final LedgerEntryRepository ledgerRepo;
    private final Clock clock;

    @Inject
    SocAttestationService(CaseLedgerEntryRepository caseLedgerRepo,
                          LedgerEntryRepository ledgerRepo, Clock clock) {
        this.caseLedgerRepo = caseLedgerRepo;
        this.ledgerRepo = ledgerRepo;
        this.clock = clock;
    }

    @Override
    public void onOutcome(CaseOutcomeEvent event) {
        if (!SocCaseTypes.INCIDENT_INVESTIGATION.equals(event.caseType())) return;
        if (!SUCCESS_OUTCOMES.contains(event.outcomeLabel())) return;
        QuarkusTransaction.requiringNew().run(() -> processOutcome(event));
    }

    void processOutcome(CaseOutcomeEvent event) {
        Map<String, Object> snapshot = event.caseFileSnapshot();
        String analystOutcome = resolveAnalystOutcome(snapshot, event.outcomeLabel());
        String analystId = resolveAnalystId(snapshot);
        ActorType attestorType = SYSTEM_ATTESTOR.equals(analystId)
                ? ActorType.SYSTEM : ActorType.HUMAN;

        List<WorkerDecisionEntry> decisions =
                caseLedgerRepo.findWorkerDecisionsByCaseId(event.caseId());
        if (decisions.isEmpty()) {
            LOG.warnf("No WorkerDecisionEntries for caseId=%s — skipping attestation", event.caseId());
            return;
        }

        AttestationVerdict triageVerdict = triageVerdict(analystOutcome);

        for (WorkerDecisionEntry entry : decisions) {
            writeIfAbsent(entry, SocTrustDimensions.TRIAGE_ACCURACY, triageVerdict,
                    analystId, attestorType, analystOutcome, event);

            if (SocCaseCapabilities.CONTAINMENT_RECOMMENDATION.equals(entry.capabilityTag)
                    && ("CONFIRM_SEVERITY".equals(analystOutcome)
                        || "DOWNGRADE".equals(analystOutcome))) {
                AttestationVerdict containmentVerdict =
                        "DOWNGRADE".equals(analystOutcome)
                                ? AttestationVerdict.FLAGGED : AttestationVerdict.SOUND;
                writeIfAbsent(entry, SocTrustDimensions.CONTAINMENT_APPROPRIATENESS,
                        containmentVerdict, analystId, attestorType, analystOutcome, event);
            }
        }
    }

    private void writeIfAbsent(WorkerDecisionEntry entry, String dimension,
            AttestationVerdict verdict, String attestorId, ActorType attestorType,
            String analystOutcome, CaseOutcomeEvent event) {
        boolean exists = ledgerRepo.findAttestationsByEntryId(entry.id, event.tenancyId())
                .stream()
                .anyMatch(a -> dimension.equals(a.trustDimension));
        if (exists) return;

        LedgerAttestation attestation = new LedgerAttestation();
        attestation.id = UUID.randomUUID();
        attestation.ledgerEntryId = entry.id;
        attestation.subjectId = event.caseId();
        attestation.attestorId = attestorId;
        attestation.attestorType = attestorType;
        attestation.attestorRole = "analyst-review-outcome";
        attestation.verdict = verdict;
        attestation.capabilityTag = entry.capabilityTag;
        attestation.trustDimension = dimension;
        attestation.confidence = 1.0;
        attestation.evidence = "analystOutcome=" + analystOutcome;
        attestation.occurredAt = clock.instant();

        try {
            ledgerRepo.saveAttestation(attestation, event.tenancyId());
        } catch (Exception e) {
            LOG.errorf(e, "Failed to save attestation for entryId=%s dimension=%s — attestation lost",
                    entry.id, dimension);
        }
    }

    private static AttestationVerdict triageVerdict(String analystOutcome) {
        return "FALSE_POSITIVE".equals(analystOutcome)
                ? AttestationVerdict.FLAGGED : AttestationVerdict.SOUND;
    }

    private static String resolveAnalystOutcome(Map<String, Object> snapshot, String outcomeLabel) {
        Object outcome = snapshot.get("analystOutcome");
        if (outcome instanceof String s && !s.isBlank()) return s;
        LOG.warnf("analystOutcome missing from context — inferring from outcomeLabel=%s", outcomeLabel);
        return switch (outcomeLabel) {
            case "false-positive" -> "FALSE_POSITIVE";
            case "escalated" -> "ESCALATE";
            default -> "CONFIRM_SEVERITY";
        };
    }

    private static String resolveAnalystId(Map<String, Object> snapshot) {
        Object id = snapshot.get("analystId");
        if (id instanceof String s && !s.isBlank()) return s;
        return SYSTEM_ATTESTOR;
    }
}
```

- [ ] **Step 10: Add test stubs at the bottom of the test file**

```java
    // ── Helpers ─────────────────────────────────────────────────────

    private static CaseOutcomeEvent event(String caseType, String outcomeLabel,
            Map<String, Object> snapshot) {
        return event(caseType, outcomeLabel, UUID.randomUUID(), "tenant-1", snapshot);
    }

    private static CaseOutcomeEvent event(String caseType, String outcomeLabel,
            UUID caseId, String tenancyId, Map<String, Object> snapshot) {
        return new CaseOutcomeEvent(caseType, tenancyId, caseId, snapshot,
                outcomeLabel, Instant.now(), Map.of());
    }

    static class StubCaseLedgerEntryRepository extends CaseLedgerEntryRepository {
        private final Map<UUID, List<WorkerDecisionEntry>> entriesByCaseId = new HashMap<>();

        UUID addWorkerDecision(UUID caseId, String workerId, String capabilityTag) {
            WorkerDecisionEntry entry = new WorkerDecisionEntry();
            entry.id = UUID.randomUUID();
            entry.workerId = workerId;
            entry.capabilityTag = capabilityTag;
            entry.caseId = caseId;
            entriesByCaseId.computeIfAbsent(caseId, k -> new ArrayList<>()).add(entry);
            return entry.id;
        }

        @Override
        public List<WorkerDecisionEntry> findWorkerDecisionsByCaseId(UUID caseId) {
            return entriesByCaseId.getOrDefault(caseId, List.of());
        }
    }

    static class StubLedgerEntryRepository implements LedgerEntryRepository {
        final List<LedgerAttestation> savedAttestations = new ArrayList<>();
        final List<String> savedTenancyIds = new ArrayList<>();
        private final Map<UUID, List<LedgerAttestation>> existingAttestations = new HashMap<>();

        void addExistingAttestation(UUID entryId, String trustDimension) {
            LedgerAttestation att = new LedgerAttestation();
            att.id = UUID.randomUUID();
            att.ledgerEntryId = entryId;
            att.trustDimension = trustDimension;
            existingAttestations.computeIfAbsent(entryId, k -> new ArrayList<>()).add(att);
        }

        @Override
        public LedgerAttestation saveAttestation(LedgerAttestation attestation, String tenancyId) {
            savedAttestations.add(attestation);
            savedTenancyIds.add(tenancyId);
            return attestation;
        }

        @Override
        public List<LedgerAttestation> findAttestationsByEntryId(UUID entryId, String tenancyId) {
            return existingAttestations.getOrDefault(entryId, List.of());
        }

        @Override public LedgerEntry save(LedgerEntry e, String t) { return e; }
        @Override public List<LedgerEntry> findBySubjectId(UUID s, String t) { return List.of(); }
        @Override public List<LedgerEntry> findBySubjectIdAndTimeRange(UUID s, java.time.Instant f, java.time.Instant to, String t) { return List.of(); }
        @Override public Optional<LedgerEntry> findLatestBySubjectId(UUID s, String t) { return Optional.empty(); }
        @Override public Optional<LedgerEntry> findEntryById(UUID i, String t) { return Optional.empty(); }
        @Override public List<LedgerEntry> findByActorId(String a, java.time.Instant f, java.time.Instant to, String t) { return List.of(); }
        @Override public List<LedgerEntry> findByActorRole(String r, java.time.Instant f, java.time.Instant to, String t) { return List.of(); }
        @Override public List<LedgerEntry> findCausedBy(UUID e, String t) { return List.of(); }
        @Override public List<LedgerAttestation> findAttestationsByEntryIdAndCapabilityTag(UUID e, String c, String t) { return List.of(); }
        @Override public List<LedgerAttestation> findAttestationsByEntryIdGlobal(UUID e, String t) { return List.of(); }
        @Override public List<LedgerAttestation> findAttestationsByAttestorIdAndCapabilityTag(String a, String c, String t) { return List.of(); }
    }
}
```

- [ ] **Step 11: Run all tests to verify they pass**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode test -pl app -am -Dtest="SocAttestationServiceTest" -Dsurefire.failIfNoSpecifiedTests=false`
Expected: all tests PASS

- [ ] **Step 12: Run full project test suite**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 26) mvn --batch-mode install`
Expected: BUILD SUCCESS — no regressions

- [ ] **Step 13: Commit**

```bash
git add app/src/main/java/io/casehub/soc/engine/SocAttestationService.java app/src/test/java/io/casehub/soc/engine/SocAttestationServiceTest.java
git commit -m "feat(#22): add SocAttestationService — trust attestation on case resolution"
```
