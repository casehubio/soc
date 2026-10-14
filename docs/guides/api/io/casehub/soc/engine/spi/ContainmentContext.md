# io.casehub.soc.engine.spi.ContainmentContext

**Package:** `io.casehub.soc.engine.spi`

**Kind:** `record`

## Fields

### `DEFAULT_TIMEOUT_MS` (`long`)

### `approver` (`java.lang.String`)

### `caseId` (`java.util.UUID`)

### `incidentId` (`java.lang.String`)

### `tenancyId` (`java.lang.String`)

### `timeoutMs` (`long`)

## Record Components

### `approver` (`java.lang.String`)

### `caseId` (`java.util.UUID`)

### `incidentId` (`java.lang.String`)

### `tenancyId` (`java.lang.String`)

### `timeoutMs` (`long`)

## Constructors

### `public ContainmentContext(java.util.UUID caseId, java.lang.String incidentId, java.lang.String approver, java.lang.String tenancyId)`

#### Parameters

- `caseId` (`java.util.UUID`)
- `incidentId` (`java.lang.String`)
- `approver` (`java.lang.String`)
- `tenancyId` (`java.lang.String`)

### `public ContainmentContext(java.util.UUID caseId, java.lang.String incidentId, java.lang.String approver, java.lang.String tenancyId, long timeoutMs)`

#### Parameters

- `caseId` (`java.util.UUID`)
- `incidentId` (`java.lang.String`)
- `approver` (`java.lang.String`)
- `tenancyId` (`java.lang.String`)
- `timeoutMs` (`long`)

## Methods

### `public java.lang.String approver()`

### `public java.util.UUID caseId()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public final int hashCode()`

### `public java.lang.String incidentId()`

### `public java.lang.String tenancyId()`

### `public long timeoutMs()`

### `public final java.lang.String toString()`
