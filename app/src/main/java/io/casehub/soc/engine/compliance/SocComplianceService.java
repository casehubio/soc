package io.casehub.soc.engine.compliance;

import io.casehub.ledger.runtime.service.LedgerVerificationService;
import io.casehub.ledger.runtime.service.model.InclusionProof;
import io.casehub.soc.domain.DoraResponseTimeReport;
import io.casehub.soc.domain.PriorityStats;
import io.casehub.soc.domain.SocPreferences;
import io.casehub.soc.domain.SocStepType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class SocComplianceService {

    private static final Map<String, Duration> SLA_WINDOWS = Map.of(
        "CRITICAL", SocPreferences.P1_RESPONSE_WINDOW.defaultValue().duration(),
        "HIGH", SocPreferences.P2_RESPONSE_WINDOW.defaultValue().duration(),
        "MEDIUM", SocPreferences.P3_RESPONSE_WINDOW.defaultValue().duration(),
        "LOW", SocPreferences.P4_RESPONSE_WINDOW.defaultValue().duration()
    );

    private final LedgerVerificationService verificationService;
    private final SocLedgerEntryRepository socRepo;
    private final SocPiiSanitiser sanitiser;

    @Inject
    SocComplianceService(LedgerVerificationService verificationService,
                         SocLedgerEntryRepository socRepo,
                         SocPiiSanitiser sanitiser) {
        this.verificationService = verificationService;
        this.socRepo = socRepo;
        this.sanitiser = sanitiser;
    }

    public InclusionProof inclusionProof(UUID entryId, String tenancyId) {
        return verificationService.inclusionProof(entryId, tenancyId);
    }

    public List<SocLedgerEntry> incidentTimeline(UUID incidentId, String tenancyId) {
        List<SocLedgerEntry> entries = socRepo.findByIncidentId(incidentId, tenancyId);
        List<SocLedgerEntry> result = new ArrayList<>(entries.size());
        for (SocLedgerEntry entry : entries) {
            SocLedgerEntry copy = new SocLedgerEntry();
            copy.id = entry.id;
            copy.incidentId = entry.incidentId;
            copy.subjectId = entry.subjectId;
            copy.stepType = entry.stepType;
            copy.sequenceNumber = entry.sequenceNumber;
            copy.entryType = entry.entryType;
            copy.actorId = entry.actorId;
            copy.actorRole = entry.actorRole;
            copy.actorType = entry.actorType;
            copy.occurredAt = entry.occurredAt;
            copy.causedByEntryId = entry.causedByEntryId;
            copy.tenancyId = entry.tenancyId;
            copy.metadata = sanitiser.sanitise(entry.metadata);
            result.add(copy);
        }
        return result;
    }

    public DoraResponseTimeReport doraReport(Instant from, Instant to, String tenancyId) {
        List<SocLedgerEntry> entries = socRepo.findByTimeRange(from, to, tenancyId);
        Map<UUID, List<SocLedgerEntry>> byIncident = entries.stream()
                .collect(Collectors.groupingBy(e -> e.incidentId));

        Map<String, List<Duration>> resolutionTimesByPriority = new HashMap<>();
        Map<String, List<Duration>> containmentTimesByPriority = new HashMap<>();

        for (var incidentEntries : byIncident.values()) {
            SocLedgerEntry triage = findByType(incidentEntries, SocStepType.ALERT_TRIAGE);
            SocLedgerEntry resolved = findByType(incidentEntries, SocStepType.INCIDENT_RESOLVED);
            SocLedgerEntry containment = findByType(incidentEntries, SocStepType.CONTAINMENT_DECISION);
            if (triage == null) continue;

            String priority = extractPriority(triage.metadata);

            if (resolved != null) {
                Duration total = Duration.between(triage.occurredAt, resolved.occurredAt);
                resolutionTimesByPriority.computeIfAbsent(priority, k -> new ArrayList<>()).add(total);
            }
            if (containment != null) {
                Duration toContainment = Duration.between(triage.occurredAt, containment.occurredAt);
                containmentTimesByPriority.computeIfAbsent(priority, k -> new ArrayList<>()).add(toContainment);
            }
        }

        Map<String, PriorityStats> byPriority = new HashMap<>();
        for (String priority : resolutionTimesByPriority.keySet()) {
            List<Duration> resolutionTimes = resolutionTimesByPriority.getOrDefault(priority, List.of());
            List<Duration> containmentTimes = containmentTimesByPriority.getOrDefault(priority, List.of());
            Duration slaWindow = SLA_WINDOWS.getOrDefault(priority, Duration.ofHours(24));
            long compliant = resolutionTimes.stream().filter(d -> d.compareTo(slaWindow) <= 0).count();
            double slaPercent = resolutionTimes.isEmpty() ? 0.0 : (double) compliant / resolutionTimes.size();

            byPriority.put(priority, new PriorityStats(
                resolutionTimes.size(),
                Duration.ZERO,
                containmentTimes.isEmpty() ? Duration.ZERO : avg(containmentTimes),
                resolutionTimes.isEmpty() ? Duration.ZERO : avg(resolutionTimes),
                slaPercent
            ));
        }

        return new DoraResponseTimeReport(from, to, byIncident.size(), byPriority);
    }

    private static SocLedgerEntry findByType(List<SocLedgerEntry> entries, SocStepType type) {
        return entries.stream().filter(e -> e.stepType == type).findFirst().orElse(null);
    }

    private static String extractPriority(String metadata) {
        if (metadata == null) return "UNKNOWN";
        int idx = metadata.indexOf("\"assignedSeverity\":\"");
        if (idx < 0) return "UNKNOWN";
        int start = idx + "\"assignedSeverity\":\"".length();
        int end = metadata.indexOf("\"", start);
        return end > start ? metadata.substring(start, end) : "UNKNOWN";
    }

    private static Duration avg(List<Duration> durations) {
        long totalMillis = durations.stream().mapToLong(Duration::toMillis).sum();
        return Duration.ofMillis(totalMillis / durations.size());
    }
}
