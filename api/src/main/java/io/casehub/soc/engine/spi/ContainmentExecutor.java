package io.casehub.soc.engine.spi;

import java.util.Map;

public interface ContainmentExecutor {
    ContainmentResult execute(String actionType, Map<String, Object> parameters,
                              ContainmentContext context);
}
