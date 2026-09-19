package io.casehub.soc.engine;

import io.casehub.api.context.CaseContext;
import io.casehub.api.model.CaseChannel;
import io.casehub.engine.common.internal.model.CaseInstance;
import io.casehub.engine.common.spi.CaseInstanceRepository;
import io.casehub.engine.common.spi.query.CaseInstanceQuery;
import io.casehub.platform.api.identity.CurrentPrincipal;
import io.casehub.platform.api.mcp.McpDomain;
import io.casehub.platform.api.mcp.PaginatedResponse;
import io.casehub.platform.api.mcp.PathParam;
import io.casehub.platform.api.mcp.PlatformMutation;
import io.casehub.platform.api.mcp.PlatformQuery;
import io.casehub.platform.api.mcp.RestPath;
import io.casehub.qhorus.api.channel.ChannelReader;
import io.casehub.soc.domain.SocCaseTypes;
import io.casehub.soc.rest.dto.AttckMappingResponse;
import io.casehub.soc.rest.dto.AttckTechniqueResponse;
import io.casehub.soc.rest.dto.ChannelResponse;
import io.casehub.soc.rest.dto.IncidentDetailResponse;
import io.casehub.soc.rest.dto.IncidentSummaryResponse;
import io.casehub.soc.rest.dto.IocListResponse;
import io.casehub.soc.rest.dto.IocResponse;
import io.casehub.soc.rest.dto.IocSubmissionRequest;
import io.casehub.soc.rest.dto.IocSubmissionResponse;
import io.casehub.soc.rest.dto.TimelineEntryResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.QueryParam;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@McpDomain(value = "soc/incidents", basePath = "/api/soc/incidents")
@ApplicationScoped
public class SocIncidentApi {

    private static final Set<String> VALID_IOC_TYPES =
        Set.of("IP", "HASH", "DOMAIN", "URL", "EMAIL");

    @Inject CaseInstanceRepository repository;
    @Inject CurrentPrincipal currentPrincipal;
    @Inject ChannelReader channelReader;

    @PlatformQuery("List incidents with pagination")
    @RestPath("/")
    @PaginatedResponse(totalCountMethod = "totalIncidents")
    public List<IncidentSummaryResponse> listIncidents(
            @QueryParam("page") Integer page,
            @QueryParam("size") Integer size) {
        String tenancyId = currentPrincipal.tenancyId();
        CaseInstanceQuery query = CaseInstanceQuery.builder()
            .name(SocCaseTypes.INCIDENT_INVESTIGATION)
            .page(page != null ? page : 0)
            .size(size != null ? size : 50)
            .build();
        return repository.query(query, tenancyId).stream()
            .map(this::toSummary).toList();
    }

    public long totalIncidents() {
        String tenancyId = currentPrincipal.tenancyId();
        CaseInstanceQuery query = CaseInstanceQuery.builder()
            .name(SocCaseTypes.INCIDENT_INVESTIGATION).build();
        return repository.count(query, tenancyId);
    }

    @PlatformQuery("Get incident details")
    @RestPath("/{id}")
    public IncidentDetailResponse getIncident(@PathParam UUID id) {
        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null) return null;
        var ctx = ci.getCaseContext();
        return new IncidentDetailResponse(
            ci.getUuid(),
            ctx != null ? stringOrDefault(ctx, "incidentStatus", "UNKNOWN") : "UNKNOWN",
            ctx != null ? stringOrDefault(ctx, "alertSeverity", "UNKNOWN") : "UNKNOWN",
            ctx != null ? stringOrDefault(ctx, "alertSource", "unknown") : "unknown",
            ctx != null ? stringOrDefault(ctx, "incidentTitle", "Untitled Incident") : "Untitled Incident",
            ci.getCreatedAt(),
            ctx != null ? ctx.getString("correlationKey") : null);
    }

    @PlatformQuery("Get incident audit timeline")
    @RestPath("/{id}/timeline")
    @SuppressWarnings("unchecked")
    public List<TimelineEntryResponse> getTimeline(@PathParam UUID id) {
        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null || ci.getCaseContext() == null) return List.of();
        Object trail = ci.getCaseContext().get("auditTrail");
        if (trail instanceof List<?> list) {
            return list.stream()
                .filter(Map.class::isInstance)
                .map(e -> {
                    var m = (Map<String, Object>) e;
                    return new TimelineEntryResponse(
                        m.get("action") instanceof String s ? s : null,
                        m.get("actor") instanceof String s ? s : null,
                        m.get("timestamp") instanceof Instant t ? t : null,
                        m.get("detail") instanceof String s ? s : null);
                }).toList();
        }
        return List.of();
    }

    @PlatformQuery("Get communication channels for an incident")
    @RestPath("/{id}/channels")
    public List<ChannelResponse> getChannels(@PathParam UUID id) {
        String prefix = CaseChannel.CASE_CHANNEL_PREFIX + id + "/";
        return channelReader.findByNamePrefix(prefix).stream()
            .map(ch -> new ChannelResponse(ch.name(),
                ch.description() != null ? ch.description() : ""))
            .toList();
    }

    @PlatformQuery("Get IOCs for an incident")
    @RestPath("/{id}/iocs")
    @SuppressWarnings("unchecked")
    public IocListResponse getIocs(@PathParam UUID id) {
        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null || ci.getCaseContext() == null)
            return new IocListResponse(List.of());
        Object enrichment = ci.getCaseContext().get("iocEnrichment");
        if (enrichment instanceof Map<?, ?> m) {
            Object iocs = m.get("iocs");
            if (iocs instanceof List<?> list) {
                return new IocListResponse(list.stream()
                    .filter(Map.class::isInstance)
                    .map(e -> mapToIocResponse((Map<String, Object>) e))
                    .toList());
            }
        }
        return new IocListResponse(List.of());
    }

    @PlatformQuery("Get ATT&CK mapping for an incident")
    @RestPath("/{id}/attck")
    @SuppressWarnings("unchecked")
    public AttckMappingResponse getAttck(@PathParam UUID id) {
        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null || ci.getCaseContext() == null)
            return new AttckMappingResponse(List.of());
        Object mapping = ci.getCaseContext().get("attckMapping");
        if (mapping instanceof Map<?, ?> m) {
            Object techniques = m.get("techniques");
            if (techniques instanceof List<?> list) {
                return new AttckMappingResponse(list.stream()
                    .filter(Map.class::isInstance)
                    .map(e -> {
                        var t = (Map<String, Object>) e;
                        return new AttckTechniqueResponse(
                            t.get("techniqueId") instanceof String s ? s : null,
                            t.get("name") instanceof String s ? s : null,
                            t.get("tactic") instanceof String s ? s : null,
                            t.get("confidence") instanceof Number n ? n.doubleValue() : 0.0);
                    }).toList());
            }
        }
        return new AttckMappingResponse(List.of());
    }

    @PlatformMutation("Submit an IOC for an incident")
    @RestPath("/{id}/iocs")
    @SuppressWarnings("unchecked")
    public IocSubmissionResponse submitIoc(@PathParam UUID id,
                                           IocSubmissionRequest request) {
        if (request.type() == null || !VALID_IOC_TYPES.contains(request.type())) {
            throw new BadRequestException("Invalid or missing IOC type");
        }
        if (request.value() == null || request.value().isBlank()) {
            throw new BadRequestException("Missing IOC value");
        }
        if (request.confidence() == null || request.confidence() < 0.0
                || request.confidence() > 1.0) {
            throw new BadRequestException("Confidence must be 0.0-1.0");
        }

        CaseInstance ci = repository.findByUuid(id, currentPrincipal.tenancyId());
        if (ci == null) {
            throw new BadRequestException("Incident not found");
        }

        Map<String, Object> ioc = new LinkedHashMap<>();
        ioc.put("type", request.type());
        ioc.put("value", request.value());
        ioc.put("confidence", request.confidence());
        ioc.put("source", "manual-submission");
        ioc.put("firstSeen", Instant.now().toString());
        ioc.put("tags", List.of());

        CaseContext ctx = ci.getCaseContext();
        Object existing = ctx.get("iocEnrichment");
        List<Map<String, Object>> iocList;
        if (existing instanceof List<?> list) {
            iocList = new ArrayList<>((List<Map<String, Object>>) list);
        } else {
            iocList = new ArrayList<>();
        }
        iocList.add(ioc);
        ctx.set("iocEnrichment", iocList);

        return new IocSubmissionResponse(
            iocList.stream().map(this::mapToIocResponse).toList());
    }

    private IncidentSummaryResponse toSummary(CaseInstance ci) {
        var ctx = ci.getCaseContext();
        return new IncidentSummaryResponse(
            ci.getUuid(),
            ctx != null ? stringOrDefault(ctx, "incidentStatus", "UNKNOWN") : "UNKNOWN",
            ctx != null ? stringOrDefault(ctx, "alertSeverity", "UNKNOWN") : "UNKNOWN",
            ctx != null ? stringOrDefault(ctx, "alertSource", "unknown") : "unknown",
            ctx != null ? stringOrDefault(ctx, "incidentTitle", "Untitled Incident")
                : "Untitled Incident",
            ci.getCreatedAt());
    }

    @SuppressWarnings("unchecked")
    private IocResponse mapToIocResponse(Map<String, Object> m) {
        return new IocResponse(
            m.get("type") instanceof String s ? s : null,
            m.get("value") instanceof String s ? s : null,
            m.get("confidence") instanceof Number n ? n.doubleValue() : 0.0,
            m.get("source") instanceof String s ? s : null,
            m.get("firstSeen") instanceof String s ? Instant.parse(s) : null,
            m.get("tags") instanceof List<?> l
                ? l.stream().map(String::valueOf).toList() : List.of());
    }

    private static String stringOrDefault(CaseContext ctx, String key, String defaultValue) {
        String val = ctx.getString(key);
        return val != null ? val : defaultValue;
    }
}
