# io.casehub.soc.domain.PriorityStats

**Package:** `io.casehub.soc.domain`

**Kind:** `record`

## Fields

### `avgTimeToContainment` (`java.time.Duration`)

### `avgTimeToResolution` (`java.time.Duration`)

### `avgTimeToTriage` (`java.time.Duration`)

### `count` (`int`)

### `slaCompliancePercent` (`double`)

## Record Components

### `avgTimeToContainment` (`java.time.Duration`)

### `avgTimeToResolution` (`java.time.Duration`)

### `avgTimeToTriage` (`java.time.Duration`)

### `count` (`int`)

### `slaCompliancePercent` (`double`)

## Constructors

### `public PriorityStats(int count, java.time.Duration avgTimeToTriage, java.time.Duration avgTimeToContainment, java.time.Duration avgTimeToResolution, double slaCompliancePercent)`

#### Parameters

- `count` (`int`)
- `avgTimeToTriage` (`java.time.Duration`)
- `avgTimeToContainment` (`java.time.Duration`)
- `avgTimeToResolution` (`java.time.Duration`)
- `slaCompliancePercent` (`double`)

## Methods

### `public java.time.Duration avgTimeToContainment()`

### `public java.time.Duration avgTimeToResolution()`

### `public java.time.Duration avgTimeToTriage()`

### `public int count()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public final int hashCode()`

### `public double slaCompliancePercent()`

### `public final java.lang.String toString()`
