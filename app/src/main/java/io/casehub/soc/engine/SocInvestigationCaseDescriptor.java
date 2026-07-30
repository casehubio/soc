package io.casehub.soc.engine;

import io.casehub.soc.worker.LlmAttckMappingWorker;
import io.casehub.soc.worker.LlmContainmentRecommendationWorker;
import io.casehub.soc.worker.LlmIocEnrichmentWorker;
import io.casehub.soc.worker.RuleAttckMappingWorker;
import io.casehub.soc.worker.RuleContainmentRecommendationWorker;
import io.casehub.soc.worker.RuleIocEnrichmentWorker;
import io.casehub.worker.api.Worker;

import dev.langchain4j.model.chat.ChatModel;
import java.util.List;

public final class SocInvestigationCaseDescriptor {

    private final ChatModel llmModel;

    SocInvestigationCaseDescriptor() {
        this(null);
    }

    SocInvestigationCaseDescriptor(ChatModel llmModel) {
        this.llmModel = llmModel;
    }

    List<Worker> workers() {
        return List.of(
                RuleIocEnrichmentWorker.create(),
                LlmIocEnrichmentWorker.create(llmModel),
                RuleAttckMappingWorker.create(),
                LlmAttckMappingWorker.create(llmModel),
                RuleContainmentRecommendationWorker.create(),
                LlmContainmentRecommendationWorker.create(llmModel));
    }
}
