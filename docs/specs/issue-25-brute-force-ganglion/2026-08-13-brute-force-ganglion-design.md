# BruteForceDetectorGanglion — Design Spec

**Date:** 2026-08-13
**Issue:** casehubio/soc#25 — Slice 2: BruteForceDetectorGanglion situation definition
**Branch:** issue-25-brute-force-ganglion

---

## Overview

Second RAS situation definition for SOC — brute-force and credential-stuffing detection. A single Ganglion classifies authentication failure events; two situation definitions correlate them by different keys (source IP vs target account) with independent thresholds and windows. Thresholds are tenant-configurable via PreferenceKey.

---

## Component 1: BruteForceDetectorGanglion

### Approach

Extends `JavaSwitchGanglion` in `api/` (pure Java, no CDI). Classifies each authentication failure CloudEvent as DETECTED with a confidence score from a pluggable `BruteForceScorer` SPI. The Ganglion does not count events — the RAS `ChainMode.Count` handles threshold detection.

### Class

```java
public class BruteForceDetectorGanglion extends JavaSwitchGanglion {

    public static final String GANGLION_ID = "brute-force-detector";

    public static final Set<String> EVENT_TYPES = Set.of(
        "soc.alert.auth.failed-login",
        "soc.alert.auth.failed-mfa",
        "soc.alert.auth.account-lockout",
        "soc.alert.auth.password-spray"
    );

    private final BruteForceScorer scorer;

    public BruteForceDetectorGanglion(BruteForceScorer scorer) {
        super(GANGLION_ID, EVENT_TYPES);
        this.scorer = scorer;
    }

    public BruteForceDetectorGanglion() {
        this(BruteForceScorer.DEFAULT);
    }

    @Override
    protected DetectionResult evaluate(CloudEvent event, SituationContext context) {
        double confidence = scorer.score(event);
        Map<String, Object> evidence = extractEvidence(event);
        return detected(confidence, evidence);
    }
}
```

### Evidence Extraction

The Ganglion extracts evidence from CloudEvent extensions for downstream consumers (triage workers, analyst review, ledger entries):

```java
private Map<String, Object> extractEvidence(CloudEvent event) {
    Map<String, Object> evidence = new LinkedHashMap<>();
    evidence.put("eventType", event.getType());
    addIfPresent(evidence, event, "sourceip", "sourceIp");
    addIfPresent(evidence, event, "targetaccount", "targetAccount");
    addIfPresent(evidence, event, "authmethod", "authMethod");
    addIfPresent(evidence, event, "geolocation", "geolocation");
    return Map.copyOf(evidence);
}
```

### Module Placement

`api/` — follows `SiemAlertGanglion` pattern. Pure Java, no CDI dependencies. The Ganglion is instantiated by `SocGanglionProducer` in `app/`.

---

## Component 2: BruteForceScorer SPI

### Interface

```java
public interface BruteForceScorer {

    double score(CloudEvent event);

    BruteForceScorer DEFAULT = event -> 0.9;
}
```

Located in `api/` alongside the Ganglion. The default implementation returns 0.9 for all events — a flat confidence that lets the `Count` chain mode handle detection purely by frequency.

### Future Enrichment

A CDI `@Alternative` implementation in `app/` can override the default with variable confidence based on:
- Target account type (admin=0.95, service=0.85, user=0.7)
- Source IP reputation (known-bad=0.98, first-seen=0.9, internal=0.5)
- Time of day (business hours=0.7, off-hours=0.95)
- Auth method (password=0.9, MFA failure=0.95)

Not implemented in this issue — the SPI exists as the extension point.

---

## Component 3: Situation Definitions

### Two situations in `ras-situations.yaml`

```yaml
- situationId: soc-brute-force-by-source
  eventTypes:
    - soc.alert.auth.failed-login
    - soc.alert.auth.failed-mfa
    - soc.alert.auth.account-lockout
    - soc.alert.auth.password-spray
  correlationWindow: PT5M
  eventBufferDelay: PT10S
  correlationKeyExpression: ".extensions.sourceip"
  chainMode:
    type: count
    ganglionId: brute-force-detector
    requiredCount: 5
  triggerAction:
    type: create-case
    caseNamespace: io.casehub.soc
    caseName: incident-investigation
    caseVersion: "1.0.0"
    baseCaseData:
      priority: HIGH
      source: auth-brute-force

- situationId: soc-credential-stuffing-by-target
  eventTypes:
    - soc.alert.auth.failed-login
    - soc.alert.auth.failed-mfa
    - soc.alert.auth.account-lockout
    - soc.alert.auth.password-spray
  correlationWindow: PT1H
  eventBufferDelay: PT30S
  correlationKeyExpression: ".extensions.targetaccount"
  chainMode:
    type: count
    ganglionId: brute-force-detector
    requiredCount: 3
  triggerAction:
    type: create-case
    caseNamespace: io.casehub.soc
    caseName: incident-investigation
    caseVersion: "1.0.0"
    baseCaseData:
      priority: HIGH
      source: auth-credential-stuffing
```

### Key Differences

| | Brute-force by source | Credential stuffing by target |
|---|---|---|
| Correlation key | Source IP (`sourceip` extension) | Target account (`targetaccount` extension) |
| Required count | 5 | 3 (lower — fewer attempts against one account is more suspicious) |
| Correlation window | 5 minutes | 1 hour (wider — credential stuffing is slower, distributed) |
| Buffer delay | 10 seconds | 30 seconds |
| Case source | `auth-brute-force` | `auth-credential-stuffing` |

Both situations trigger the same case type (`incident-investigation`) — the investigation pipeline (IOC enrichment → ATT&CK mapping → containment → analyst review) handles both attack patterns. The `baseCaseData.source` field differentiates them in case context.

### Correlation Key Expressions

`correlationKeyExpression` is a JQ expression evaluated against a JSON representation of the CloudEvent. The RAS runtime evaluates it before calling `SituationEvaluator.evaluate()` to derive the correlation key.

- `.extensions.sourceip` → extracts the `sourceip` CloudEvent extension (set by the webhook adapter or SIEM integration)
- `.extensions.targetaccount` → extracts the `targetaccount` CloudEvent extension

If the expression returns null (extension missing), the event cannot be correlated and is dropped for that situation. This is safe — the other situation (with a different key expression) may still process it.

---

## Component 4: Ganglion Registration

### SocGanglionProducer Update

The existing `SocGanglionProducer` in `app/` registers `SiemAlertGanglion`. Add the new Ganglion:

```java
@Produces
Ganglion bruteForceDetectorGanglion() {
    return new BruteForceDetectorGanglion();
}
```

If a CDI `BruteForceScorer` bean exists (future enrichment), inject it:

```java
@Inject
Instance<BruteForceScorer> scorerInstance;

@Produces
Ganglion bruteForceDetectorGanglion() {
    BruteForceScorer scorer = scorerInstance.isResolvable()
        ? scorerInstance.get()
        : BruteForceScorer.DEFAULT;
    return new BruteForceDetectorGanglion(scorer);
}
```

---

## Component 5: Tenant-Configurable Thresholds

### PreferenceKeys

```java
public final class SocPreferences {
    public static final PreferenceKey<IntPreference> BRUTE_FORCE_COUNT =
        new PreferenceKey<>("soc", "bruteForceCount",
            IntPreference.of(5), IntPreference::parse);

    public static final PreferenceKey<IntPreference> CREDENTIAL_STUFFING_COUNT =
        new PreferenceKey<>("soc", "credentialStuffingCount",
            IntPreference.of(3), IntPreference::parse);
}
```

**Note:** The `ChainMode.Count.requiredCount` in the YAML is the static default. For tenant-level override, the `SituationEvaluator` would need to read preferences at evaluation time and apply the count dynamically. This depends on whether the RAS runtime supports preference-driven chain mode overrides.

**If RAS does not support dynamic chain mode:** The PreferenceKeys serve as documentation of the intended configurability. The static YAML values are the operational defaults. File a platform issue on casehubio/ras for preference-driven chain mode configuration if needed.

**If RAS supports it:** The evaluator reads `SocPreferences.BRUTE_FORCE_COUNT` at the scope path and overrides `requiredCount` per tenant.

Verify at implementation time by checking `SituationEvaluator` for preference integration.

---

## Testing Strategy

### Unit Tests

**BruteForceDetectorGanglionTest** — plain JUnit:
- Each event type returns DETECTED with scorer confidence
- Evidence extraction includes sourceIp, targetAccount, authMethod when present in extensions
- Missing extensions produce evidence without those fields (no NPE)
- Custom scorer is used when provided
- Default scorer returns 0.9

### Integration Tests

**BruteForceIntegrationTest** — `@QuarkusTest`:
- Ganglion registered via SocGanglionProducer
- Both situation definitions loaded from `ras-situations.yaml`
- 5 failed-login CloudEvents with same `sourceip` within 5 minutes → case created with `source=auth-brute-force`
- 3 failed-login CloudEvents with same `targetaccount` within 1 hour → case created with `source=auth-credential-stuffing`
- 4 events (below threshold) → no case created
- Events with missing `sourceip` extension → no brute-force situation (graceful handling)

---

## Files Changed

| File | Change |
|---|---|
| `api/src/main/java/io/casehub/soc/detection/BruteForceDetectorGanglion.java` | New — Ganglion implementation |
| `api/src/main/java/io/casehub/soc/detection/BruteForceScorer.java` | New — scoring SPI |
| `app/src/main/java/io/casehub/soc/engine/SocGanglionProducer.java` | Modify — add brute-force producer |
| `app/src/main/resources/META-INF/ras-situations.yaml` | Modify — add two situation definitions |
| `api/src/test/java/io/casehub/soc/detection/BruteForceDetectorGanglionTest.java` | New — unit tests |
| `app/src/test/java/io/casehub/soc/integration/BruteForceIntegrationTest.java` | New — integration test |
