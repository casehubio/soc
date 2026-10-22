package io.casehub.soc.worker;

import io.casehub.api.model.AgentWorkerFunction;
import io.casehub.api.model.ai.WorkerAgentInvoker;
import io.casehub.platform.agent.AgentProvider;
import io.casehub.worker.api.Worker;

public final class LlmContainmentRecommendationWorker {

    private LlmContainmentRecommendationWorker() {}

    public static Worker create(AgentProvider agentProvider) {
        if (agentProvider == null) {
            return Worker.builder()
                         .name("llm-containment-rec")
                         .capabilityName("containment-recommendation")
                         .noFunction()
                         .build();
        }
        var invoker = new WorkerAgentInvoker(agentProvider,
                SocAgentPrompts.CONTAINMENT_RECOMMENDATION, null, null, null, null, null, null);
        return Worker.builder()
                     .name("llm-containment-rec")
                     .capabilityName("containment-recommendation")
                     .function(new AgentWorkerFunction(invoker))
                     .build();
    }
}
