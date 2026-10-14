# io.casehub.soc.domain.DoraResponseTimeReport

**Package:** `io.casehub.soc.domain`

**Kind:** `record`

## Fields

### `byPriority` (`java.util.Map<java.lang.String,io.casehub.soc.domain.PriorityStats>`)

### `reportPeriodEnd` (`java.time.Instant`)

### `reportPeriodStart` (`java.time.Instant`)

### `totalIncidents` (`int`)

## Record Components

### `byPriority` (`java.util.Map<java.lang.String,io.casehub.soc.domain.PriorityStats>`)

### `reportPeriodEnd` (`java.time.Instant`)

### `reportPeriodStart` (`java.time.Instant`)

### `totalIncidents` (`int`)

## Constructors

### `public DoraResponseTimeReport(java.time.Instant reportPeriodStart, java.time.Instant reportPeriodEnd, int totalIncidents, java.util.Map<java.lang.String,io.casehub.soc.domain.PriorityStats> byPriority)`

#### Parameters

- `reportPeriodStart` (`java.time.Instant`)
- `reportPeriodEnd` (`java.time.Instant`)
- `totalIncidents` (`int`)
- `byPriority` (`java.util.Map<java.lang.String,io.casehub.soc.domain.PriorityStats>`)

## Methods

### `public java.util.Map<java.lang.String,io.casehub.soc.domain.PriorityStats> byPriority()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public final int hashCode()`

### `public java.time.Instant reportPeriodEnd()`

### `public java.time.Instant reportPeriodStart()`

### `public final java.lang.String toString()`

### `public int totalIncidents()`
