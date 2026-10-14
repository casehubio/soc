# io.casehub.soc.worker.contract.RecoveryVerificationResultOutput

**Package:** `io.casehub.soc.worker.contract`

**Kind:** `record`

## Fields

### `completedAt` (`java.time.Instant`)

### `divergedNodes` (`java.util.List<java.lang.String>`)

### `executionToVerificationMs` (`long`)

### `status` (`java.lang.String`)

### `verifiedNodes` (`java.util.List<java.lang.String>`)

## Record Components

### `completedAt` (`java.time.Instant`)

### `divergedNodes` (`java.util.List<java.lang.String>`)

### `executionToVerificationMs` (`long`)

### `status` (`java.lang.String`)

### `verifiedNodes` (`java.util.List<java.lang.String>`)

## Constructors

### `public RecoveryVerificationResultOutput(java.lang.String status, java.util.List<java.lang.String> verifiedNodes, java.util.List<java.lang.String> divergedNodes, java.time.Instant completedAt, long executionToVerificationMs)`

#### Parameters

- `status` (`java.lang.String`)
- `verifiedNodes` (`java.util.List<java.lang.String>`)
- `divergedNodes` (`java.util.List<java.lang.String>`)
- `completedAt` (`java.time.Instant`)
- `executionToVerificationMs` (`long`)

## Methods

### `public java.time.Instant completedAt()`

### `public java.util.List<java.lang.String> divergedNodes()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public long executionToVerificationMs()`

### `public final int hashCode()`

### `public java.lang.String status()`

### `public final java.lang.String toString()`

### `public java.util.List<java.lang.String> verifiedNodes()`
