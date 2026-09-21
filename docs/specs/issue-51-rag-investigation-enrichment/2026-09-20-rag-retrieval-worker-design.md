# RAG Retrieval Worker — Wire CaseRetriever Into Investigation Pipeline

**Issue:** #57 — RAG retrieval worker for investigation pipeline
**Parent:** Epic #51 — RAG-powered investigation enrichment
**Date:** 2026-09-20

---

## Problem

Investigation workers produce ATT&CK technique mappings and IOC enrichment, but the investigation has no way to surface the prose knowledge that makes those mappings actionable — technique descriptions, detection guidance, group TTPs, mitigation advice. The structural MindMap index (from #56) answers "what else does this group use?" via graph traversal, but not "explain how credential dumping works and how to detect it." The RAG corpus populated by #56's ATT&CK ingestion contains this prose — nothing queries it yet.

## Approach

A new investigation capability `rag-retrieval` fires after `attck-mapping` in the pipeline. It constructs a natural language query from the alert context + ATT&CK technique names + IOC types, retrieves semantically relevant chunks from the ATT&CK prose corpus via `CaseRetriever`, and surfaces the results at `.ragEnrichment` in the case context for the analyst review and downstream workers.

The retrieval service isolates query construction from retrieval mechanics (Decision D8), making future extraction to a platform-level pattern straightforward when a second app (AML, clinical) needs the same capability (casehubio/neocortex#371).

## Pipeline Position

The `rag-retrieval` capability fires after `attck-mapping` and before `containment-recommendation`. This position gives it the richest query signal — alert data, IOC enrichment, and ATT&CK technique names are all available.

```
cbr-retrieval → ioc-enrichment → attck-mapping → rag-retrieval → containment-recommendation → analyst-review → ...
```

The trade-off: RAG results are not available to the `attck-mapping` worker itself. This is acceptable — attck-mapping uses the structural MindMap index for graph queries (related groups, mitigations, sub-techniques), not prose retrieval. The two representations serve different purposes (Decision D3).

## New Components

### SocRagRetrieveService

`@ApplicationScoped` CDI bean wrapping `CaseRetriever`. Owns query construction, corpus targeting, and result mapping. Follows the `SocCbrRetrieveService` pattern (Decision D7).

```java
@ApplicationScoped
public class SocRagRetrieveService {

    private static final int MAX_RESULTS = 10;

    @Inject CaseRetriever caseRetriever;

    public List<Map<String, Object>> retrieve(
            Map<String, Object> caseContext, String tenantId) {
        String queryText = buildQueryText(caseContext);
        if (queryText.isBlank()) {
            Log.debug("No searchable content in context — skipping RAG retrieval");
            return List.of();
        }

        try {
            var query = RetrievalQuery.of(queryText);
            var corpus = new CorpusRef(
                AttckConstants.REFERENCE_TENANT, AttckConstants.CORPUS_NAME);
            List<RetrievedChunk> chunks =
                caseRetriever.retrieve(query, corpus, MAX_RESULTS);

            Log.infof("RAG retrieved %d chunk(s) for tenant=%s",
                chunks.size(), tenantId);
            return chunks.stream().map(this::toSerializable).toList();
        } catch (Exception e) {
            Log.warnf(e, "RAG retrieval failed — returning empty list");
            return List.of();
        }
    }
}
```

**Query construction** — isolated as an internal method for future extraction (Decision D8):

```java
String buildQueryText(Map<String, Object> caseContext) {
    var parts = new ArrayList<String>();

    // 1. Alert anchor text
    @SuppressWarnings("unchecked")
    var alert = (Map<String, Object>) caseContext.getOrDefault("alert", Map.of());
    addIfPresent(parts, alert, "rule");
    addIfPresent(parts, alert, "description");

    // 2. ATT&CK technique names from mapping output
    @SuppressWarnings("unchecked")
    var attckMapping = (Map<String, Object>)
        caseContext.getOrDefault("attckMapping", Map.of());
    @SuppressWarnings("unchecked")
    var techniques = (List<Map<String, Object>>)
        attckMapping.getOrDefault("techniques", List.of());
    for (var t : techniques) {
        addIfPresent(parts, t, "technique");
    }

    // 3. IOC type keywords
    @SuppressWarnings("unchecked")
    var iocEnrichment = (Map<String, Object>)
        caseContext.getOrDefault("iocEnrichment", Map.of());
    @SuppressWarnings("unchecked")
    var iocs = (List<Map<String, Object>>)
        iocEnrichment.getOrDefault("iocs", List.of());
    for (var ioc : iocs) {
        addIfPresent(parts, ioc, "type");
    }

    return String.join(" ", parts);
}

private static void addIfPresent(
        List<String> parts, Map<String, Object> map, String key) {
    Object value = map.get(key);
    if (value instanceof String s && !s.isBlank()) {
        parts.add(s);
    }
}
```

Example constructed query: `"Suspicious credential access T1003 T1003.001 hash_md5 ip_address"`

**Result mapping** — `RetrievedChunk` to serializable map:

```java
private Map<String, Object> toSerializable(RetrievedChunk chunk) {
    var result = new LinkedHashMap<String, Object>();
    result.put("content", chunk.content());
    result.put("sourceDocumentId", chunk.sourceDocumentId());
    result.put("relevanceScore", chunk.relevanceScore());
    chunk.metadata().forEach(result::put);
    return Collections.unmodifiableMap(result);
}
```

This flattens chunk metadata (`mitreId`, `name`, `type`, `tactics`) into the result map. The metadata fields were set during ATT&CK ingestion (#56) — see §Prose → RAG Corpus in the ATT&CK design spec.

Example result entry:
```json
{
  "content": "Adversaries may attempt to dump credentials to obtain account login...",
  "sourceDocumentId": "T1003",
  "relevanceScore": 0.87,
  "mitreId": "T1003",
  "name": "OS Credential Dumping",
  "type": "attack-technique",
  "tactics": "credential-access"
}
```

**Platform consolidation (neocortex#372):** The generic retrieval + result mapping + error handling + multi-corpus logic is extracted to `CaseContextRetriever` in neocortex (next to `CaseRetriever`). This class owns:
- Calling `CaseRetriever.retrieve()` per corpus
- Mapping `RetrievedChunk` → serializable `Map<String, Object>` (flattening metadata)
- Error handling (catch, log, return empty)
- Multi-corpus iteration and result merging

`SocRagRetrieveService` reduces to:
```java
@ApplicationScoped
public class SocRagRetrieveService {

    @Inject CaseContextRetriever contextRetriever;

    public List<Map<String, Object>> retrieve(
            Map<String, Object> caseContext, String tenantId) {
        String queryText = buildQueryText(caseContext);
        return contextRetriever.retrieve(queryText);
    }

    // SOC-specific: knows which fields to extract from case context
    String buildQueryText(Map<String, Object> caseContext) { /* as above */ }
}
```

Other apps (AML, clinical) implement their own `buildQueryText` and inject the same `CaseContextRetriever`. No duplication of retrieval mechanics.

**Multi-corpus extension (#58):** When internal knowledge ingestion lands, the corpus list is configured on `CaseContextRetriever` — SOC's `buildQueryText` doesn't change.

**Platform evolution (neocortex#370):** If MindMap content search lands, the corpus ref may change — `CaseContextRetriever` is corpus-configurable.

**Package:** `io.casehub.soc.engine.rag`

### RuleRagRetrievalWorker

Thin worker shell following the `RuleCbrRetrievalWorker` pattern. The worker owns nothing but the delegation — all logic lives in `SocRagRetrieveService`.

```java
public final class RuleRagRetrievalWorker {

    static final String DEFAULT_TENANT = "278776f9-e1b0-46fb-9032-8bddebdcf9ce";

    private RuleRagRetrievalWorker() {}

    public static Worker create(SocRagRetrieveService retrieveService) {
        return Worker.builder()
                .name("rule-rag-retrieval")
                .capabilityName("rag-retrieval")
                .function((Map<String, Object> input) -> {
                    List<Map<String, Object>> results =
                        retrieveService.retrieve(input, DEFAULT_TENANT);
                    String summary = results.isEmpty()
                        ? "No relevant threat intelligence found"
                        : results.size() + " relevant chunk(s) retrieved";
                    return WorkerResult.of(Map.of(
                        "retrievedChunks", results,
                        "summary", summary));
                })
                .build();
    }
}
```

**Package:** `io.casehub.soc.worker`

## Pipeline Wiring

### incident-investigation.yaml

New capability definition:

```yaml
- name: rag-retrieval
  description: "Retrieve relevant threat intel prose from RAG corpora"
  inputProjection: "{ alert: .alert, iocEnrichment: .iocEnrichment, attckMapping: .attckMapping }"
  outputProjection: "{ ragEnrichment: ., incidentStatus: \"INVESTIGATING\" }"
```

New binding (fires after attck-mapping, before containment-recommendation):

```yaml
- name: rag-retrieval
  on: { contextChange: {} }
  when: ".attckMapping != null and .ragEnrichment == null"
  capability: rag-retrieval
```

Update `containment-recommendation` input projection to include RAG results:

```yaml
- name: containment-recommendation
  inputProjection: "{ alert: .alert, iocEnrichment: .iocEnrichment, attckMapping: .attckMapping, retrievedIncidents: .retrievedIncidents, ragEnrichment: .ragEnrichment }"
```

Update `analyst-review` input mapping to surface RAG results:

```yaml
inputMapping: >-
  {
    incidentId: .caseId,
    priority: .alert.severity,
    alert: .alert,
    iocEnrichment: .iocEnrichment,
    attckMapping: .attckMapping,
    containmentRecommendation: .containmentRecommendation,
    retrievedIncidents: .retrievedIncidents,
    ragEnrichment: .ragEnrichment
  }
```

### SocCaseHub

Add injection and wiring:

```java
@Inject
SocRagRetrieveService ragRetrieveService;

@Override
protected void augment(CaseDefinition definition) {
    var descriptor = new SocInvestigationCaseDescriptor(
        null, cbrRetrieveService, containmentExecutor,
        attckEnrichmentService, ragRetrieveService);
    definition.getWorkers().addAll(descriptor.workers());
    definition.setAgentDescriptors(SocAgentDescriptors.descriptorsByWorkerName());
}
```

### SocInvestigationCaseDescriptor

Add constructor parameter and worker registration:

```java
SocInvestigationCaseDescriptor(ChatModel llmModel,
                               SocCbrRetrieveService cbrRetrieveService,
                               ContainmentExecutor containmentExecutor,
                               AttckEnrichmentService attckEnrichmentService,
                               SocRagRetrieveService ragRetrieveService) {
    // ...
}

List<Worker> workers() {
    return List.of(
            RuleCbrRetrievalWorker.create(cbrRetrieveService),
            RuleIocEnrichmentWorker.create(),
            LlmIocEnrichmentWorker.create(llmModel),
            RuleAttckMappingWorker.create(attckEnrichmentService),
            LlmAttckMappingWorker.create(llmModel),
            RuleRagRetrievalWorker.create(ragRetrieveService),  // NEW
            RuleContainmentRecommendationWorker.create(),
            // ...
    );
}
```

## Testing Strategy

### Unit tests

- **`SocRagRetrieveServiceTest`** — mock `CaseRetriever`:
  - `buildQueryText` with full context (alert + ATT&CK + IOCs) produces expected concatenation
  - `buildQueryText` with partial context (alert only, no ATT&CK mapping) produces alert-only query
  - `buildQueryText` with empty context returns blank → `retrieve` returns empty list without calling CaseRetriever
  - `retrieve` maps `RetrievedChunk` fields correctly to serializable map (content, sourceDocumentId, relevanceScore, metadata)
  - `retrieve` passes correct `CorpusRef(REFERENCE_TENANT, CORPUS_NAME)` and `MAX_RESULTS` to CaseRetriever
  - `retrieve` returns empty list and logs warning when CaseRetriever throws

- **`RuleRagRetrievalWorkerTest`** — mock `SocRagRetrieveService`:
  - Worker name is `"rule-rag-retrieval"`, capability name is `"rag-retrieval"`
  - Delegates to service with input map and DEFAULT_TENANT
  - Returns WorkerResult with `"retrievedChunks"` and `"summary"` keys
  - Empty results produce `"No relevant threat intelligence found"` summary
  - Non-empty results produce count-based summary

### Integration test (deferred — blocked by casehubio/qhorus#438)

- **`RagRetrievalIntegrationTest`** (`@QuarkusTest` with `InMemoryCaseRetriever`) — ingest sample ATT&CK chunks, fire the full pipeline, verify RAG results appear in case context alongside CBR results. Blocked by the same SNAPSHOT CDI deployment issue as #56's integration tests.

## Failure Modes

| Failure | Behavior |
|---|---|
| Empty case context (no alert, no ATT&CK) | `buildQueryText` returns blank → return empty list, no retrieval call |
| CaseRetriever unavailable | Catch exception, log warning, return empty list. Pipeline continues without RAG enrichment — analyst sees CBR and ATT&CK mapping but no prose context. |
| No matching chunks | Return empty list with summary "No relevant threat intelligence found" |
| ATT&CK corpus not populated (ingestion disabled/failed) | CaseRetriever returns empty list — same as no match. No error. |
| Slow retrieval (>500ms) | Not gated — CaseRetriever handles timeout internally. Service logs retrieval count for observability. |

## Dependencies

### Maven dependencies (existing — already added by #56)

No new Maven dependencies required. `casehub-neocortex-rag-api` (provides `CaseRetriever`, `RetrievalQuery`, `RetrievedChunk`, `CorpusRef`, `PayloadFilter`) and `casehub-neocortex-rag-testing` (provides `InMemoryCaseRetriever`) are already in the POM from #56.

## Platform Issues Filed

- **casehubio/neocortex#370** — MindMap content search: make node text searchable without full RAG embedding. Would eliminate the dual-ingestion pattern (MindMap + separate RAG ingest). Not all MindMap nodes are prose-rich enough for embedding — keyword/BM25 search over node names and properties covers the spectrum.
- **casehubio/neocortex#371** — Case-context retrieval pattern: generic query extraction SPI (superseded by #372 — consolidate now instead of later).
- **casehubio/neocortex#372** — CaseContextRetriever: extract the generic retrieval + result mapping + error handling + multi-corpus logic from SOC's `SocRagRetrieveService` into a reusable neocortex class. **Blocks SOC refactor** — SOC pauses until this lands, then replaces inline retrieval with `CaseContextRetriever` injection.

## References

- `CaseRetriever.java` — neocortex RAG retrieval SPI (`retrieve(RetrievalQuery, CorpusRef, int, PayloadFilter)`)
- `RetrievalQuery.java` — query record with `of(String)`, expansion, weight multipliers
- `RetrievedChunk.java` — result record with content, sourceDocumentId, relevanceScore, metadata
- `PayloadFilter.java` — rich filtering (Eq, In, And, Or, Not, Gte, Lte, Range)
- `CorpusRef` — tenant + corpus name pair
- `SocCbrRetrieveService.java` — existing CBR retrieval pattern (D7 reference)
- `RuleCbrRetrievalWorker.java` — existing thin worker pattern (D7 reference)
- `SocInvestigationCaseDescriptor.java` — worker assembly and DI wiring
- `SocCaseHub.java` — CDI injection point for services
- `incident-investigation.yaml` — pipeline capability and binding definitions
- `specs/issue-51-rag-investigation-enrichment/2026-09-15-attck-stix-ingestion-design.md` — ATT&CK ingestion spec (§Prose → RAG Corpus, §Metadata for #57)
- `specs/issue-51-rag-investigation-enrichment/decisions.md` — D1–D8
- `AttckConstants.java` — REFERENCE_TENANT, CORPUS_NAME constants
- `InMemoryCaseRetriever` — test double for unit tests
