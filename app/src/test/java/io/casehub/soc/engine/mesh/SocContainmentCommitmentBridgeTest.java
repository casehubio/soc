package io.casehub.soc.engine.mesh;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.qhorus.api.channel.Channel;
import io.casehub.qhorus.api.channel.ChannelCreateRequest;
import io.casehub.qhorus.api.channel.ChannelManager;
import io.casehub.qhorus.api.channel.ChannelSemantic;
import io.casehub.qhorus.api.channel.FindOrCreateResult;
import io.casehub.qhorus.api.message.DispatchResult;
import io.casehub.qhorus.api.message.MessageDispatch;
import io.casehub.qhorus.api.message.MessageDispatcher;
import io.casehub.qhorus.api.message.MessageType;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SocContainmentCommitmentBridgeTest {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  private RecordingChannelManager channelManager;
  private RecordingMessageDispatcher messageDispatcher;
  private SocContainmentCommitmentBridge bridge;
  private UUID caseId;
  private UUID channelId;

  @BeforeEach
  void setUp() {
    caseId = UUID.randomUUID();
    channelId = UUID.randomUUID();
    channelManager = new RecordingChannelManager(channelId, caseId);
    messageDispatcher = new RecordingMessageDispatcher();
    bridge = new SocContainmentCommitmentBridge(channelManager, messageDispatcher);
  }

  @Test
  void gatedAction_dispatchesProposeToOversight() {
    bridge.onLifecycle(buildEvent(buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL")));

    assertThat(messageDispatcher.dispatched).hasSize(1);
    MessageDispatch dispatch = messageDispatcher.dispatched.get(0);
    assertThat(dispatch.type()).isEqualTo(MessageType.PROPOSE);
    assertThat(dispatch.channelId()).isEqualTo(channelId);
    assertThat(dispatch.sender()).isEqualTo("system:containment-recommendation");
    assertThat(dispatch.target()).isEqualTo("role:soc-manager");
    assertThat(dispatch.correlationId()).isEqualTo("gate-" + caseId + "-ISOLATE_HOST");
    assertThat(dispatch.content()).contains("ISOLATE_HOST");
    assertThat(dispatch.content()).contains("0.95");
  }

  @Test
  void gatedApproved_dispatchesDoneToOversight() {
    bridge.onLifecycle(buildEvent(buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL")));
    assertThat(messageDispatcher.dispatched).hasSize(1);

    ObjectNode approvedCtx = buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL");
    ObjectNode approval = approvedCtx.putObject("actionGateApproved");
    approval.put("actionType", "ISOLATE_HOST");
    approval.put("approvedBy", "analyst-jane@corp.com");
    approval.put("resolution", "Lateral movement confirmed");
    bridge.onLifecycle(buildEvent(approvedCtx));

    assertThat(messageDispatcher.dispatched).hasSize(2);
    MessageDispatch dispatch = messageDispatcher.dispatched.get(1);
    assertThat(dispatch.type()).isEqualTo(MessageType.DONE);
    assertThat(dispatch.sender()).isEqualTo("analyst-jane@corp.com");
    assertThat(dispatch.correlationId()).isEqualTo("gate-" + caseId + "-ISOLATE_HOST");
    assertThat(dispatch.inReplyTo()).isEqualTo(1L);
    assertThat(dispatch.content()).contains("Lateral movement confirmed");
  }

  @Test
  void gatedRejected_dispatchesDeclineToOversight() {
    bridge.onLifecycle(buildEvent(buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL")));
    assertThat(messageDispatcher.dispatched).hasSize(1);

    ObjectNode rejectedCtx = buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL");
    ObjectNode rejection = rejectedCtx.putObject("actionGateRejected");
    rejection.put("actionType", "ISOLATE_HOST");
    rejection.put("rejectedBy", "analyst-bob@corp.com");
    rejection.put("rejectionReason", "False positive");
    bridge.onLifecycle(buildEvent(rejectedCtx));

    assertThat(messageDispatcher.dispatched).hasSize(2);
    MessageDispatch dispatch = messageDispatcher.dispatched.get(1);
    assertThat(dispatch.type()).isEqualTo(MessageType.DECLINE);
    assertThat(dispatch.sender()).isEqualTo("analyst-bob@corp.com");
    assertThat(dispatch.correlationId()).isEqualTo("gate-" + caseId + "-ISOLATE_HOST");
    assertThat(dispatch.inReplyTo()).isEqualTo(1L);
    assertThat(dispatch.content()).contains("False positive");
  }

  @Test
  void autonomousAction_dispatchesStatusToOversight() {
    bridge.onLifecycle(buildEvent(buildAutonomousContext("BLOCK_IP", 0.3, 0.92)));

    assertThat(messageDispatcher.dispatched).hasSize(1);
    MessageDispatch dispatch = messageDispatcher.dispatched.get(0);
    assertThat(dispatch.type()).isEqualTo(MessageType.STATUS);
    assertThat(dispatch.sender()).isEqualTo("system:containment-recommendation");
    assertThat(dispatch.content()).contains("AUTONOMOUS");
    assertThat(dispatch.content()).contains("BLOCK_IP");
  }

  @Test
  void executionResult_dispatchesStatusToOversight() {
    bridge.onLifecycle(buildEvent(buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL")));

    ObjectNode execCtx = buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL");
    execCtx.putObject("actionGateApproved").put("actionType", "ISOLATE_HOST");
    ObjectNode exec = execCtx.putObject("containmentExecution");
    exec.put("actionType", "ISOLATE_HOST");
    exec.put("executed", true);
    exec.put("success", true);
    exec.put("detectionToContainmentMs", 45003);
    bridge.onLifecycle(buildEvent(execCtx));

    List<MessageDispatch> statusMsgs = messageDispatcher.dispatched.stream()
        .filter(d -> d.type() == MessageType.STATUS)
        .toList();
    assertThat(statusMsgs).isNotEmpty();
    MessageDispatch execDispatch = statusMsgs.get(statusMsgs.size() - 1);
    assertThat(execDispatch.sender()).isEqualTo("system:containment-execution");
    assertThat(execDispatch.content()).contains("ISOLATE_HOST");
    assertThat(execDispatch.content()).contains("45003");
  }

  @Test
  void noContainment_dispatchesNothing() {
    ObjectNode ctx = MAPPER.createObjectNode();
    ctx.putObject("containmentRecommendation").put("recommendedAction", "NONE");
    bridge.onLifecycle(buildEvent(ctx));

    assertThat(messageDispatcher.dispatched).isEmpty();
  }

  @Test
  void idempotency_sameEventTwice_dispatchesOnce() {
    CaseLifecycleEvent event = buildEvent(buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL"));
    bridge.onLifecycle(event);
    bridge.onLifecycle(event);

    long proposeCount = messageDispatcher.dispatched.stream()
        .filter(d -> d.type() == MessageType.PROPOSE)
        .count();
    assertThat(proposeCount).isEqualTo(1);
  }

  @Test
  void nonSocCase_isIgnored() {
    ObjectNode ctx = buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL");
    CaseLifecycleEvent event = new CaseLifecycleEvent(
        caseId, "test-tenant", "ActionGate", "ActionGatePending",
        "RUNNING", "system", "SYSTEM", null,
        "some-other-case-type", null, ctx, null, null);

    bridge.onLifecycle(event);

    assertThat(messageDispatcher.dispatched).isEmpty();
  }

  @Test
  void channelCreation_usesDeniedTypesEvent() {
    bridge.onLifecycle(buildEvent(buildGatedContext("ISOLATE_HOST", 0.95, 0.87, "CRITICAL")));

    assertThat(channelManager.requests).hasSize(1);
    ChannelCreateRequest request = channelManager.requests.get(0);
    assertThat(request.name()).isEqualTo("case-" + caseId + "/oversight");
    assertThat(request.deniedTypes()).containsExactly(MessageType.EVENT);
  }

  private ObjectNode buildGatedContext(String action, double risk, double confidence, String severity) {
    ObjectNode ctx = MAPPER.createObjectNode();
    ctx.put("containmentGateDecision", "GATED");
    ObjectNode rec = ctx.putObject("containmentRecommendation");
    rec.put("recommendedAction", action);
    rec.put("riskScore", risk);
    rec.put("confidenceScore", confidence);
    rec.put("severity", severity);
    rec.put("rationale", "Test rationale");
    rec.putObject("actionParameters").put("targetHost", "10.0.1.42");
    return ctx;
  }

  private ObjectNode buildAutonomousContext(String action, double risk, double confidence) {
    ObjectNode ctx = MAPPER.createObjectNode();
    ctx.put("containmentGateDecision", "AUTONOMOUS");
    ObjectNode rec = ctx.putObject("containmentRecommendation");
    rec.put("recommendedAction", action);
    rec.put("riskScore", risk);
    rec.put("confidenceScore", confidence);
    return ctx;
  }

  private CaseLifecycleEvent buildEvent(ObjectNode context) {
    return new CaseLifecycleEvent(
        caseId, "test-tenant", "ContextChanged", "CaseContextChanged",
        "RUNNING", "system", "SYSTEM", null,
        "incident-investigation", null, context, null, null);
  }

  static final class RecordingChannelManager implements ChannelManager {
    final List<ChannelCreateRequest> requests = new ArrayList<>();
    private final Channel channel;

    RecordingChannelManager(UUID channelId, UUID caseId) {
      this.channel = new Channel(channelId, "case-" + caseId + "/oversight",
          "SOC containment governance", ChannelSemantic.APPEND,
          List.of(), List.of(), List.of(), null, null,
          null, Set.of(MessageType.EVENT), false, false, null,
          "test-tenant", Instant.now(), Instant.now());
    }

    @Override public Channel create(ChannelCreateRequest r) { requests.add(r); return channel; }
    @Override public FindOrCreateResult findOrCreate(ChannelCreateRequest r) { requests.add(r); return new FindOrCreateResult(channel, true); }
    @Override public long delete(UUID id, boolean f) { return 0; }
    @Override public Channel pause(UUID id) { return channel; }
    @Override public Channel resume(UUID id) { return channel; }
    @Override public Channel setTypeConstraints(UUID id, Set<MessageType> a, Set<MessageType> d) { return channel; }
    @Override public Channel setRateLimits(UUID id, Integer pc, Integer pi) { return channel; }
    @Override public Channel setAllowedWriters(UUID id, List<String> w) { return channel; }
    @Override public Channel setAdminInstances(UUID id, List<String> a) { return channel; }
    @Override public Channel setReviewerInstances(UUID id, List<String> r) { return channel; }
    @Override public Channel setProtocols(UUID id, List<String> p) { return channel; }
    @Override public Channel setProtocolParticipants(UUID id, List<String> p) { return channel; }
  }

  static final class RecordingMessageDispatcher implements MessageDispatcher {
    final List<MessageDispatch> dispatched = new ArrayList<>();
    private final AtomicLong idSeq = new AtomicLong(1);

    @Override
    public DispatchResult dispatch(MessageDispatch dispatch) {
      dispatched.add(dispatch);
      long msgId = idSeq.getAndIncrement();
      return new DispatchResult(msgId, dispatch.channelId(), dispatch.sender(),
          dispatch.type(), dispatch.correlationId(), dispatch.inReplyTo(),
          List.of(), dispatch.target(), null, null, null, 0, List.of());
    }
  }
}
