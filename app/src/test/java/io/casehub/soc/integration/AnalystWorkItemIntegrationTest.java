package io.casehub.soc.integration;

import io.casehub.api.model.Binding;
import io.casehub.api.model.CaseDefinition;
import io.casehub.api.model.HumanRoutingConfig;
import io.casehub.api.model.JudgmentTarget;
import io.casehub.platform.api.routing.StrategyResolver;
import io.casehub.soc.engine.SocCaseHub;
import io.casehub.soc.work.SocSlaBreachPolicy;
import io.casehub.work.api.spi.SlaBreachPolicy;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
class AnalystWorkItemIntegrationTest {

    @Inject
    SocCaseHub caseHub;

    @Inject
    StrategyResolver strategyResolver;

    @Test
    void analystReviewBinding_hasCorrectOutcomes() {
        JudgmentTarget target = analystReviewTarget();

        assertThat(target.outcomes()).containsExactlyInAnyOrder(
                "CONFIRM_SEVERITY", "DOWNGRADE", "ESCALATE", "FALSE_POSITIVE");
    }

    @Test
    void analystReviewBinding_hasTier1CandidateGroups() {
        JudgmentTarget     target  = analystReviewTarget();
        HumanRoutingConfig routing = (HumanRoutingConfig) target.routingConfig();

        assertThat(routing).isNotNull();
        assertThat(routing.candidateGroups()).isNotNull();
    }

    @Test
    void analystReviewBinding_hasScopeExpression() {
        JudgmentTarget target = analystReviewTarget();

        assertThat(target.scopeExpression()).isNotNull();
    }

    @Test
    void analystReviewBinding_hasExpiresInExpression() {
        JudgmentTarget target = analystReviewTarget();

        assertThat(target.expiresInExpression()).isNotNull();
        assertThat(target.expiresIn()).as("static expiresIn must be null when expression is used").isNull();
    }

    @Test
    void analystReviewBinding_hasInputMapping() {
        JudgmentTarget target = analystReviewTarget();

        assertThat(target.inputMapping()).isNotNull();
    }

    @Test
    void analystReviewBinding_hasOutputMapping() {
        JudgmentTarget target = analystReviewTarget();

        assertThat(target.outputMapping()).isNotNull();
    }

    @Test
    void slaBreachPolicy_resolvedBySocEscalation() {
        SlaBreachPolicy policy = strategyResolver.resolve(SlaBreachPolicy.class, "soc-escalation");

        assertThat(policy).isNotNull();
        assertThat(policy).isInstanceOf(SocSlaBreachPolicy.class);
        assertThat(policy.id()).isEqualTo("soc-escalation");
    }

    private JudgmentTarget analystReviewTarget() {
        CaseDefinition definition = caseHub.getDefinition();
        Optional<Binding> binding = definition.getBindings().stream()
                                              .filter(b -> "analyst-review".equals(b.getName()))
                                              .findFirst();

        assertThat(binding).as("analyst-review binding must exist").isPresent();
        assertThat(binding.get().target()).as("analyst-review must have a target").isNotNull();
        assertThat(binding.get().target()).isInstanceOf(JudgmentTarget.class);

        return (JudgmentTarget) binding.get().target();
    }
}
