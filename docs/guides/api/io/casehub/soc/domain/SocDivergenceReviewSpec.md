# io.casehub.soc.domain.SocDivergenceReviewSpec

**Package:** `io.casehub.soc.domain`

**Kind:** `record`

## Fields

### `REVIEW_TYPE` (`NodeType`)

### `faultMessage` (`java.lang.String`)

### `faultType` (`java.lang.String`)

### `faultedNodeId` (`NodeId`)

## Record Components

### `faultMessage` (`java.lang.String`)

### `faultType` (`java.lang.String`)

### `faultedNodeId` (`NodeId`)

## Constructors

### `public SocDivergenceReviewSpec(NodeId faultedNodeId, java.lang.String faultType, java.lang.String faultMessage)`

#### Parameters

- `faultedNodeId` (`NodeId`)
- `faultType` (`java.lang.String`)
- `faultMessage` (`java.lang.String`)

## Methods

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public java.lang.String faultMessage()`

### `public java.lang.String faultType()`

### `public NodeId faultedNodeId()`

### `public static io.casehub.soc.domain.SocDivergenceReviewSpec fromFaultEvent(FaultEvent event, DesiredStateGraph current)`

#### Parameters

- `event` (`FaultEvent`)
- `current` (`DesiredStateGraph`)

### `public final int hashCode()`

### `public HumanGating humanGating()`

### `public NodeType nodeType()`

### `public final java.lang.String toString()`
