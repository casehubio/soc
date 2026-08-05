# io.casehub.soc.detection.SiemAlertGanglion

**Package:** `io.casehub.soc.detection`

**Kind:** `class`

Classifies incoming SIEM and EDR alerts by severity. Reads the `alertseverity`
CloudEvent extension (normalised by the webhook adapter) and maps to a detection signal.

<p>Severity mapping:
<ul>
  <li>CRITICAL → DETECTED / 0.95</li>
  <li>HIGH → DETECTED / 0.80</li>
  <li>MEDIUM → WEAK / 0.50</li>
  <li>LOW → WEAK / 0.20</li>
  <li>INFORMATIONAL or missing → NOISE</li>
</ul>

## Fields

### `EVENT_TYPES` (`java.util.Set<java.lang.String>`)

### `EXT_RULE` (`java.lang.String`)

### `EXT_SEVERITY` (`java.lang.String`)

### `EXT_SOURCE` (`java.lang.String`)

### `GANGLION_ID` (`java.lang.String`)

## Constructors

### `public SiemAlertGanglion()`

## Methods

### `protected DetectionResult evaluate(CloudEvent event, SituationContext context)`

#### Parameters

- `event` (`CloudEvent`)
- `context` (`SituationContext`)

### `private java.util.Map<java.lang.String,java.lang.Object> extractEvidence(CloudEvent event)`

#### Parameters

- `event` (`CloudEvent`)

### `private io.casehub.soc.domain.AlertSeverity extractSeverity(CloudEvent event)`

#### Parameters

- `event` (`CloudEvent`)
