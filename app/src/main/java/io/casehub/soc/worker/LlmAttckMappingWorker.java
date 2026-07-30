package io.casehub.soc.worker;

import dev.langchain4j.model.chat.ChatModel;
import io.casehub.api.model.AgentWorkerFunction;
import io.casehub.api.model.ai.Agent;
import io.casehub.soc.worker.contract.AttckMappingOutput;
import io.casehub.worker.api.Worker;

public final class LlmAttckMappingWorker {

    private LlmAttckMappingWorker() {}

    public static Worker create(ChatModel chatModel) {
        if (chatModel == null) {
            return Worker.builder()
                         .name("llm-attck-mapping")
                         .capabilityName("attck-mapping")
                         .noFunction()
                         .build();
        }
        var agent = Agent.builder()
                         .systemPrompt(SocAgentPrompts.ATTCK_MAPPING)
                         .model(chatModel)
                         .responseSchema(AttckMappingOutput.class)
                         .build();
        return Worker.builder()
                     .name("llm-attck-mapping")
                     .capabilityName("attck-mapping")
                     .function(new AgentWorkerFunction(agent))
                     .build();
    }
}
