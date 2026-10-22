package io.casehub.soc.worker;

import io.casehub.api.model.AgentWorkerFunction;
import io.casehub.api.model.ai.WorkerAgentInvoker;
import io.casehub.platform.agent.AgentProvider;
import io.casehub.soc.worker.contract.AttckMappingOutput;
import io.casehub.worker.api.Worker;

public final class LlmAttckMappingWorker {

    private LlmAttckMappingWorker() {}

    public static Worker create(AgentProvider agentProvider) {
        if (agentProvider == null) {
            return Worker.builder()
                         .name("llm-attck-mapping")
                         .capabilityName("attck-mapping")
                         .noFunction()
                         .build();
        }
        var invoker = new WorkerAgentInvoker(agentProvider, SocAgentPrompts.ATTCK_MAPPING, null, null, null, null, null, null);
        return Worker.builder()
                     .name("llm-attck-mapping")
                     .capabilityName("attck-mapping")
                     .function(new AgentWorkerFunction(invoker))
                     .build();
    }
}
