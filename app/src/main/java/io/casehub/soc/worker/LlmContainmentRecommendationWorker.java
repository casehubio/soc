package io.casehub.soc.worker;

import dev.langchain4j.model.chat.ChatModel;
import io.casehub.api.model.ai.Agent;
import io.casehub.soc.domain.SocActionType;
import io.casehub.soc.worker.contract.ContainmentRecommendationOutput;
import io.casehub.worker.api.PlannedAction;
import io.casehub.worker.api.Worker;
import io.casehub.worker.api.WorkerResult;

import java.util.Map;

public final class LlmContainmentRecommendationWorker {

    private LlmContainmentRecommendationWorker() {}

    @SuppressWarnings("unchecked")
    public static Worker create(ChatModel chatModel) {
        if (chatModel == null) {
            return Worker.builder()
                         .name("llm-containment-rec")
                         .capabilityName("containment-recommendation")
                         .noFunction()
                         .build();
        }
        Agent agent = buildAgent(chatModel);
        return Worker.builder()
                     .name("llm-containment-rec")
                     .capabilityName("containment-recommendation")
                     .fn((Map<String, Object>) null)
                     .apply((input, scope) -> {
                         WorkerResult<Map<String, Object>> agentResult = agent.execute(input);
                         Map<String, Object>               output      = agentResult.output();
                         String                            actionName  = (String) output.get("recommendedAction");
                         if (actionName == null) {
                             return WorkerResult.of(output);
                         }
                         var socAction = SocActionType.fromActionType(
                                 actionName.toLowerCase().replace('_', '.'));
                         String actionType = socAction.map(SocActionType::actionType)
                                                      .orElse(actionName.toLowerCase().replace('_', '.'));
                         PlannedAction action = PlannedAction.of(
                                 "Containment: " + actionName, actionType,
                                 Map.of("riskScore", output.getOrDefault("riskScore", 0.5)));
                         return WorkerResult.of(output, action);
                     })
                     .build();
    }

    private static Agent buildAgent(ChatModel chatModel) {
        return Agent.builder()
                    .systemPrompt(SocAgentPrompts.CONTAINMENT_RECOMMENDATION)
                    .model(chatModel)
                    .responseSchema(ContainmentRecommendationOutput.class)
                    .build();
    }
}
