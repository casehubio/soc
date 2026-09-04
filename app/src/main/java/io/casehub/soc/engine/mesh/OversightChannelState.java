package io.casehub.soc.engine.mesh;

import java.util.UUID;

record OversightChannelState(UUID channelId, Long proposeMessageId, String actionType) {}
