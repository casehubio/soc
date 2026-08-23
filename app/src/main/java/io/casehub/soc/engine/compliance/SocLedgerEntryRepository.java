package io.casehub.soc.engine.compliance;

import io.casehub.ledger.runtime.persistence.LedgerPersistenceUnit;
import io.casehub.soc.domain.SocStepType;
import io.quarkus.arc.DefaultBean;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@DefaultBean
@ApplicationScoped
public class SocLedgerEntryRepository {

    @Inject @LedgerPersistenceUnit EntityManager em;

    @Transactional
    public List<SocLedgerEntry> findByIncidentId(UUID incidentId, String tenancyId) {
        return em.createQuery(
                "SELECT e FROM SocLedgerEntry e WHERE e.incidentId = :incidentId AND e.tenancyId = :tenancyId ORDER BY e.sequenceNumber ASC",
                SocLedgerEntry.class)
            .setParameter("incidentId", incidentId)
            .setParameter("tenancyId", tenancyId)
            .getResultList();
    }

    @Transactional
    public List<SocLedgerEntry> findByTimeRange(Instant from, Instant to, String tenancyId) {
        return em.createQuery(
                "SELECT e FROM SocLedgerEntry e WHERE e.occurredAt >= :from AND e.occurredAt <= :to AND e.tenancyId = :tenancyId ORDER BY e.occurredAt ASC",
                SocLedgerEntry.class)
            .setParameter("from", from)
            .setParameter("to", to)
            .setParameter("tenancyId", tenancyId)
            .getResultList();
    }

    @Transactional
    public List<SocLedgerEntry> findByStepType(SocStepType stepType, String tenancyId) {
        return em.createQuery(
                "SELECT e FROM SocLedgerEntry e WHERE e.stepType = :stepType AND e.tenancyId = :tenancyId ORDER BY e.occurredAt ASC",
                SocLedgerEntry.class)
            .setParameter("stepType", stepType)
            .setParameter("tenancyId", tenancyId)
            .getResultList();
    }

    private record FilteredQuery(String jpql, java.util.Map<String, Object> params) {}

    private static FilteredQuery buildFilteredQuery(String select,
                                                    java.time.Instant from, java.time.Instant to,
                                                    SocStepType stepType, String actorId, java.util.UUID incidentId,
                                                    String tenancyId) {
        StringBuilder jpql = new StringBuilder(select)
                                     .append(" FROM SocLedgerEntry e WHERE e.occurredAt >= :from AND e.occurredAt <= :to AND e.tenancyId = :tenancyId");
        java.util.Map<String, Object> params = new java.util.LinkedHashMap<>();
        params.put("from", from);
        params.put("to", to);
        params.put("tenancyId", tenancyId);
        if (stepType != null) {
            jpql.append(" AND e.stepType = :stepType");
            params.put("stepType", stepType);
        }
        if (actorId != null) {
            jpql.append(" AND e.actorId = :actorId");
            params.put("actorId", actorId);
        }
        if (incidentId != null) {
            jpql.append(" AND e.incidentId = :incidentId");
            params.put("incidentId", incidentId);
        }
        return new FilteredQuery(jpql.toString(), params);
    }

    @jakarta.transaction.Transactional
    public List<SocLedgerEntry> findFiltered(
            java.time.Instant from, java.time.Instant to,
            SocStepType stepType, String actorId, java.util.UUID incidentId,
            int page, int size, String tenancyId) {
        var fq = buildFilteredQuery("SELECT e", from, to, stepType, actorId, incidentId, tenancyId);
        var query = em.createQuery(fq.jpql() + " ORDER BY e.occurredAt DESC", SocLedgerEntry.class)
                      .setFirstResult(page * size)
                      .setMaxResults(size);
        fq.params().forEach(query::setParameter);
        return query.getResultList();
    }

    @jakarta.transaction.Transactional
    public long countFiltered(
            java.time.Instant from, java.time.Instant to,
            SocStepType stepType, String actorId, java.util.UUID incidentId,
            String tenancyId) {
        var fq = buildFilteredQuery("SELECT COUNT(e)", from, to, stepType, actorId, incidentId, tenancyId);
        var query = em.createQuery(fq.jpql(), Long.class);
        fq.params().forEach(query::setParameter);
        return query.getSingleResult();
    }

    @jakarta.transaction.Transactional
    public List<String> findDistinctActors(java.time.Instant from, java.time.Instant to, String tenancyId) {
        return em.createQuery(
                         "SELECT DISTINCT e.actorId FROM SocLedgerEntry e WHERE e.occurredAt >= :from AND e.occurredAt <= :to AND e.tenancyId = :tenancyId AND e.actorId IS NOT NULL ORDER BY e.actorId ASC",
                         String.class)
                 .setParameter("from", from)
                 .setParameter("to", to)
                 .setParameter("tenancyId", tenancyId)
                 .getResultList();
    }
}
