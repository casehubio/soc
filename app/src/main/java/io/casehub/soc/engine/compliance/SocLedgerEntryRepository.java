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
}
