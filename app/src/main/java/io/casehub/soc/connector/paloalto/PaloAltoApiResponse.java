package io.casehub.soc.connector.paloalto;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public record PaloAltoApiResponse(String status, int code, String message) {

    private static final Pattern STATUS_PATTERN =
            Pattern.compile("status=\"(\\w+)\"");
    private static final Pattern CODE_PATTERN =
            Pattern.compile("code=\"(\\d+)\"");
    private static final Pattern MSG_PATTERN =
            Pattern.compile("<msg>(?:<line>)?(.*?)(?:</line>)?</msg>", Pattern.DOTALL);
    private static final Pattern JOB_ID_PATTERN =
            Pattern.compile("<job>(\\d+)</job>");
    private static final Pattern JOB_ELEMENT_ID_PATTERN =
            Pattern.compile("<id>(\\d+)</id>");
    private static final Pattern JOB_STATUS_PATTERN =
            Pattern.compile("<status>(\\w+)</status>");
    private static final Pattern JOB_RESULT_PATTERN =
            Pattern.compile("<result>(\\w+)</result>");
    private static final Pattern JOB_PROGRESS_PATTERN =
            Pattern.compile("<progress>(\\d+)</progress>");
    private static final Pattern JOB_DETAILS_PATTERN =
            Pattern.compile("<details><line>(.*?)</line></details>", Pattern.DOTALL);

    public boolean isSuccess() {
        return "success".equals(status);
    }

    public static PaloAltoApiResponse parse(String xml) {
        String status = extractGroup(STATUS_PATTERN, xml, "unknown");
        int code = Integer.parseInt(extractGroup(CODE_PATTERN, xml, "0"));
        String message = extractGroup(MSG_PATTERN, xml, "");
        return new PaloAltoApiResponse(status, code, message);
    }

    public static String parseJobId(String xml) {
        return extractGroup(JOB_ID_PATTERN, xml, null);
    }

    public static JobStatus parseJobStatus(String xml) {
        String jobId = extractGroup(JOB_ELEMENT_ID_PATTERN, xml, "");
        String status = extractGroup(JOB_STATUS_PATTERN, xml, "");
        String result = extractGroup(JOB_RESULT_PATTERN, xml, "");
        int progress = Integer.parseInt(extractGroup(JOB_PROGRESS_PATTERN, xml, "0"));
        String details = extractGroup(JOB_DETAILS_PATTERN, xml, "");
        return new JobStatus(jobId, status, result, progress, details);
    }

    private static String extractGroup(Pattern pattern, String xml, String defaultValue) {
        Matcher m = pattern.matcher(xml);
        return m.find() ? m.group(1) : defaultValue;
    }

    public record JobStatus(String jobId, String status, String result,
                             int progress, String details) {
        public boolean isFinished() {
            return "FIN".equals(status);
        }

        public boolean isSuccess() {
            return isFinished() && "OK".equals(result);
        }
    }
}
