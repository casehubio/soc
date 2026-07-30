package io.casehub.soc.worker;

import dev.langchain4j.model.chat.ChatModel;
import io.casehub.api.model.AgentWorkerFunction;
import io.casehub.api.model.ai.Agent;
import io.casehub.soc.worker.contract.IocEnrichmentOutput;
import io.casehub.worker.api.Worker;

public final class LlmIocEnrichmentWorker {

    private LlmIocEnrichmentWorker() {}

    public static Worker create(ChatModel chatModel) {
        if (chatModel == null) {
            return Worker.builder()
                         .name("llm-ioc-enrichment")
                         .capabilityName("ioc-enrichment")
                         .noFunction()
                         .build();
        }
        var agent = Agent.builder()
                         .systemPrompt(SocAgentPrompts.IOC_ENRICHMENT)
                         .model(chatModel)
                         .responseSchema(IocEnrichmentOutput.class)
                         .build();
        return Worker.builder()
                     .name("llm-ioc-enrichment")
                     .capabilityName("ioc-enrichment")
                     .function(new AgentWorkerFunction(agent))
                     .build();
    }
}
