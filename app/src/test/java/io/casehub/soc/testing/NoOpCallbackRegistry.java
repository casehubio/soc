package io.casehub.soc.testing;

import io.casehub.platform.api.callback.CallbackRegistration;
import io.casehub.platform.api.callback.CallbackRegistry;
import io.casehub.platform.api.callback.CallbackRegistrationRequest;
import io.quarkus.arc.DefaultBean;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
@DefaultBean
public class NoOpCallbackRegistry implements CallbackRegistry {

    @Override
    public CallbackRegistration register(CallbackRegistrationRequest request) {
        throw new UnsupportedOperationException("No callback registry in test");
    }

    @Override
    public void deregister(String registrationId) {}

    @Override
    public void heartbeat(String registrationId) {}

    @Override
    public List<CallbackRegistration> findBySpi(String spiName, String tenancyId) {
        return List.of();
    }

    @Override
    public Optional<CallbackRegistration> findById(String registrationId) {
        return Optional.empty();
    }
}
