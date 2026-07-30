package io.casehub.soc.worker;

import io.casehub.soc.worker.contract.IocEnrichmentOutput;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class IocExtractorTest {

    @Test
    void extractsIpv4Addresses() {
        var rawData = Map.<String, Object>of("sourceIp", "192.168.1.100", "destIp", "10.0.0.1");
        var iocs = IocExtractor.extract(rawData);
        assertThat(iocs).extracting(IocEnrichmentOutput.IocEntry::type)
                .contains("IP_ADDRESS");
        assertThat(iocs).extracting(IocEnrichmentOutput.IocEntry::value)
                .contains("192.168.1.100", "10.0.0.1");
    }

    @Test
    void extractsMd5Hashes() {
        var rawData = Map.<String, Object>of("fileHash", "d41d8cd98f00b204e9800998ecf8427e");
        var iocs = IocExtractor.extract(rawData);
        assertThat(iocs).anyMatch(i -> "FILE_HASH_MD5".equals(i.type()));
    }

    @Test
    void extractsSha256Hashes() {
        var rawData = Map.<String, Object>of("hash", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        var iocs = IocExtractor.extract(rawData);
        assertThat(iocs).anyMatch(i -> "FILE_HASH_SHA256".equals(i.type()));
    }

    @Test
    void extractsDomains() {
        var rawData = Map.<String, Object>of("hostname", "malware.evil.com");
        var iocs = IocExtractor.extract(rawData);
        assertThat(iocs).anyMatch(i -> "DOMAIN".equals(i.type()) && "malware.evil.com".equals(i.value()));
    }

    @Test
    void extractsUrls() {
        var rawData = Map.<String, Object>of("callbackUrl", "https://evil.com/c2/beacon");
        var iocs = IocExtractor.extract(rawData);
        assertThat(iocs).anyMatch(i -> "URL".equals(i.type()));
    }

    @Test
    void extractsEmails() {
        var rawData = Map.<String, Object>of("sender", "phishing@evil.com");
        var iocs = IocExtractor.extract(rawData);
        assertThat(iocs).anyMatch(i -> "EMAIL".equals(i.type()) && "phishing@evil.com".equals(i.value()));
    }

    @Test
    void extractsCves() {
        var rawData = Map.<String, Object>of("vulnerability", "CVE-2024-1234");
        var iocs = IocExtractor.extract(rawData);
        assertThat(iocs).anyMatch(i -> "CVE".equals(i.type()) && "CVE-2024-1234".equals(i.value()));
    }

    @Test
    void emptyRawData_returnsEmptyList() {
        assertThat(IocExtractor.extract(Map.of())).isEmpty();
    }

    @Test
    void nullRawData_returnsEmptyList() {
        assertThat(IocExtractor.extract(null)).isEmpty();
    }

    @Test
    void extractsFromNestedMapValues() {
        var rawData = Map.<String, Object>of(
                "connection", Map.of("remoteIp", "203.0.113.50"),
                "file", Map.of("sha1", "da39a3ee5e6b4b0d3255bfef95601890afd80709"));
        var iocs = IocExtractor.extract(rawData);
        assertThat(iocs).extracting(IocEnrichmentOutput.IocEntry::value)
                .contains("203.0.113.50", "da39a3ee5e6b4b0d3255bfef95601890afd80709");
    }

    @Test
    void deduplicatesIdenticalIocs() {
        var rawData = Map.<String, Object>of("ip1", "10.0.0.1", "ip2", "10.0.0.1");
        var iocs = IocExtractor.extract(rawData);
        long ipCount = iocs.stream().filter(i -> "10.0.0.1".equals(i.value())).count();
        assertThat(ipCount).isEqualTo(1);
    }
}
