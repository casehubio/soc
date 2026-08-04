package io.casehub.soc.engine;

import io.casehub.eidos.api.AgentDescriptor;
import io.casehub.eidos.api.spi.AgentDescriptorRegistrar;
import io.casehub.soc.domain.SocAgentDescriptors;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class SocAgentRegistrar implements AgentDescriptorRegistrar {

    @Override
    public List<AgentDescriptor> descriptors() {
        return SocAgentDescriptors.all();
    }
}
