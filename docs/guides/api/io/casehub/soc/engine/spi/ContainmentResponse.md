# io.casehub.soc.engine.spi.ContainmentResponse

**Package:** `io.casehub.soc.engine.spi`

**Kind:** `record`

## Fields

### `details` (`java.lang.String`)

### `errorReason` (`java.lang.String`)

### `metadata` (`java.util.Map<java.lang.String,java.lang.Object>`)

### `retryable` (`boolean`)

### `success` (`boolean`)

## Record Components

### `details` (`java.lang.String`)

### `errorReason` (`java.lang.String`)

### `metadata` (`java.util.Map<java.lang.String,java.lang.Object>`)

### `retryable` (`boolean`)

### `success` (`boolean`)

## Constructors

### `public ContainmentResponse(boolean success, java.lang.String details, java.lang.String errorReason, boolean retryable, java.util.Map<java.lang.String,java.lang.Object> metadata)`

#### Parameters

- `success` (`boolean`)
- `details` (`java.lang.String`)
- `errorReason` (`java.lang.String`)
- `retryable` (`boolean`)
- `metadata` (`java.util.Map<java.lang.String,java.lang.Object>`)

## Methods

### `public java.lang.String details()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public java.lang.String errorReason()`

### `public final int hashCode()`

### `public java.util.Map<java.lang.String,java.lang.Object> metadata()`

### `public boolean retryable()`

### `public boolean success()`

### `public io.casehub.soc.engine.spi.ContainmentResult toResult()`

### `public final java.lang.String toString()`
