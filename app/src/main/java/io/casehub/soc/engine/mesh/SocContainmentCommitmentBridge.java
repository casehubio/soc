package io.casehub.soc.engine.mesh;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.casehub.api.model.CaseChannel;
import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.qhorus.api.channel.Channel;
import io.casehub.qhorus.api.channel.ChannelCreateRequest;
import io.casehub.qhorus.api.channel.ChannelManager;
import io.casehub.qhorus.api.message.DispatchResult;
import io.casehub.qhorus.api.message.MessageDispatch;
import io.casehub.qhorus.api.message.MessageDispatcher;
import io.casehub.qhorus.api.message.MessageType;
import io.casehub.platform.api.identity.ActorType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.ObservesAsync;
import jakarta.inject.Inject;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.jboss.logging.Logger;

@ApplicationScoped
public class SocContainmentCommitmentBridge {

  private static final Logger LOG = Logger.getLogger(SocContainmentCommitmentBridge.class);
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final String CASE_DEF_NAME = "incident-investigation";
  private static final String SENDER_RECOMMENDATION = "system:containment-recommendation";
  private static final String SENDER_EXECUTION = "system:containment-execution";

  private final ChannelManager channelManager;
  private final MessageDispatcher messageDispatcher;
  private final ConcurrentHashMap<UUID, OversightChannelState> stateMap = new ConcurrentHashMap<>();
  private final Set<String> processedSignals = ConcurrentHashMap.newKeySet();

  @Inject
  public SocContainmentCommitmentBridge(
      ChannelManager channelManager, MessageDispatcher messageDispatcher) {
    this.channelManager = channelManager;
    this.messageDispatcher = messageDispatcher;
  }

  void onLifecycle(@ObservesAsync CaseLifecycleEvent event) {
    if (!CASE_DEF_NAME.equals(event.caseDefinitionName())) return;
    if (event.contextSnapshot() == null) return;

    JsonNode ctx = event.contextSnapshot();
    UUID caseId = event.caseId();

    handleGatePendingIfPresent(caseId, ctx);
    handleAutonomousIfPresent(caseId, ctx);
    handleApprovalIfPresent(caseId, ctx);
    handleRejectionIfPresent(caseId, ctx);
    handleExecutionIfPresent(caseId, ctx);
  }

  private void handleGatePendingIfPresent(UUID caseId, JsonNode ctx) {
    String gateDecision = ctx.path("containmentGateDecision").asText(null);
    if (!"GATED".equals(gateDecision)) return;

    String key = caseId + ":propose";
    if (!processedSignals.add(key)) return;

    JsonNode rec = ctx.path("containmentRecommendation");
    String actionType = rec.path("recommendedAction").asText("UNKNOWN");
    String correlationId = correlationId(caseId, actionType);

    Channel channel = ensureOversightChannel(caseId);
    String content = buildProposeContent(rec, caseId);

    DispatchResult result =
        messageDispatcher.dispatch(
            MessageDispatch.builder()
                .channelId(channel.id())
                .sender(SENDER_RECOMMENDATION)
                .type(MessageType.PROPOSE)
                .actorType(ActorType.SYSTEM)
                .content(content)
                .correlationId(correlationId)
                .target("role:soc-manager")
                .build());

    stateMap.put(caseId, new OversightChannelState(channel.id(), result.messageId(), actionType));
    LOG.infof(
        "PROPOSE dispatched for case %s action %s (messageId=%d)",
        caseId, actionType, result.messageId());
  }

  private void handleAutonomousIfPresent(UUID caseId, JsonNode ctx) {
    String gateDecision = ctx.path("containmentGateDecision").asText(null);
    if (!"AUTONOMOUS".equals(gateDecision)) return;

    String key = caseId + ":autonomous";
    if (!processedSignals.add(key)) return;

    Channel channel = ensureOversightChannel(caseId);
    JsonNode rec = ctx.path("containmentRecommendation");
    String content = buildAutonomousContent(rec);

    messageDispatcher.dispatch(
        MessageDispatch.builder()
            .channelId(channel.id())
            .sender(SENDER_RECOMMENDATION)
            .type(MessageType.STATUS)
            .actorType(ActorType.SYSTEM)
            .content(content)
            .build());

    LOG.infof(
        "STATUS (autonomous) dispatched for case %s action %s",
        caseId, rec.path("recommendedAction").asText());
  }

  private void handleApprovalIfPresent(UUID caseId, JsonNode ctx) {
    JsonNode approved = ctx.path("actionGateApproved");
    if (approved.isMissingNode() || !approved.isObject()) return;

    String key = caseId + ":done";
    if (!processedSignals.add(key)) return;

    OversightChannelState state = stateMap.get(caseId);
    if (state == null) {
      LOG.warnf("No PROPOSE state for case %s — skipping DONE dispatch", caseId);
      return;
    }

    String actionType = approved.path("actionType").asText(state.actionType());
    String approverId = approved.path("approvedBy").asText("unknown");
    String correlationId = correlationId(caseId, actionType);
    String content = buildApprovalContent(approved);

    messageDispatcher.dispatch(
        MessageDispatch.builder()
            .channelId(state.channelId())
            .sender(approverId)
            .type(MessageType.DONE)
            .actorType(ActorType.HUMAN)
            .content(content)
            .correlationId(correlationId)
            .inReplyTo(state.proposeMessageId())
            .build());

    LOG.infof("DONE dispatched for case %s action %s (approver=%s)", caseId, actionType, approverId);
  }

  private void handleRejectionIfPresent(UUID caseId, JsonNode ctx) {
    JsonNode rejected = ctx.path("actionGateRejected");
    if (rejected.isMissingNode() || !rejected.isObject()) return;

    String key = caseId + ":decline";
    if (!processedSignals.add(key)) return;

    OversightChannelState state = stateMap.get(caseId);
    if (state == null) {
      LOG.warnf("No PROPOSE state for case %s — skipping DECLINE dispatch", caseId);
      return;
    }

    String actionType = rejected.path("actionType").asText(state.actionType());
    String rejectorId = rejected.path("rejectedBy").asText("unknown");
    String correlationId = correlationId(caseId, actionType);
    String content = buildRejectionContent(rejected);

    messageDispatcher.dispatch(
        MessageDispatch.builder()
            .channelId(state.channelId())
            .sender(rejectorId)
            .type(MessageType.DECLINE)
            .actorType(ActorType.HUMAN)
            .content(content)
            .correlationId(correlationId)
            .inReplyTo(state.proposeMessageId())
            .build());

    LOG.infof(
        "DECLINE dispatched for case %s action %s (rejector=%s)", caseId, actionType, rejectorId);
  }

  private void handleExecutionIfPresent(UUID caseId, JsonNode ctx) {
    JsonNode exec = ctx.path("containmentExecution");
    if (exec.isMissingNode() || !exec.isObject()) return;

    String key = caseId + ":execution";
    if (!processedSignals.add(key)) return;

    OversightChannelState state = stateMap.get(caseId);
    UUID channelId = state != null ? state.channelId() : ensureOversightChannel(caseId).id();
    String actionType = exec.path("actionType").asText("UNKNOWN");
    String correlationId = correlationId(caseId, actionType);
    String content = buildExecutionContent(exec);

    messageDispatcher.dispatch(
        MessageDispatch.builder()
            .channelId(channelId)
            .sender(SENDER_EXECUTION)
            .type(MessageType.STATUS)
            .actorType(ActorType.SYSTEM)
            .content(content)
            .correlationId(correlationId)
            .build());

    LOG.infof("STATUS (execution) dispatched for case %s action %s", caseId, actionType);
  }

  Channel ensureOversightChannel(UUID caseId) {
    String channelName = CaseChannel.channelName(caseId, "oversight");
    ChannelCreateRequest request =
        ChannelCreateRequest.builder(channelName)
            .description("SOC containment governance — case " + caseId)
            .deniedTypes(Set.of(MessageType.EVENT))
            .build();
    return channelManager.findOrCreate(request).channel();
  }

  void clearState(UUID caseId) {
    stateMap.remove(caseId);
    processedSignals.removeIf(k -> k.startsWith(caseId.toString()));
  }

  private static String correlationId(UUID caseId, String actionType) {
    return "gate-" + caseId + "-" + actionType;
  }

  private static String buildProposeContent(JsonNode rec, UUID caseId) {
    ObjectNode node = MAPPER.createObjectNode();
    node.put("action", rec.path("recommendedAction").asText());
    node.put("riskScore", rec.path("riskScore").asDouble());
    node.put("confidenceScore", rec.path("confidenceScore").asDouble());
    node.put("rationale", rec.path("rationale").asText(""));
    node.set("parameters", rec.path("actionParameters").deepCopy());
    node.put("severity", rec.path("severity").asText(""));
    node.put("incidentId", caseId.toString());
    return writeJson(node);
  }

  private static String buildApprovalContent(JsonNode approved) {
    ObjectNode node = MAPPER.createObjectNode();
    node.put("resolution", approved.path("resolution").asText(""));
    node.put("approverId", approved.path("approvedBy").asText("unknown"));
    return writeJson(node);
  }

  private static String buildRejectionContent(JsonNode rejected) {
    ObjectNode node = MAPPER.createObjectNode();
    node.put("rejectionReason", rejected.path("reason").asText(rejected.path("rejectionReason").asText("")));
    node.put("rejectorId", rejected.path("rejectedBy").asText("unknown"));
    return writeJson(node);
  }

  private static String buildExecutionContent(JsonNode exec) {
    ObjectNode node = MAPPER.createObjectNode();
    node.put("actionType", exec.path("actionType").asText("UNKNOWN"));
    node.put("executed", exec.path("executed").asBoolean(false));
    node.put("success", exec.path("success").asBoolean(false));
    node.put("detectionToContainmentMs", exec.path("detectionToContainmentMs").asLong(0));
    return writeJson(node);
  }

  private static String buildAutonomousContent(JsonNode rec) {
    ObjectNode node = MAPPER.createObjectNode();
    node.put("action", rec.path("recommendedAction").asText());
    node.put("gateDecision", "AUTONOMOUS");
    node.put("riskScore", rec.path("riskScore").asDouble());
    node.put("confidenceScore", rec.path("confidenceScore").asDouble());
    return writeJson(node);
  }

  private static String writeJson(ObjectNode node) {
    try {
      return MAPPER.writeValueAsString(node);
    } catch (JsonProcessingException e) {
      return node.toString();
    }
  }
}
