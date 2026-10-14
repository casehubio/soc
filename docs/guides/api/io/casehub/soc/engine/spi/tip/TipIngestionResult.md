# io.casehub.soc.engine.spi.tip.TipIngestionResult

**Package:** `io.casehub.soc.engine.spi.tip`

**Kind:** `record`

## Fields

### `chunksIngested` (`int`)

### `errors` (`java.util.List<java.lang.String>`)

### `feedId` (`java.lang.String`)

### `mindMapNodesLinked` (`int`)

## Record Components

### `chunksIngested` (`int`)

### `errors` (`java.util.List<java.lang.String>`)

### `feedId` (`java.lang.String`)

### `mindMapNodesLinked` (`int`)

## Constructors

### `public TipIngestionResult(java.lang.String feedId, int chunksIngested, int mindMapNodesLinked, java.util.List<java.lang.String> errors)`

#### Parameters

- `feedId` (`java.lang.String`)
- `chunksIngested` (`int`)
- `mindMapNodesLinked` (`int`)
- `errors` (`java.util.List<java.lang.String>`)

## Methods

### `public int chunksIngested()`

### `public final boolean equals(java.lang.Object o)`

#### Parameters

- `o` (`java.lang.Object`)

### `public java.util.List<java.lang.String> errors()`

### `public static io.casehub.soc.engine.spi.tip.TipIngestionResult failure(java.lang.String feedId, java.util.List<java.lang.String> errors)`

#### Parameters

- `feedId` (`java.lang.String`)
- `errors` (`java.util.List<java.lang.String>`)

### `public java.lang.String feedId()`

### `public final int hashCode()`

### `public int mindMapNodesLinked()`

### `public boolean succeeded()`

### `public static io.casehub.soc.engine.spi.tip.TipIngestionResult success(java.lang.String feedId, int chunksIngested, int mindMapNodesLinked)`

#### Parameters

- `feedId` (`java.lang.String`)
- `chunksIngested` (`int`)
- `mindMapNodesLinked` (`int`)

### `public final java.lang.String toString()`
