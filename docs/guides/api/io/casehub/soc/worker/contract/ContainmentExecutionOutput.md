# io.casehub.soc.worker.contract.ContainmentExecutionOutput

**Package:** `io.casehub.soc.worker.contract`

**Kind:** `record`

## Fields

### `actionType` (`java.lang.String`)

### `details` (`java.lang.String`)

### `detectionToContainmentMs` (`long`)

### `errorReason` (`java.lang.String`)

### `executed` (`boolean`)

### `executionTimestamp` (`java.time.Instant`)

### `success` (`boolean`)

## Record Components

### `actionType` (`java.lang.String`)

### `details` (`java.lang.String`)

### `detectionToContainmentMs` (`long`)

### `errorReason` (`java.lang.String`)

### `executed` (`boolean`)

### `executionTimestamp` (`java.time.Instant`)

### `success` (`boolean`)

## Constructors

### `public ContainmentExecutionOutput(java.lang.String actionType, boolean executed, boolean success, java.lang.String details, java.lang.String errorReason, java.time.Instant executionTimestamp, long detectionToContainmentMs)`

#### Parameters

- `actionType` (`java.lang.String`)
- `executed` (`boolean`)
- `success` (`boolean`)
- `details` (`java.lang.String`)
- `errorReason` (`java.lang.String`)
- `executionTimestamp` (`java.time.Instant`)
- `detectionToContainmentMs` (`long`)

## Methods

### `public java.lang.String actionType()`

### `public java.lang.String details()`

### `public long detectionToContainmentMs()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public java.lang.String errorReason()`

### `public boolean executed()`

### `public java.time.Instant executionTimestamp()`

### `public final int hashCode()`

### `public boolean success()`

### `public final java.lang.String toString()`
