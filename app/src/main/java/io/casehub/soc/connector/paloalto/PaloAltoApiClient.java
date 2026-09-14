package io.casehub.soc.connector.paloalto;

import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.ext.web.client.HttpResponse;
import io.vertx.ext.web.client.WebClient;
import org.jboss.logging.Logger;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

public class PaloAltoApiClient {

    private static final Logger LOG = Logger.getLogger(PaloAltoApiClient.class);

    private final String apiBase;
    private final String apiKey;
    private final String vsys;
    private final String deviceName;
    private final long commitPollIntervalMs;
    private final long commitTimeoutMs;

    public PaloAltoApiClient(String apiBase, String apiKey, String vsys,
                              String deviceName, long commitPollIntervalMs,
                              long commitTimeoutMs) {
        this.apiBase = apiBase;
        this.apiKey = apiKey;
        this.vsys = vsys;
        this.deviceName = deviceName;
        this.commitPollIntervalMs = commitPollIntervalMs;
        this.commitTimeoutMs = commitTimeoutMs;
    }

    private PaloAltoApiClient() {
        this.apiBase = "";
        this.apiKey = "";
        this.vsys = "";
        this.deviceName = "";
        this.commitPollIntervalMs = 0;
        this.commitTimeoutMs = 0;
    }

    public static PaloAltoApiClient unconfigured() {
        return new PaloAltoApiClient();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String vsys() {
        return vsys;
    }

    public String deviceName() {
        return deviceName;
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new PaloAltoApiException("PAN-OS not configured — set api-key");
        }
    }

    public PaloAltoApiResponse setConfig(String xpath, String element) {
        requireConfigured();
        String url = apiBase + "/api/?key=" + enc(apiKey)
                + "&type=config&action=set"
                + "&xpath=" + enc(xpath)
                + "&element=" + enc(element);
        String xml = postAndRead(url, 30_000);
        PaloAltoApiResponse response = PaloAltoApiResponse.parse(xml);
        if (!response.isSuccess()) {
            throw new PaloAltoApiException(
                    "PAN-OS config error: " + response.message(), response.code());
        }
        return response;
    }

    public String commit() {
        requireConfigured();
        String commitUrl = apiBase + "/api/?key=" + enc(apiKey)
                + "&type=commit&cmd=" + enc("<commit></commit>");
        String commitXml = postAndRead(commitUrl, 30_000);
        String jobId = PaloAltoApiResponse.parseJobId(commitXml);
        if (jobId == null) {
            throw new PaloAltoApiException("PAN-OS commit did not return a job ID");
        }
        LOG.infof("PAN-OS commit started, job ID: %s", jobId);
        return pollCommitJob(jobId);
    }

    private String pollCommitJob(String jobId) {
        String pollUrl = apiBase + "/api/?key=" + enc(apiKey)
                + "&type=op&cmd=" + enc("<show><jobs><id>" + jobId + "</id></jobs></show>");
        long deadline = System.currentTimeMillis() + commitTimeoutMs;

        while (System.currentTimeMillis() < deadline) {
            String xml = postAndRead(pollUrl, 10_000);
            PaloAltoApiResponse.JobStatus status = PaloAltoApiResponse.parseJobStatus(xml);

            if (status.isFinished()) {
                if (status.isSuccess()) {
                    LOG.infof("PAN-OS commit job %s completed successfully", jobId);
                    return jobId;
                } else {
                    throw new PaloAltoApiException(
                            "PAN-OS commit failed: " + status.details());
                }
            }

            try {
                Thread.sleep(commitPollIntervalMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new PaloAltoApiException("Commit polling interrupted", e);
            }
        }

        throw new PaloAltoApiException(
                "PAN-OS commit timed out after " + (commitTimeoutMs / 1000) + "s");
    }

    public PaloAltoApiResponse systemInfo() {
        requireConfigured();
        String url = apiBase + "/api/?key=" + enc(apiKey)
                + "&type=op&cmd=" + enc("<show><system><info></info></system></show>");
        String xml = postAndRead(url, 10_000);
        return PaloAltoApiResponse.parse(xml);
    }

    private String postAndRead(String url, long timeoutMs) {
        try {
            WebClient client = WebClient.create(Vertx.vertx());
            HttpResponse<Buffer> response = client
                    .postAbs(url)
                    .send()
                    .toCompletionStage()
                    .toCompletableFuture()
                    .get(timeoutMs, TimeUnit.MILLISECONDS);

            int status = response.statusCode();
            if (status == 403) {
                throw new PaloAltoApiException("PAN-OS authentication failed", 403);
            }
            if (status == 429) {
                throw new PaloAltoApiException("PAN-OS rate limited", 429);
            }
            if (status >= 500) {
                throw new PaloAltoApiException(
                        "PAN-OS server error: " + status, status);
            }
            if (status >= 400) {
                throw new PaloAltoApiException(
                        "PAN-OS error: " + status, status);
            }

            return response.bodyAsString();
        } catch (PaloAltoApiException e) {
            throw e;
        } catch (Exception e) {
            throw new PaloAltoApiException(
                    "PAN-OS unreachable: " + e.getMessage(), e);
        }
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
