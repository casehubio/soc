package io.casehub.soc.engine.compliance;

import io.casehub.ledger.runtime.service.LedgerVerificationService;
import io.casehub.ledger.runtime.service.model.InclusionProof;
import io.casehub.soc.domain.ComplianceRequirement;
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
import java.util.Set;
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
        return sanitiseEntries(entries);}

    private List<SocLedgerEntry> sanitiseEntries(List<SocLedgerEntry> entries) {
        List<SocLedgerEntry> result = new ArrayList<>(entries.size());
        for (SocLedgerEntry entry : entries) {
            SocLedgerEntry copy = new SocLedgerEntry();
            copy.id              = entry.id;
            copy.incidentId      = entry.incidentId;
            copy.subjectId       = entry.subjectId;
            copy.stepType        = entry.stepType;
            copy.sequenceNumber  = entry.sequenceNumber;
            copy.entryType       = entry.entryType;
            copy.actorId         = entry.actorId;
            copy.actorRole       = entry.actorRole;
            copy.actorType       = entry.actorType;
            copy.occurredAt      = entry.occurredAt;
            copy.causedByEntryId = entry.causedByEntryId;
            copy.tenancyId       = entry.tenancyId;
            copy.metadata        = sanitiser.sanitise(entry.metadata);
            result.add(copy);
        }
        return result;
    }

    public PagedAuditEntries filteredEntries(
            Instant from, Instant to,
            SocStepType stepType, String actorId, UUID incidentId,
            int page, int size, String tenancyId) {
        List<SocLedgerEntry> entries = socRepo.findFiltered(
                from, to, stepType, actorId, incidentId, page, size, tenancyId);
        long total = socRepo.countFiltered(
                from, to, stepType, actorId, incidentId, tenancyId);
        List<SocLedgerEntry> sanitised  = sanitiseEntries(entries);
        int                  totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
        return new PagedAuditEntries(sanitised, total, totalPages, page, size);
    }

    public List<String> distinctActors(Instant from, Instant to, String tenancyId) {
        return socRepo.findDistinctActors(from, to, tenancyId);
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

    public List<ComplianceRequirement> complianceSummary(Instant from, Instant to, String tenancyId) {
        List<ComplianceRequirement> reqs       = new ArrayList<>();
        List<SocLedgerEntry>        allEntries = socRepo.findByTimeRange(from, to, tenancyId);

        DoraResponseTimeReport dora = doraReport(from, to, tenancyId);
        var priorities = List.of(
                Map.entry("P1", "CRITICAL"), Map.entry("P2", "HIGH"),
                Map.entry("P3", "MEDIUM"), Map.entry("P4", "LOW"));
        for (var entry : priorities) {
            PriorityStats stats = dora.byPriority().get(entry.getValue());
            if (stats == null || stats.count() == 0) {continue;}
            Duration slaWindow = SLA_WINDOWS.get(entry.getValue());
            String   slaLabel  = slaWindow.toMinutes() < 60 ? slaWindow.toMinutes() + "m" : slaWindow.toHours() + "h";
            reqs.add(new ComplianceRequirement("DORA",
                                               entry.getKey() + " response ≤" + slaLabel,
                                               "SLA window from SocPreferences",
                                               classifyCompliance(stats.slaCompliancePercent()),
                                               "/api/soc/compliance/dora?from=" + from + "&to=" + to));
        }

        List<SocLedgerEntry> containmentDecisions = allEntries.stream()
                                                              .filter(e -> e.stepType == SocStepType.CONTAINMENT_DECISION).toList();
        if (!containmentDecisions.isEmpty()) {
            long withApprover = containmentDecisions.stream()
                                                    .filter(e -> hasNonEmptyJsonField(e.metadata, "approverId"))
                                                    .count();
            double pct = (double) withApprover / containmentDecisions.size();
            reqs.add(new ComplianceRequirement("SOC2",
                                               "Containment authorisation",
                                               "approverId in CONTAINMENT_DECISION metadata",
                                               classifyCompliance(pct),
                                               "/api/soc/compliance/entries?stepType=CONTAINMENT_DECISION&from=" + from + "&to=" + to));
        }

        Map<UUID, Set<SocStepType>> stepTypesByIncident = allEntries.stream()
                                                                    .collect(Collectors.groupingBy(e -> e.incidentId,
                                                                                                   Collectors.mapping(e -> e.stepType, Collectors.toSet())));
        Map<UUID, Set<SocStepType>> resolvedIncidents = stepTypesByIncident.entrySet().stream()
                                                                           .filter(e -> e.getValue().contains(SocStepType.INCIDENT_RESOLVED))
                                                                           .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        if (!resolvedIncidents.isEmpty()) {
            int MIN_COMPLETE_STEP_TYPES = 4;
            long complete = resolvedIncidents.values().stream()
                                             .filter(types -> types.size() >= MIN_COMPLETE_STEP_TYPES).count();
            double pct = (double) complete / resolvedIncidents.size();
            reqs.add(new ComplianceRequirement("SOC2",
                                               "Audit trail completeness",
                                               "≥4 distinct step types per resolved incident",
                                               classifyCompliance(pct),
                                               "/api/soc/compliance/entries?from=" + from + "&to=" + to));
        }

        Map<UUID, List<SocLedgerEntry>> byIncident = allEntries.stream()
                                                               .collect(Collectors.groupingBy(e -> e.incidentId));
        long triageWithin30m   = 0, triageTotal = 0;
        long resolvedWithin24h = 0, resolvedTotal = 0;
        for (var incidentEntries : byIncident.values()) {
            SocLedgerEntry triage   = findByType(incidentEntries, SocStepType.ALERT_TRIAGE);
            SocLedgerEntry promoted = findByType(incidentEntries, SocStepType.INCIDENT_PROMOTED);
            SocLedgerEntry resolved = findByType(incidentEntries, SocStepType.INCIDENT_RESOLVED);
            if (triage != null && promoted != null) {
                triageTotal++;
                if (Duration.between(triage.occurredAt, promoted.occurredAt).toMinutes() <= 30) {triageWithin30m++;}
            }
            if (triage != null && resolved != null) {
                resolvedTotal++;
                if (Duration.between(triage.occurredAt, resolved.occurredAt).toHours() <= 24) {resolvedWithin24h++;}
            }
        }
        if (triageTotal > 0) {
            reqs.add(new ComplianceRequirement("NIS2",
                                               "Initial triage ≤30m",
                                               "Time from ALERT_TRIAGE to INCIDENT_PROMOTED",
                                               classifyCompliance((double) triageWithin30m / triageTotal),
                                               "/api/soc/compliance/entries?stepType=ALERT_TRIAGE&from=" + from + "&to=" + to));
        }
        if (resolvedTotal > 0) {
            reqs.add(new ComplianceRequirement("NIS2",
                                               "Incident reporting ≤24h (proxy)",
                                               "Time from ALERT_TRIAGE to INCIDENT_RESOLVED",
                                               classifyCompliance((double) resolvedWithin24h / resolvedTotal),
                                               "/api/soc/compliance/entries?from=" + from + "&to=" + to));
        }

        return reqs;
    }

    private static String classifyCompliance(double pct) {
        if (pct >= 1.0) {return "MET";}
        if (pct >= 0.9) {return "PARTIAL";}
        if (pct >= 0.7) {return "GAP";}
        return "BREACHED";
    }

    private static boolean hasNonEmptyJsonField(String metadata, String field) {
        if (metadata == null) {return false;}
        String key = "\"" + field + "\":\"";
        int    idx = metadata.indexOf(key);
        if (idx < 0) {return false;}
        int start = idx + key.length();
        int end   = metadata.indexOf("\"", start);
        return end > start;
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
