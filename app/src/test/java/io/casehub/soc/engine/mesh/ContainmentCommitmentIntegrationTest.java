package io.casehub.soc.engine.mesh;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.casehub.engine.common.spi.event.CaseLifecycleEvent;
import io.casehub.qhorus.api.channel.Channel;
import io.casehub.qhorus.api.channel.ChannelManager;
import io.casehub.qhorus.api.message.Commitment;
import io.casehub.qhorus.api.message.CommitmentState;
import io.casehub.qhorus.api.message.Message;
import io.casehub.qhorus.api.message.MessageType;
import io.casehub.qhorus.api.store.CommitmentReader;
import io.casehub.qhorus.api.store.MessageReader;
import io.casehub.qhorus.api.store.query.MessageQuery;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ContainmentCommitmentIntegrationTest {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final String TENANT = "test-tenant";

  @Inject SocContainmentCommitmentBridge bridge;
  @Inject ChannelManager channelManager;
  @Inject MessageReader messageReader;
  @Inject CommitmentReader commitmentReader;

  @Test
  void gatedContainment_createsChannelAndCommitment() {
    UUID caseId = UUID.randomUUID();

    ObjectNode ctx = MAPPER.createObjectNode();
    ctx.put("containmentGateDecision", "GATED");
    ObjectNode rec = ctx.putObject("containmentRecommendation");
    rec.put("recommendedAction", "ISOLATE_HOST");
    rec.put("riskScore", 0.95);
    rec.put("confidenceScore", 0.87);
    rec.put("severity", "CRITICAL");
    rec.put("rationale", "Lateral movement detected");
    rec.putObject("actionParameters").put("targetHost", "10.0.1.42");

    bridge.onLifecycle(new CaseLifecycleEvent(
        caseId, TENANT, "ActionGate", "ActionGatePending",
        "RUNNING", "system", "SYSTEM", null,
        "incident-investigation", null, ctx, null, null));

    Channel oversight = channelManager.findOrCreate(
        io.casehub.qhorus.api.channel.ChannelCreateRequest.builder(
            "case-" + caseId + "/oversight").build()).channel();
    assertThat(oversight).isNotNull();
    assertThat(oversight.deniedTypes()).contains(MessageType.EVENT);

    String correlationId = "gate-" + caseId + "-ISOLATE_HOST";
    List<Message> messages = messageReader.scan(
        MessageQuery.builder()
            .channelId(oversight.id())
            .messageType(MessageType.PROPOSE)
            .build());
    assertThat(messages).isNotEmpty();
    Message propose = messages.get(0);
    assertThat(propose.sender()).isEqualTo("system:containment-recommendation");
    assertThat(propose.content()).contains("ISOLATE_HOST");

    Optional<Commitment> commitment = commitmentReader.findByCorrelationId(correlationId);
    assertThat(commitment).isPresent();
    assertThat(commitment.get().state()).isEqualTo(CommitmentState.OPEN);

    bridge.clearState(caseId);
  }

  @Test
  void autonomousContainment_postsStatusNoCommitment() {
    UUID caseId = UUID.randomUUID();

    ObjectNode ctx = MAPPER.createObjectNode();
    ctx.put("containmentGateDecision", "AUTONOMOUS");
    ObjectNode rec = ctx.putObject("containmentRecommendation");
    rec.put("recommendedAction", "BLOCK_IP");
    rec.put("riskScore", 0.3);
    rec.put("confidenceScore", 0.92);

    bridge.onLifecycle(new CaseLifecycleEvent(
        caseId, TENANT, "ContextChanged", "CaseContextChanged",
        "RUNNING", "system", "SYSTEM", null,
        "incident-investigation", null, ctx, null, null));

    Channel oversight = channelManager.findOrCreate(
        io.casehub.qhorus.api.channel.ChannelCreateRequest.builder(
            "case-" + caseId + "/oversight").build()).channel();

    List<Message> messages = messageReader.scan(
        MessageQuery.builder()
            .channelId(oversight.id())
            .messageType(MessageType.STATUS)
            .build());
    assertThat(messages).isNotEmpty();
    assertThat(messages.get(0).content()).contains("AUTONOMOUS");

    List<Commitment> openCommitments = commitmentReader.findOpenByChannelId(oversight.id());
    assertThat(openCommitments).isEmpty();

    bridge.clearState(caseId);
  }
}
