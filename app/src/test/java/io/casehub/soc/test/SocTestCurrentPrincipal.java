package io.casehub.soc.test;

import io.casehub.platform.testing.FixedCurrentPrincipal;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;

@ApplicationScoped
@Alternative
@Priority(250)
public class SocTestCurrentPrincipal extends FixedCurrentPrincipal {
}
