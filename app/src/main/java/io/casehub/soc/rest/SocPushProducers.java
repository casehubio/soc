package io.casehub.soc.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.casehub.pages.push.JsonWriter;
import io.casehub.pages.push.SessionSender;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

@ApplicationScoped
public class SocPushProducers {

    @Produces
    @ApplicationScoped
    JsonWriter jsonWriter() {
        var mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper::writeValueAsString;
    }

    @Produces
    @ApplicationScoped
    SessionSender sessionSender() {
        return (connectionId, message) -> {};
    }
}
