# io.casehub.soc.domain.notification.SocIncidentNotification

**Package:** `io.casehub.soc.domain.notification`

**Kind:** `record`

## Fields

### `actorId` (`java.lang.String`)

### `assignedAnalystId` (`java.lang.String`)

### `caseId` (`java.lang.String`)

### `correlationKey` (`java.lang.String`)

### `eventType` (`java.lang.String`)

### `occurredAt` (`java.time.Instant`)

### `severity` (`java.lang.String`)

### `tactic` (`java.lang.String`)

### `tenancyId` (`java.lang.String`)

## Record Components

### `actorId` (`java.lang.String`)

### `assignedAnalystId` (`java.lang.String`)

### `caseId` (`java.lang.String`)

### `correlationKey` (`java.lang.String`)

### `eventType` (`java.lang.String`)

### `occurredAt` (`java.time.Instant`)

### `severity` (`java.lang.String`)

### `tactic` (`java.lang.String`)

### `tenancyId` (`java.lang.String`)

## Constructors

### `public SocIncidentNotification(java.lang.String eventType, java.lang.String tenancyId, java.lang.String caseId, java.lang.String severity, java.lang.String tactic, java.lang.String correlationKey, java.lang.String actorId, java.lang.String assignedAnalystId, java.time.Instant occurredAt)`

#### Parameters

- `eventType` (`java.lang.String`)
- `tenancyId` (`java.lang.String`)
- `caseId` (`java.lang.String`)
- `severity` (`java.lang.String`)
- `tactic` (`java.lang.String`)
- `correlationKey` (`java.lang.String`)
- `actorId` (`java.lang.String`)
- `assignedAnalystId` (`java.lang.String`)
- `occurredAt` (`java.time.Instant`)

## Methods

### `public java.lang.String actorId()`

### `public java.lang.String assignedAnalystId()`

### `public java.lang.String caseId()`

### `public java.lang.String correlationKey()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public java.lang.String eventType()`

### `public final int hashCode()`

### `public java.time.Instant occurredAt()`

### `public java.lang.String severity()`

### `public java.lang.String tactic()`

### `public java.lang.String tenancyId()`

### `public final java.lang.String toString()`

### `public java.lang.String type()`
