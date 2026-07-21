package io.casehub.soc.routing;

import io.casehub.api.spi.ActionRiskClassifier;
import io.casehub.api.spi.ClassificationContext;
import io.casehub.api.spi.RiskClassifier;
import io.casehub.api.spi.RiskDecision;
import io.casehub.soc.domain.SocActionType;
import io.casehub.worker.api.PlannedAction;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
@RiskClassifier
public class SocActionRiskClassifier implements ActionRiskClassifier {

    static final double RISK_SCORE_GATE_THRESHOLD = 0.8;
    static final double CONFIDENCE_GATE_THRESHOLD = 0.9;

    @Override
    public RiskDecision classify(final PlannedAction action, final ClassificationContext context) {
        final Optional<SocActionType> typeOpt = SocActionType.fromActionType(action.actionType());
        if (typeOpt.isEmpty()) {
            return new RiskDecision.Autonomous();
        }
        final SocActionType type = typeOpt.get();
        return switch (type.gatePolicy()) {
            case NEVER -> new RiskDecision.Autonomous();
            case ALWAYS -> gate(type);
            case RISK_SCORE_THRESHOLD -> classifyByRiskScore(type, action.parameters());
            case CONFIDENCE_THRESHOLD -> classifyByConfidence(type, action.parameters());
        };
    }

    private RiskDecision classifyByRiskScore(final SocActionType type, final Map<String, Object> params) {
        final Object raw = params != null ? params.get("riskScore") : null;
        if (raw == null) return missingContext(type);
        try {
            final double score = Double.parseDouble(raw.toString());
            return score >= RISK_SCORE_GATE_THRESHOLD ? gate(type) : new RiskDecision.Autonomous();
        } catch (final NumberFormatException e) {
            return missingContext(type);
        }
    }

    private RiskDecision classifyByConfidence(final SocActionType type, final Map<String, Object> params) {
        final Object raw = params != null ? params.get("confidenceScore") : null;
        if (raw == null) return missingContext(type);
        try {
            final double score = Double.parseDouble(raw.toString());
            return score < CONFIDENCE_GATE_THRESHOLD ? gate(type) : new RiskDecision.Autonomous();
        } catch (final NumberFormatException e) {
            return missingContext(type);
        }
    }

    private RiskDecision.GateRequired gate(final SocActionType type) {
        return new RiskDecision.GateRequired(
            type.reason(), type.reversible(), type.candidateGroups(),
            null, type.scope(), null);
    }

    private RiskDecision.GateRequired missingContext(final SocActionType type) {
        return new RiskDecision.GateRequired(
            "Risk assessment unavailable — human review required",
            type.reversible(), type.candidateGroups(), null, type.scope(), null);
    }
}
