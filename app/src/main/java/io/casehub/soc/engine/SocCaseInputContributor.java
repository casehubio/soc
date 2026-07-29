package io.casehub.soc.engine;

import io.casehub.ras.api.CaseInputContributor;
import io.casehub.ras.api.CaseTriggerConfig;
import io.casehub.ras.api.SituationContext;
import io.casehub.ras.api.TimestampedDetection;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class SocCaseInputContributor implements CaseInputContributor {

    @Override
    public Map<String, Object> contribute(CaseTriggerConfig config, SituationContext context) {
        Map<String, Object> data = new LinkedHashMap<>();

        List<TimestampedDetection> detections = context.detections();
        if (!detections.isEmpty()) {
            TimestampedDetection first = detections.getFirst();
            Map<String, Object> alert = new LinkedHashMap<>();
            alert.put("eventType", first.result().evidence().get("eventType"));
            alert.put("severity", first.result().signal().name());
            alert.put("confidence", first.result().confidence());
            alert.put("timestamp", first.eventTime().toString());
            Object source = first.result().evidence().get("alertSource");
            if (source != null) alert.put("source", source.toString());
            Object rule = first.result().evidence().get("alertRule");
            if (rule != null) alert.put("rule", rule.toString());
            data.put("alert", alert);
        }

        data.put("detections", detections.stream().map(td -> {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("ganglionId", td.result().ganglionId());
            d.put("signal", td.result().signal().name());
            d.put("confidence", td.result().confidence());
            d.put("eventTime", td.eventTime().toString());
            d.put("evidence", td.result().evidence());
            return d;
        }).toList());

        return data;
    }
}
