package io.casehub.soc.engine.rag;

import io.casehub.neocortex.rag.CaseContextRetriever;
import io.casehub.neocortex.rag.CaseRetriever;
import io.casehub.neocortex.rag.CorpusRef;
import io.casehub.neocortex.rag.RetrievedChunk;
import io.casehub.neocortex.rag.testing.InMemoryCaseRetriever;
import io.casehub.soc.threatintel.attck.AttckConstants;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;

class SocRagRetrieveServiceTest {

    @Test
    void buildQueryTextIncludesAlertAndTechniquesAndIocTypes() {
        var service = serviceWith(List.of());
        var context = Map.<String, Object>of(
            "alert", Map.of("rule", "Credential Dumping Detected",
                            "description", "Suspicious LSASS access"),
            "attckMapping", Map.of("techniques", List.of(
                Map.of("technique", "T1003"),
                Map.of("technique", "T1003.001"))),
            "iocEnrichment", Map.of("iocs", List.of(
                Map.of("type", "hash_md5"),
                Map.of("type", "ip_address"))));

        String query = service.buildQueryText(context);

        assertThat(query).contains("Credential Dumping Detected");
        assertThat(query).contains("Suspicious LSASS access");
        assertThat(query).contains("T1003");
        assertThat(query).contains("T1003.001");
        assertThat(query).contains("hash_md5");
        assertThat(query).contains("ip_address");
    }

    @Test
    void buildQueryTextWithAlertOnly() {
        var service = serviceWith(List.of());
        var context = Map.<String, Object>of(
            "alert", Map.of("rule", "Brute Force Attempt"));

        String query = service.buildQueryText(context);

        assertThat(query).isEqualTo("Brute Force Attempt");
    }

    @Test
    void buildQueryTextEmptyContextReturnsBlank() {
        var service = serviceWith(List.of());

        String query = service.buildQueryText(Map.of());

        assertThat(query).isBlank();
    }

    @Test
    void retrieveMapsChunksToSerializableResults() {
        var chunk = new RetrievedChunk(
            "Adversaries may dump credentials...", "T1003", 0.87,
            Map.of("mitreId", "T1003", "name", "OS Credential Dumping",
                   "type", "attack-technique", "tactics", "credential-access"));
        var service = serviceWith(List.of(chunk));
        var context = Map.<String, Object>of(
            "alert", Map.of("rule", "Credential Dumping"));

        var results = service.retrieve(context, "test-tenant");

        assertThat(results).hasSize(1);
        var result = results.get(0);
        assertThat(result.get("content")).isEqualTo("Adversaries may dump credentials...");
        assertThat(result.get("sourceDocumentId")).isEqualTo("T1003");
        assertThat(result.get("relevanceScore")).isEqualTo(0.87);
        assertThat(result.get("mitreId")).isEqualTo("T1003");
        assertThat(result.get("name")).isEqualTo("OS Credential Dumping");
        assertThat(result.get("type")).isEqualTo("attack-technique");
        assertThat(result.get("tactics")).isEqualTo("credential-access");
    }

    @Test
    void retrieveWithEmptyContextReturnsEmptyWithoutCallingRetriever() {
        var service = serviceWith(List.of());

        var results = service.retrieve(Map.of(), "test-tenant");

        assertThat(results).isEmpty();
    }

    @Test
    void retrieveReturnsEmptyOnRetrieverException() {
        var service = new SocRagRetrieveService();
        service.contextRetriever = new CaseContextRetriever((query, corpus, maxResults, filter) -> {
            throw new RuntimeException("Connection refused");
        });
        var context = Map.<String, Object>of(
            "alert", Map.of("rule", "Some Alert"));

        var results = service.retrieve(context, "test-tenant");

        assertThat(results).isEmpty();
    }

    @Test
    void retrieveQueriesBothAttckAndInternalKnowledgeCorpora() {
        var queriedCorpora = new CopyOnWriteArrayList<CorpusRef>();
        CaseRetriever capturingRetriever = (query, corpus, maxResults, filter) -> {
            queriedCorpora.add(corpus);
            return List.of();
        };
        var service = new SocRagRetrieveService();
        service.contextRetriever = new CaseContextRetriever(capturingRetriever);
        var context = Map.<String, Object>of("alert", Map.of("rule", "Test Alert"));

        service.retrieve(context, "tenant-acme");

        assertThat(queriedCorpora).extracting(CorpusRef::tenantId)
                                  .contains(AttckConstants.REFERENCE_TENANT, "tenant-acme");
        assertThat(queriedCorpora).extracting(CorpusRef::corpusName)
                                  .contains(AttckConstants.CORPUS_NAME, SocKnowledgeConstants.CORPUS_NAME);
    }


    private static SocRagRetrieveService serviceWith(List<RetrievedChunk> chunks) {
        var service = new SocRagRetrieveService();
        service.contextRetriever = new CaseContextRetriever(InMemoryCaseRetriever.returning(chunks));
        return service;
    }
}
