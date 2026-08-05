# io.casehub.soc.domain.AlertSeverity

**Package:** `io.casehub.soc.domain`

**Kind:** `enum`

Five-level severity scale aligned with NIST CVSS and CISA alert classifications.
Maps directly to incident priority for SLA enforcement.

## Enum Constants

### `CRITICAL` (`io.casehub.soc.domain.AlertSeverity`)

### `HIGH` (`io.casehub.soc.domain.AlertSeverity`)

### `INFORMATIONAL` (`io.casehub.soc.domain.AlertSeverity`)

### `LOW` (`io.casehub.soc.domain.AlertSeverity`)

### `MEDIUM` (`io.casehub.soc.domain.AlertSeverity`)

## Constructors

### `private AlertSeverity()`

## Methods

### `public boolean isActionable()`

### `public static io.casehub.soc.domain.AlertSeverity valueOf(java.lang.String name)`

#### Parameters

- `name` (`java.lang.String`)

### `public static io.casehub.soc.domain.AlertSeverity[] values()`
