package io.casehub.soc.engine.spi;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;

class ContainmentResultTest {

    @Test
    void successResult_hasCorrectFields() {
        var result = ContainmentResult.success("Host isolated successfully", Instant.now());
        assertThat(result.success()).isTrue();
        assertThat(result.retryable()).isFalse();
        assertThat(result.details()).isEqualTo("Host isolated successfully");
        assertThat(result.errorReason()).isNull();
    }

    @Test
    void failureResult_retryable() {
        var result = ContainmentResult.failure("Connection timeout", true);
        assertThat(result.success()).isFalse();
        assertThat(result.retryable()).isTrue();
        assertThat(result.errorReason()).isEqualTo("Connection timeout");
    }

    @Test
    void failureResult_nonRetryable() {
        var result = ContainmentResult.failure("Invalid credentials", false);
        assertThat(result.success()).isFalse();
        assertThat(result.retryable()).isFalse();
    }
}
