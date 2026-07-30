package io.casehub.soc.worker;

import io.casehub.soc.worker.contract.IocEnrichmentOutput;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class IocExtractor {

    private IocExtractor() {}

    private static final Pattern IPV4 = Pattern.compile("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b");
    private static final Pattern MD5 = Pattern.compile("\\b[a-fA-F0-9]{32}\\b");
    private static final Pattern SHA1 = Pattern.compile("\\b[a-fA-F0-9]{40}\\b");
    private static final Pattern SHA256 = Pattern.compile("\\b[a-fA-F0-9]{64}\\b");
    private static final Pattern DOMAIN = Pattern.compile("\\b(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}\\b");
    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s\"'<>]+");
    private static final Pattern EMAIL = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b");
    private static final Pattern CVE = Pattern.compile("CVE-\\d{4}-\\d{4,}");

    public static List<IocEnrichmentOutput.IocEntry> extract(Map<String, Object> rawData) {
        if (rawData == null || rawData.isEmpty()) return List.of();

        var seen = new LinkedHashSet<String>();
        var results = new ArrayList<IocEnrichmentOutput.IocEntry>();
        collectFromMap(rawData, seen, results);
        return List.copyOf(results);
    }

    private static void collectFromMap(Map<String, Object> map,
                                       LinkedHashSet<String> seen,
                                       List<IocEnrichmentOutput.IocEntry> results) {
        for (var entry : map.entrySet()) {
            Object value = entry.getValue();
            if (value instanceof String s) {
                extractFromString(s, entry.getKey(), seen, results);
            } else if (value instanceof Map<?, ?> nested) {
                @SuppressWarnings("unchecked")
                var nestedMap = (Map<String, Object>) nested;
                collectFromMap(nestedMap, seen, results);
            }
        }
    }

    private static void extractFromString(String text, String fieldName,
                                          LinkedHashSet<String> seen,
                                          List<IocEnrichmentOutput.IocEntry> results) {
        matchAll(CVE, text, "CVE", fieldName, seen, results);
        matchAll(URL_PATTERN, text, "URL", fieldName, seen, results);
        matchAll(EMAIL, text, "EMAIL", fieldName, seen, results);
        matchAll(SHA256, text, "FILE_HASH_SHA256", fieldName, seen, results);
        matchAll(SHA1, text, "FILE_HASH_SHA1", fieldName, seen, results);
        matchAll(MD5, text, "FILE_HASH_MD5", fieldName, seen, results);
        matchAll(IPV4, text, "IP_ADDRESS", fieldName, seen, results);
        matchAll(DOMAIN, text, "DOMAIN", fieldName, seen, results);
    }

    private static void matchAll(Pattern pattern, String text, String type,
                                 String fieldName, LinkedHashSet<String> seen,
                                 List<IocEnrichmentOutput.IocEntry> results) {
        Matcher m = pattern.matcher(text);
        while (m.find()) {
            String value = m.group();
            String key = type + ":" + value;
            if (seen.add(key)) {
                results.add(new IocEnrichmentOutput.IocEntry(type, value, fieldName));
            }
        }
    }
}
