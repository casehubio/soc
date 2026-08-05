# io.casehub.soc.domain.Ioc

**Package:** `io.casehub.soc.domain`

**Kind:** `record`

An Indicator of Compromise — an observable artefact associated with malicious activity.

<p>Equality is by `(type, value)` — two IOCs with the same type and value
are the same indicator regardless of when or where they were observed.

## Fields

### `confidence` (`double`)

### `firstSeen` (`java.time.Instant`)

### `source` (`java.lang.String`)

### `tags` (`java.util.Set<java.lang.String>`)

### `type` (`io.casehub.soc.domain.IocType`)

### `value` (`java.lang.String`)

## Record Components

### `confidence` (`double`)

### `firstSeen` (`java.time.Instant`)

### `source` (`java.lang.String`)

### `tags` (`java.util.Set<java.lang.String>`)

### `type` (`io.casehub.soc.domain.IocType`)

### `value` (`java.lang.String`)

## Constructors

### `public Ioc(io.casehub.soc.domain.IocType type, java.lang.String value, double confidence, java.time.Instant firstSeen, java.lang.String source, java.util.Set<java.lang.String> tags)`

#### Parameters

- `type` (`io.casehub.soc.domain.IocType`)
- `value` (`java.lang.String`)
- `confidence` (`double`)
- `firstSeen` (`java.time.Instant`)
- `source` (`java.lang.String`)
- `tags` (`java.util.Set<java.lang.String>`)

## Methods

### `public double confidence()`

### `public boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public java.time.Instant firstSeen()`

### `public int hashCode()`

### `public java.lang.String source()`

### `public java.util.Set<java.lang.String> tags()`

### `public final java.lang.String toString()`

### `public io.casehub.soc.domain.IocType type()`

### `public java.lang.String value()`
