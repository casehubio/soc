# io.casehub.soc.domain.AttackTactic

**Package:** `io.casehub.soc.domain`

**Kind:** `enum`

MITRE ATT&CK Enterprise tactics — the 14 categories of adversary behaviour.
Used for capability tagging, trust dimension scoping, and kill chain tracking.

## Fields

### `displayName` (`java.lang.String`)

### `mitreId` (`java.lang.String`)

## Enum Constants

### `COLLECTION` (`io.casehub.soc.domain.AttackTactic`)

### `COMMAND_AND_CONTROL` (`io.casehub.soc.domain.AttackTactic`)

### `CREDENTIAL_ACCESS` (`io.casehub.soc.domain.AttackTactic`)

### `DEFENSE_EVASION` (`io.casehub.soc.domain.AttackTactic`)

### `DISCOVERY` (`io.casehub.soc.domain.AttackTactic`)

### `EXECUTION` (`io.casehub.soc.domain.AttackTactic`)

### `EXFILTRATION` (`io.casehub.soc.domain.AttackTactic`)

### `IMPACT` (`io.casehub.soc.domain.AttackTactic`)

### `INITIAL_ACCESS` (`io.casehub.soc.domain.AttackTactic`)

### `LATERAL_MOVEMENT` (`io.casehub.soc.domain.AttackTactic`)

### `PERSISTENCE` (`io.casehub.soc.domain.AttackTactic`)

### `PRIVILEGE_ESCALATION` (`io.casehub.soc.domain.AttackTactic`)

### `RECONNAISSANCE` (`io.casehub.soc.domain.AttackTactic`)

### `RESOURCE_DEVELOPMENT` (`io.casehub.soc.domain.AttackTactic`)

## Constructors

### `private AttackTactic(java.lang.String mitreId, java.lang.String displayName)`

#### Parameters

- `mitreId` (`java.lang.String`)
- `displayName` (`java.lang.String`)

## Methods

### `public java.lang.String displayName()`

### `public java.lang.String mitreId()`

### `public static io.casehub.soc.domain.AttackTactic valueOf(java.lang.String name)`

#### Parameters

- `name` (`java.lang.String`)

### `public static io.casehub.soc.domain.AttackTactic[] values()`
