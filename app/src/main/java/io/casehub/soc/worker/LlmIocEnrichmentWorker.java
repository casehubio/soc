package io.casehub.soc.worker;

import io.casehub.api.model.AgentWorkerFunction;
import io.casehub.api.model.ai.WorkerAgentInvoker;
import io.casehub.platform.agent.AgentProvider;
import io.casehub.soc.worker.contract.IocEnrichmentOutput;
import io.casehub.worker.api.Worker;

public final class LlmIocEnrichmentWorker {

    private LlmIocEnrichmentWorker() {}

    public static Worker create(AgentProvider agentProvider) {
        if (agentProvider == null) {
            return Worker.builder()
                         .name("llm-ioc-enrichment")
                         .capabilityName("ioc-enrichment")
                         .noFunction()
                         .build();
        }
        var invoker = new WorkerAgentInvoker(agentProvider, SocAgentPrompts.IOC_ENRICHMENT, null, null, null, null, null, null);
        return Worker.builder()
                     .name("llm-ioc-enrichment")
                     .capabilityName("ioc-enrichment")
                     .function(new AgentWorkerFunction(invoker))
                     .build();
    }
}
