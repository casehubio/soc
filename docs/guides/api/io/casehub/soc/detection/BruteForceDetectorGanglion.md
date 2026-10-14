# io.casehub.soc.detection.BruteForceDetectorGanglion

**Package:** `io.casehub.soc.detection`

**Kind:** `class`

## Fields

### `EVENT_TYPES` (`java.util.Set<java.lang.String>`)

### `GANGLION_ID` (`java.lang.String`)

### `scorer` (`io.casehub.soc.detection.BruteForceScorer`)

## Constructors

### `public BruteForceDetectorGanglion()`

### `public BruteForceDetectorGanglion(io.casehub.soc.detection.BruteForceScorer scorer)`

#### Parameters

- `scorer` (`io.casehub.soc.detection.BruteForceScorer`)

## Methods

### `private static void addIfPresent(java.util.Map<java.lang.String,java.lang.Object> evidence, CloudEvent event, java.lang.String extensionName, java.lang.String evidenceKey)`

#### Parameters

- `evidence` (`java.util.Map<java.lang.String,java.lang.Object>`)
- `event` (`CloudEvent`)
- `extensionName` (`java.lang.String`)
- `evidenceKey` (`java.lang.String`)

### `protected DetectionResult evaluate(CloudEvent event, SituationContext context)`

#### Parameters

- `event` (`CloudEvent`)
- `context` (`SituationContext`)

### `private java.util.Map<java.lang.String,java.lang.Object> extractEvidence(CloudEvent event)`

#### Parameters

- `event` (`CloudEvent`)
