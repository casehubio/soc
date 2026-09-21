## D1: ATT&CK ingestion module location

**Choice:** In SOC (app/) — SOC-specific ingestion service
**Alternatives:**
- In neocortex as a reusable module — but ATT&CK is SOC-specific; other apps have different threat models
- Separate repo (casehub-threatintel) — maximum isolation but deployment overhead for one pipeline
**Rationale:** ATT&CK is a SOC domain concern. SOC depends on mindmap-api + rag-api (already available). Keeps neocortex generic.
**Trade-offs:** Other CaseHub apps wanting STIX ingestion would need to duplicate or extract later.
**Sources:** neocortex exploration (MindMap API, CaseRetriever API), SOC worker architecture
**Exploration:** quick
**Status:** captured

## D2: ATT&CK data load strategy

**Choice:** Startup ingestion via @Startup CDI bean — check if ATT&CK subgraph exists, ingest from classpath STIX bundle if not, version-stamped for re-ingestion on updates
**Alternatives:**
- CLI/admin endpoint — more control but requires operator action
- Background async — app usable before ingestion but partial-readiness handling adds complexity
**Rationale:** One-time cost (~30s on first boot), automatic, no operator action needed. Version stamp ensures re-ingestion when ATT&CK data updates.
**Trade-offs:** Adds ~30s to first cold start. Subsequent starts skip if version matches.
**Sources:** neocortex MindMapStore.createSubgraph(), EmbeddingIngestor.ingest()
**Exploration:** quick
**Status:** captured

## D3: AttckLookupTable migration strategy

**Choice:** Keep both — AttckLookupTable stays for fast deterministic mapping, RuleAttckMappingWorker ALSO queries MindMap for related techniques, groups, and mitigations to enrich its output
**Alternatives:**
- Replace with MindMap — more consistent but adds latency and hard dependency on ingestion
- Keep separate, don't touch — simplest but misses enrichment opportunity
**Rationale:** No breaking change to existing pipeline. The static table handles the fast path; MindMap provides the context that makes the output richer (related groups, mitigations, sub-techniques).
**Trade-offs:** Two sources of ATT&CK truth. Static table could drift from MindMap if not kept in sync.
**Depends on:** D2 (startup ingestion must populate MindMap before workers fire)
**Sources:** AttckLookupTable.java, RuleAttckMappingWorker.java, MindMapStore.neighbors()
**Exploration:** quick
**Status:** captured

## D4: RAG retrieval worker pipeline position and corpus scope

**Choice:** Single worker after attck-mapping, queries the ATT&CK corpus now and internal knowledge corpus when #58 lands. One integration point for all RAG retrieval during investigation.
**Alternatives:**
- Two separate workers per corpus (ATT&CK prose after attck-mapping, internal knowledge after CBR) — more targeted queries but more wiring and two capability slots
- Fire alongside CBR before ATT&CK mapping — faster to surface but misses technique context that makes queries more targeted
**Rationale:** ATT&CK technique IDs and names from the mapping step give the strongest query signal. A single worker can target multiple corpora with PayloadFilter for type-scoped results. When #58 adds internal knowledge, adding another CorpusRef to the same worker avoids wiring a new pipeline stage.
**Trade-offs:** Runs later in the pipeline (after attck-mapping), so RAG results are not available to the attck-mapping worker itself. This is acceptable — attck-mapping uses the structural MindMap index, not prose retrieval.
**Sources:** incident-investigation.yaml (pipeline ordering), CaseRetriever SPI, ATT&CK design spec §Metadata for #57
**Exploration:** quick
**Status:** captured

## D5: RAG query construction strategy

**Choice:** Concatenate the most semantically rich fields into a single natural language query: alert rule name + alert description + top ATT&CK technique names + IOC types. Use PayloadFilter to optionally narrow by tactic or entity type. One retrieval call per corpus.
**Alternatives:**
- Structured multi-query: separate retrieval per ATT&CK technique with PayloadFilter.eq("mitreId", techniqueId), then merge and deduplicate — more precise per-technique but N retrievals per invocation, requires fusion logic
- Two-phase: broad query then targeted follow-up per technique using PayloadFilter — highest recall but doubles latency and complexity
**Rationale:** Hybrid search engine already handles keyword + semantic matching, so a well-constructed query with technique names naturally retrieves relevant prose. PayloadFilter narrows results without separate queries. 500ms latency budget (epic DoD) is tight — one retrieval call per corpus keeps it achievable.
**Trade-offs:** Less precise than per-technique queries for cases with many mapped techniques. Mitigated by relevance scoring and maxResults cap.
**Sources:** CaseRetriever.retrieve(), RetrievalQuery.of(), PayloadFilter, epic #51 DoD (500ms latency)
**Exploration:** quick
**Status:** captured

## D6: RAG result surfacing in case context

**Choice:** New top-level key `ragEnrichment` in the case context. Structured result with list of retrieved chunks (content, source, relevance score, metadata), summary count, and source corpus attribution. Downstream workers and analyst review reference `.ragEnrichment` in their inputProjection.
**Alternatives:**
- Merge into existing `.attckMapping` as a `ragContext` field — keeps ATT&CK data together but couples RAG output to attck-mapping schema and makes the two workers aware of each other's output format
**Rationale:** Follows the established pattern: each capability owns its output key. Workers are independently testable. Analyst review binding's inputMapping is explicit about data sources — adding `ragEnrichment: .ragEnrichment` is a one-line change.
**Trade-offs:** One more field in the case context. Not a real concern — the context already has retrievedIncidents, iocEnrichment, attckMapping, containmentRecommendation.
**Sources:** incident-investigation.yaml outputProjection patterns, SocInvestigationCaseDescriptor.workers()
**Exploration:** quick
**Status:** captured

## D7: RAG retrieval service pattern

**Choice:** New `SocRagRetrieveService` CDI bean (@ApplicationScoped) wrapping CaseRetriever. Injected into SocCaseHub, passed through SocInvestigationCaseDescriptor to the worker factory. The service owns query construction, corpus targeting, and result mapping. The worker is a thin shell.
**Alternatives:**
- Inline everything in the worker factory — fewer classes but harder to test independently, and grows when #58 adds internal knowledge corpus logic
**Rationale:** Follows the SocCbrRetrieveService pattern. Service is independently unit-testable with a mock CaseRetriever. Natural place to add multi-corpus logic when #58 lands.
**Trade-offs:** One more class. Trivial cost for better testability and separation.
**Depends on:** D4 (single worker → single service handles all corpus retrieval)
**Sources:** SocCbrRetrieveService.java, RuleCbrRetrievalWorker.java, CaseRetriever SPI
**Exploration:** quick
**Status:** captured

## D8: Consolidate generic retrieval into neocortex now

**Choice:** Extract the generic retrieval + result mapping + error handling + multi-corpus logic into `CaseContextRetriever` in neocortex now, rather than waiting for a second consumer. SOC keeps only `buildQueryText()` (the domain-specific query extraction). Filed as neocortex#372.
**Alternatives:**
- Ship SOC-only, extract later — was the original D8 choice; revised after discussion. The generic part is ~40 lines and the extraction boundary is clean, so deferral adds no value.
- Tight coupling to ATT&CK corpus — would require refactoring when #58 or auto-indexing (neocortex#370) lands
**Rationale:** The generic piece is small, well-defined, and already proven in SOC's implementation. Cross-repo work is not a concern. Consolidating now means AML/clinical get it for free when they need investigation-time RAG retrieval.
**Trade-offs:** SOC pauses on the refactor until neocortex#372 lands, then replaces inline retrieval with `CaseContextRetriever` injection.
**Depends on:** D4 (single worker → single service), D7 (CDI service pattern)
**Sources:** SocRagRetrieveService.java (proven implementation), CaseRetriever.java, casehubio/neocortex#372
**Exploration:** quick
**Status:** revised (was: extraction-ready for later; now: consolidate immediately)
