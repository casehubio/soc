package io.casehub.soc.engine.compliance;

import io.casehub.ledger.api.model.LedgerAttestation;
import io.casehub.ledger.api.model.LedgerEntry;
import io.casehub.ledger.api.spi.LedgerEntryRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

class StubLedgerEntryRepository implements LedgerEntryRepository {
    LedgerEntry lastSaved;
    String lastTenancyId;
    int latestSequence = 0;

    @Override
    public LedgerEntry save(LedgerEntry entry, String tenancyId) {
        lastSaved = entry;
        lastTenancyId = tenancyId;
        return entry;
    }

    @Override
    public Optional<LedgerEntry> findLatestBySubjectId(UUID subjectId, String tenancyId) {
        if (latestSequence == 0) return Optional.empty();
        SocLedgerEntry e = new SocLedgerEntry();
        e.sequenceNumber = latestSequence;
        return Optional.of(e);
    }

    @Override public List<LedgerEntry> findBySubjectId(UUID s, String t) { return List.of(); }
    @Override public List<LedgerEntry> findBySubjectIdAndTimeRange(UUID s, Instant f, Instant to, String t) { return List.of(); }
    @Override public Optional<LedgerEntry> findEntryById(UUID i, String t) { return Optional.empty(); }
    @Override public List<LedgerEntry> findByActorId(String a, Instant f, Instant to, String t) { return List.of(); }
    @Override public List<LedgerEntry> findByActorRole(String r, Instant f, Instant to, String t) { return List.of(); }
    @Override public List<LedgerEntry> findCausedBy(UUID e, String t) { return List.of(); }
    @Override public LedgerAttestation saveAttestation(LedgerAttestation a, String t) { return a; }
    @Override public List<LedgerAttestation> findAttestationsByEntryId(UUID e, String t) { return List.of(); }
    @Override public List<LedgerAttestation> findAttestationsByEntryIdAndCapabilityTag(UUID e, String c, String t) { return List.of(); }
    @Override public List<LedgerAttestation> findAttestationsByEntryIdGlobal(UUID e, String t) { return List.of(); }
    @Override public List<LedgerAttestation> findAttestationsByAttestorIdAndCapabilityTag(String a, String c, String t) { return List.of(); }
}
