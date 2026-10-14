# io.casehub.soc.engine.spi.ContainmentRequest

**Package:** `io.casehub.soc.engine.spi`

**Kind:** `record`

## Fields

### `actionType` (`java.lang.String`)

### `approver` (`java.lang.String`)

### `caseId` (`java.lang.String`)

### `incidentId` (`java.lang.String`)

### `parameters` (`java.util.Map<java.lang.String,java.lang.Object>`)

### `tenancyId` (`java.lang.String`)

### `timeoutMs` (`long`)

## Record Components

### `actionType` (`java.lang.String`)

### `approver` (`java.lang.String`)

### `caseId` (`java.lang.String`)

### `incidentId` (`java.lang.String`)

### `parameters` (`java.util.Map<java.lang.String,java.lang.Object>`)

### `tenancyId` (`java.lang.String`)

### `timeoutMs` (`long`)

## Constructors

### `public ContainmentRequest(java.lang.String actionType, java.util.Map<java.lang.String,java.lang.Object> parameters, java.lang.String caseId, java.lang.String incidentId, java.lang.String approver, java.lang.String tenancyId, long timeoutMs)`

#### Parameters

- `actionType` (`java.lang.String`)
- `parameters` (`java.util.Map<java.lang.String,java.lang.Object>`)
- `caseId` (`java.lang.String`)
- `incidentId` (`java.lang.String`)
- `approver` (`java.lang.String`)
- `tenancyId` (`java.lang.String`)
- `timeoutMs` (`long`)

## Methods

### `public java.lang.String actionType()`

### `public java.lang.String approver()`

### `public java.lang.String caseId()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public static io.casehub.soc.engine.spi.ContainmentRequest from(java.lang.String actionType, java.util.Map<java.lang.String,java.lang.Object> parameters, io.casehub.soc.engine.spi.ContainmentContext context)`

#### Parameters

- `actionType` (`java.lang.String`)
- `parameters` (`java.util.Map<java.lang.String,java.lang.Object>`)
- `context` (`io.casehub.soc.engine.spi.ContainmentContext`)

### `public final int hashCode()`

### `public java.lang.String incidentId()`

### `public java.util.Map<java.lang.String,java.lang.Object> parameters()`

### `public java.lang.String tenancyId()`

### `public long timeoutMs()`

### `public final java.lang.String toString()`
