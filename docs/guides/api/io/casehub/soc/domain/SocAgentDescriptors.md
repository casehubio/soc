# io.casehub.soc.domain.SocAgentDescriptors

**Package:** `io.casehub.soc.domain`

**Kind:** `class`

## Fields

### `ALL_TACTICS_09` (`java.util.Map<java.lang.String,java.lang.Double>`)

### `PROVIDER` (`java.lang.String`)

### `SLOT` (`java.lang.String`)

### `TENANCY` (`java.lang.String`)

### `VERSION` (`java.lang.String`)

## Constructors

### `private SocAgentDescriptors()`

## Methods

### `public static java.util.List<AgentDescriptor> all()`

### `public static java.util.Map<java.lang.String,AgentDescriptor> descriptorsByWorkerName()`

### `public static AgentDescriptor llmAttckMapping()`

### `public static AgentDescriptor llmContainmentRecommendation()`

### `private static AgentDescriptor llmDescriptor(java.lang.String agentId, java.lang.String name, java.lang.String capabilityName, double qualityHint)`

#### Parameters

- `agentId` (`java.lang.String`)
- `name` (`java.lang.String`)
- `capabilityName` (`java.lang.String`)
- `qualityHint` (`double`)

### `public static AgentDescriptor llmIocEnrichment()`

### `public static AgentDescriptor ruleAttckMapping()`

### `public static AgentDescriptor ruleContainmentRecommendation()`

### `private static AgentDescriptor ruleDescriptor(java.lang.String agentId, java.lang.String name, java.lang.String capabilityName, double qualityHint, java.util.Map<java.lang.String,java.lang.Double> epistemicDomains)`

#### Parameters

- `agentId` (`java.lang.String`)
- `name` (`java.lang.String`)
- `capabilityName` (`java.lang.String`)
- `qualityHint` (`double`)
- `epistemicDomains` (`java.util.Map<java.lang.String,java.lang.Double>`)

### `public static AgentDescriptor ruleIocEnrichment()`
