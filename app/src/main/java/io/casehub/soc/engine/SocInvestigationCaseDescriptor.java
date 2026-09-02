package io.casehub.soc.engine;

import dev.langchain4j.model.chat.ChatModel;
import io.casehub.soc.engine.spi.ContainmentExecutor;
import io.casehub.soc.engine.spi.ContainmentResult;
import io.casehub.soc.worker.LlmAttckMappingWorker;
import io.casehub.soc.worker.LlmContainmentRecommendationWorker;
import io.casehub.soc.worker.LlmIocEnrichmentWorker;
import io.casehub.soc.worker.RuleAttckMappingWorker;
import io.casehub.soc.worker.RuleContainmentExecutionWorker;
import io.casehub.soc.worker.RuleContainmentRecommendationWorker;
import io.casehub.soc.worker.RuleCbrRetrievalWorker;
import io.casehub.soc.worker.RuleIocEnrichmentWorker;
import io.casehub.worker.api.Worker;

import java.time.Instant;
import java.util.List;

public final class SocInvestigationCaseDescriptor {

    private final ChatModel llmModel;
    private final io.casehub.soc.engine.cbr.SocCbrRetrieveService cbrRetrieveService;
    private final ContainmentExecutor containmentExecutor;

    SocInvestigationCaseDescriptor() {
        this(null, null, null);
    }

    SocInvestigationCaseDescriptor(ChatModel llmModel,
                                   io.casehub.soc.engine.cbr.SocCbrRetrieveService cbrRetrieveService,
                                   ContainmentExecutor containmentExecutor) {
        this.llmModel = llmModel;
        this.cbrRetrieveService = cbrRetrieveService;
        this.containmentExecutor = containmentExecutor;
    }

    List<Worker> workers() {
        ContainmentExecutor executor = containmentExecutor != null
                ? containmentExecutor
                : (a, p, c) -> ContainmentResult.success("default-no-op", Instant.now());
        return List.of(
                RuleCbrRetrievalWorker.create(cbrRetrieveService),
                RuleIocEnrichmentWorker.create(),
                LlmIocEnrichmentWorker.create(llmModel),
                RuleAttckMappingWorker.create(),
                LlmAttckMappingWorker.create(llmModel),
                RuleContainmentRecommendationWorker.create(),
                LlmContainmentRecommendationWorker.create(llmModel),
                RuleContainmentExecutionWorker.create(executor));
    }
}
