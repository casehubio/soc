# io.casehub.soc.engine.spi.tip.TipFeedConfig

**Package:** `io.casehub.soc.engine.spi.tip`

**Kind:** `record`

## Fields

### `corpusName` (`java.lang.String`)

### `credentials` (`java.util.Map<java.lang.String,java.lang.String>`)

### `endpointUrl` (`java.lang.String`)

### `feedId` (`java.lang.String`)

### `linkToMindMap` (`boolean`)

### `pollInterval` (`java.time.Duration`)

### `providerName` (`java.lang.String`)

## Record Components

### `corpusName` (`java.lang.String`)

### `credentials` (`java.util.Map<java.lang.String,java.lang.String>`)

### `endpointUrl` (`java.lang.String`)

### `feedId` (`java.lang.String`)

### `linkToMindMap` (`boolean`)

### `pollInterval` (`java.time.Duration`)

### `providerName` (`java.lang.String`)

## Constructors

### `public TipFeedConfig(java.lang.String feedId, java.lang.String providerName, java.lang.String corpusName, java.time.Duration pollInterval, java.util.Map<java.lang.String,java.lang.String> credentials, java.lang.String endpointUrl, boolean linkToMindMap)`

#### Parameters

- `feedId` (`java.lang.String`)
- `providerName` (`java.lang.String`)
- `corpusName` (`java.lang.String`)
- `pollInterval` (`java.time.Duration`)
- `credentials` (`java.util.Map<java.lang.String,java.lang.String>`)
- `endpointUrl` (`java.lang.String`)
- `linkToMindMap` (`boolean`)

## Methods

### `public static io.casehub.soc.engine.spi.tip.TipFeedConfig.Builder builder()`

### `public java.lang.String corpusName()`

### `public java.util.Map<java.lang.String,java.lang.String> credentials()`

### `public java.lang.String endpointUrl()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public java.lang.String feedId()`

### `public final int hashCode()`

### `public boolean linkToMindMap()`

### `public java.time.Duration pollInterval()`

### `public java.lang.String providerName()`

### `public final java.lang.String toString()`
