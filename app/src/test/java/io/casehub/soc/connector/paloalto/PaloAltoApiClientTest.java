package io.casehub.soc.connector.paloalto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaloAltoApiClientTest {

    @Test
    void unconfiguredClientThrowsOnSetConfig() {
        var client = PaloAltoApiClient.unconfigured();

        assertThatThrownBy(() -> client.setConfig("/some/xpath", "<element/>"))
                .isInstanceOf(PaloAltoApiException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void unconfiguredClientThrowsOnCommit() {
        var client = PaloAltoApiClient.unconfigured();

        assertThatThrownBy(() -> client.commit())
                .isInstanceOf(PaloAltoApiException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void unconfiguredClientThrowsOnSystemInfo() {
        var client = PaloAltoApiClient.unconfigured();

        assertThatThrownBy(() -> client.systemInfo())
                .isInstanceOf(PaloAltoApiException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void parsesSuccessResponse() {
        String xml = "<response status=\"success\" code=\"20\"><msg>command succeeded</msg></response>";

        PaloAltoApiResponse response = PaloAltoApiResponse.parse(xml);

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.code()).isEqualTo(20);
        assertThat(response.message()).isEqualTo("command succeeded");
    }

    @Test
    void parsesErrorResponse() {
        String xml = "<response status=\"error\" code=\"12\"><msg><line>Object not found</line></msg></response>";

        PaloAltoApiResponse response = PaloAltoApiResponse.parse(xml);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.code()).isEqualTo(12);
        assertThat(response.message()).isEqualTo("Object not found");
    }

    @Test
    void parsesCommitJobId() {
        String xml = "<response status=\"success\" code=\"19\"><result><msg><line>Commit job enqueued with jobid 42</line></msg><job>42</job></result></response>";

        String jobId = PaloAltoApiResponse.parseJobId(xml);

        assertThat(jobId).isEqualTo("42");
    }

    @Test
    void parsesJobStatusComplete() {
        String xml = "<response status=\"success\"><result><job><id>42</id><status>FIN</status><result>OK</result><progress>100</progress></job></result></response>";

        PaloAltoApiResponse.JobStatus status = PaloAltoApiResponse.parseJobStatus(xml);

        assertThat(status.isFinished()).isTrue();
        assertThat(status.isSuccess()).isTrue();
        assertThat(status.jobId()).isEqualTo("42");
    }

    @Test
    void parsesJobStatusInProgress() {
        String xml = "<response status=\"success\"><result><job><id>42</id><status>ACT</status><progress>50</progress></job></result></response>";

        PaloAltoApiResponse.JobStatus status = PaloAltoApiResponse.parseJobStatus(xml);

        assertThat(status.isFinished()).isFalse();
    }

    @Test
    void parsesJobStatusFailed() {
        String xml = "<response status=\"success\"><result><job><id>42</id><status>FIN</status><result>FAIL</result><details><line>Configuration commit failed</line></details></job></result></response>";

        PaloAltoApiResponse.JobStatus status = PaloAltoApiResponse.parseJobStatus(xml);

        assertThat(status.isFinished()).isTrue();
        assertThat(status.isSuccess()).isFalse();
        assertThat(status.details()).isEqualTo("Configuration commit failed");
    }

    @Test
    void configuredClientReportsApiBase() {
        var client = new PaloAltoApiClient(
                "https://fw.corp.local", "test-key", "vsys1",
                "localhost.localdomain", 2000, 60000);

        assertThat(client.isConfigured()).isTrue();
    }

    @Test
    void blankApiKeyCreatesUnconfigured() {
        var client = new PaloAltoApiClient(
                "https://fw.corp.local", "", "vsys1",
                "localhost.localdomain", 2000, 60000);

        assertThat(client.isConfigured()).isFalse();
    }
}
