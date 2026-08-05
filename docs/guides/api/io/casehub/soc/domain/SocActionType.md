# io.casehub.soc.domain.SocActionType

**Package:** `io.casehub.soc.domain`

**Kind:** `enum`

Typed taxonomy of consequential SOC actions that workers may declare as `PlannedAction`
before the engine advances the case. Each constant encodes its gate policy,
reversibility, candidate approver groups, and reason string.

<p>Follows casehub-aml's `AmlActionType` pattern: classification logic lives in the
`ActionRiskClassifier` implementation; this enum owns only the data.

## Fields

### `OVERSIGHT_SCOPE` (`java.lang.String`)

### `candidateGroups` (`CandidateSetStrategy`)

### `gatePolicy` (`io.casehub.soc.domain.SocActionType.GatePolicy`)

### `reason` (`java.lang.String`)

### `reversible` (`boolean`)

## Enum Constants

### `BLOCK_DOMAIN` (`io.casehub.soc.domain.SocActionType`)

### `BLOCK_IP` (`io.casehub.soc.domain.SocActionType`)

### `DISABLE_USER_ACCOUNT` (`io.casehub.soc.domain.SocActionType`)

### `ENABLE_ENHANCED_LOGGING` (`io.casehub.soc.domain.SocActionType`)

### `ISOLATE_HOST` (`io.casehub.soc.domain.SocActionType`)

### `NETWORK_SEGMENTATION` (`io.casehub.soc.domain.SocActionType`)

### `REVOKE_CREDENTIALS` (`io.casehub.soc.domain.SocActionType`)

### `ROTATE_API_KEY` (`io.casehub.soc.domain.SocActionType`)

### `WIPE_ENDPOINT` (`io.casehub.soc.domain.SocActionType`)

## Constructors

### `private SocActionType(io.casehub.soc.domain.SocActionType.GatePolicy gatePolicy, boolean reversible, CandidateSetStrategy candidateGroups, java.lang.String reason)`

#### Parameters

- `gatePolicy` (`io.casehub.soc.domain.SocActionType.GatePolicy`)
- `reversible` (`boolean`)
- `candidateGroups` (`CandidateSetStrategy`)
- `reason` (`java.lang.String`)

## Methods

### `public java.lang.String actionType()`

### `public CandidateSetStrategy candidateGroups()`

### `public static java.util.Optional<io.casehub.soc.domain.SocActionType> fromActionType(java.lang.String actionType)`

#### Parameters

- `actionType` (`java.lang.String`)

### `public io.casehub.soc.domain.SocActionType.GatePolicy gatePolicy()`

### `public java.lang.String reason()`

### `public boolean reversible()`

### `public java.lang.String scope()`

### `public static io.casehub.soc.domain.SocActionType valueOf(java.lang.String name)`

#### Parameters

- `name` (`java.lang.String`)

### `public static io.casehub.soc.domain.SocActionType[] values()`
