# io.casehub.soc.domain.AttackTechnique

**Package:** `io.casehub.soc.domain`

**Kind:** `record`

A MITRE ATT&CK technique identifier with tactic association.

<p>Technique IDs follow MITRE's naming: T followed by 4 digits (e.g. T1566),
with optional sub-technique suffix (e.g. T1566.001).

## Fields

### `name` (`java.lang.String`)

### `subtechniqueOf` (`java.lang.String`)

### `tactic` (`io.casehub.soc.domain.AttackTactic`)

### `techniqueId` (`java.lang.String`)

## Record Components

### `name` (`java.lang.String`)

### `subtechniqueOf` (`java.lang.String`)

### `tactic` (`io.casehub.soc.domain.AttackTactic`)

### `techniqueId` (`java.lang.String`)

## Constructors

### `public AttackTechnique(java.lang.String techniqueId, java.lang.String name, io.casehub.soc.domain.AttackTactic tactic, java.lang.String subtechniqueOf)`

#### Parameters

- `techniqueId` (`java.lang.String`)
- `name` (`java.lang.String`)
- `tactic` (`io.casehub.soc.domain.AttackTactic`)
- `subtechniqueOf` (`java.lang.String`)

## Methods

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public final int hashCode()`

### `public boolean isSubtechnique()`

### `public java.lang.String name()`

### `public java.util.Optional<java.lang.String> parentTechnique()`

### `public java.lang.String subtechniqueOf()`

### `public io.casehub.soc.domain.AttackTactic tactic()`

### `public java.lang.String techniqueId()`

### `public final java.lang.String toString()`
