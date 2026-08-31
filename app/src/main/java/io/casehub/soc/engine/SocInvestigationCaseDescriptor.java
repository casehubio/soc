package io.casehub.soc.engine;

import dev.langchain4j.model.chat.ChatModel;
import io.casehub.soc.worker.LlmAttckMappingWorker;
import io.casehub.soc.worker.LlmContainmentRecommendationWorker;
import io.casehub.soc.worker.LlmIocEnrichmentWorker;
import io.casehub.soc.worker.RuleAttckMappingWorker;
import io.casehub.soc.worker.RuleContainmentRecommendationWorker;
import io.casehub.soc.worker.RuleCbrRetrievalWorker;
import io.casehub.soc.worker.RuleIocEnrichmentWorker;
import io.casehub.worker.api.Worker;

import java.util.List;

public final class SocInvestigationCaseDescriptor {

    private final ChatModel llmModel;
    private final io.casehub.soc.engine.cbr.SocCbrRetrieveService cbrRetrieveService;


    SocInvestigationCaseDescriptor() {
        this(null, null);
    }

    SocInvestigationCaseDescriptor(ChatModel llmModel, io.casehub.soc.engine.cbr.SocCbrRetrieveService cbrRetrieveService) {
        this.llmModel           = llmModel;
        this.cbrRetrieveService = cbrRetrieveService;
    }

    List<Worker> workers() {
        return List.of(
                RuleCbrRetrievalWorker.create(cbrRetrieveService),
                RuleIocEnrichmentWorker.create(),
                LlmIocEnrichmentWorker.create(llmModel),
                RuleAttckMappingWorker.create(),
                LlmAttckMappingWorker.create(llmModel),
                RuleContainmentRecommendationWorker.create(),
                LlmContainmentRecommendationWorker.create(llmModel));
    }
}
