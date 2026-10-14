# io.casehub.soc.engine.spi.ContainmentResult

**Package:** `io.casehub.soc.engine.spi`

**Kind:** `record`

## Fields

### `details` (`java.lang.String`)

### `errorReason` (`java.lang.String`)

### `retryable` (`boolean`)

### `success` (`boolean`)

### `timestamp` (`java.time.Instant`)

## Record Components

### `details` (`java.lang.String`)

### `errorReason` (`java.lang.String`)

### `retryable` (`boolean`)

### `success` (`boolean`)

### `timestamp` (`java.time.Instant`)

## Constructors

### `public ContainmentResult(boolean success, java.time.Instant timestamp, java.lang.String details, java.lang.String errorReason, boolean retryable)`

#### Parameters

- `success` (`boolean`)
- `timestamp` (`java.time.Instant`)
- `details` (`java.lang.String`)
- `errorReason` (`java.lang.String`)
- `retryable` (`boolean`)

## Methods

### `public java.lang.String details()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public java.lang.String errorReason()`

### `public static io.casehub.soc.engine.spi.ContainmentResult failure(java.lang.String errorReason, boolean retryable)`

#### Parameters

- `errorReason` (`java.lang.String`)
- `retryable` (`boolean`)

### `public final int hashCode()`

### `public boolean retryable()`

### `public boolean success()`

### `public static io.casehub.soc.engine.spi.ContainmentResult success(java.lang.String details, java.time.Instant timestamp)`

#### Parameters

- `details` (`java.lang.String`)
- `timestamp` (`java.time.Instant`)

### `public java.time.Instant timestamp()`

### `public final java.lang.String toString()`
