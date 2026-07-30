package io.casehub.soc.worker;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

public class MockChatModel implements ChatModel {

    private final String responseJson;

    public MockChatModel(String responseJson) {
        this.responseJson = Objects.requireNonNull(responseJson);
    }

    static MockChatModel fromFixture(String resourcePath) {
        try (var is = MockChatModel.class.getClassLoader().getResourceAsStream(resourcePath)) {
            if (is == null) throw new IllegalArgumentException("Fixture not found: " + resourcePath);
            return new MockChatModel(new String(is.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public ChatResponse chat(ChatRequest request) {
        return ChatResponse.builder()
                .aiMessage(AiMessage.from(responseJson))
                .build();
    }
}
