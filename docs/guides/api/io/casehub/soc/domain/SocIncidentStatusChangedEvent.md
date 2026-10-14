# io.casehub.soc.domain.SocIncidentStatusChangedEvent

**Package:** `io.casehub.soc.domain`

**Kind:** `record`

## Fields

### `caseId` (`java.util.UUID`)

### `newStatus` (`java.lang.String`)

### `occurredAt` (`java.time.Instant`)

### `previousStatus` (`java.lang.String`)

### `tenancyId` (`java.lang.String`)

## Record Components

### `caseId` (`java.util.UUID`)

### `newStatus` (`java.lang.String`)

### `occurredAt` (`java.time.Instant`)

### `previousStatus` (`java.lang.String`)

### `tenancyId` (`java.lang.String`)

## Constructors

### `public SocIncidentStatusChangedEvent(java.util.UUID caseId, java.lang.String tenancyId, java.lang.String previousStatus, java.lang.String newStatus, java.time.Instant occurredAt)`

#### Parameters

- `caseId` (`java.util.UUID`)
- `tenancyId` (`java.lang.String`)
- `previousStatus` (`java.lang.String`)
- `newStatus` (`java.lang.String`)
- `occurredAt` (`java.time.Instant`)

## Methods

### `public java.util.UUID caseId()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public final int hashCode()`

### `public java.lang.String newStatus()`

### `public java.time.Instant occurredAt()`

### `public java.lang.String previousStatus()`

### `public java.lang.String tenancyId()`

### `public final java.lang.String toString()`
