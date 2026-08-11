package io.casehub.soc.domain;

import io.casehub.platform.api.preferences.DurationPreference;
import io.casehub.platform.api.preferences.PreferenceKey;
import java.time.Duration;

public final class SocPreferences {
    public static final PreferenceKey<DurationPreference> P1_RESPONSE_WINDOW =
        new PreferenceKey<>("soc", "p1ResponseWindow",
            new DurationPreference(Duration.ofMinutes(15)), s -> new DurationPreference(Duration.parse(s)));
    public static final PreferenceKey<DurationPreference> P2_RESPONSE_WINDOW =
        new PreferenceKey<>("soc", "p2ResponseWindow",
            new DurationPreference(Duration.ofHours(1)), s -> new DurationPreference(Duration.parse(s)));
    public static final PreferenceKey<DurationPreference> P3_RESPONSE_WINDOW =
        new PreferenceKey<>("soc", "p3ResponseWindow",
            new DurationPreference(Duration.ofHours(4)), s -> new DurationPreference(Duration.parse(s)));
    public static final PreferenceKey<DurationPreference> P4_RESPONSE_WINDOW =
        new PreferenceKey<>("soc", "p4ResponseWindow",
            new DurationPreference(Duration.ofHours(24)), s -> new DurationPreference(Duration.parse(s)));
    private SocPreferences() {}
}
